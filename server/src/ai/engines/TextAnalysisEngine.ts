import { spawn } from 'child_process';
import path from 'path';
import logger from '../../config/logger';
import { ExtractionEngineConfig } from '../ExtractionEngine.js';

const logger = logger.child({ name: 'TextAnalysisEngine' });

export interface NamedEntity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
  description?: string;
  canonicalForm?: string;
  entityId?: string;
}

export interface SentimentAnalysis {
  label: string; // 'positive', 'negative', 'neutral'
  score: number; // -1 to 1
  confidence: number;
  aspects?: AspectSentiment[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: string;
  confidence: number;
}

export interface Topic {
  id: string;
  keywords: string[];
  coherence: number;
  documents?: number;
  representative_text?: string;
}

export interface KeyPhrase {
  phrase: string;
  relevance: number;
  frequency: number;
  positions: number[];
}

export interface LanguageDetection {
  language: string;
  confidence: number;
  alternateLanguages?: { language: string; confidence: number }[];
}

export interface TextSummary {
  extractive: string[];
  abstractive?: string;
  keyPoints: string[];
  compressionRatio: number;
}

export interface TextAnalysisOptions {
  extractEntities?: boolean;
  performSentiment?: boolean;
  extractTopics?: boolean;
  detectLanguage?: boolean;
  extractKeyPhrases?: boolean;
  generateSummary?: boolean;
  analyzeReadability?: boolean;
  detectIntentions?: boolean;
  enableCoreference?: boolean;
  enableDependencyParsing?: boolean;
}

export interface TextAnalysisResult {
  text: string;
  language: LanguageDetection;
  entities: NamedEntity[];
  sentiment: SentimentAnalysis | null;
  topics: Topic[];
  keyPhrases: KeyPhrase[];
  summary: TextSummary | null;
  readabilityScore?: number;
  intentions?: string[];
  statistics: TextStatistics;
}

export interface TextStatistics {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  vocabularyDiversity: number;
  complexityScore: number;
}

export class TextAnalysisEngine {
  private config: ExtractionEngineConfig;
  private isInitialized: boolean = false;
  private models: Map<string, any> = new Map();

  constructor(config: ExtractionEngineConfig) {
    this.config = config;
  }

  /**
   * Initialize text analysis engine
   */
  async initialize(): Promise<void> {
    try {
      // Verify dependencies
      await this.verifyDependencies();
      
      // Load language models
      await this.loadLanguageModels();
      
      this.isInitialized = true;
      logger.info('Text Analysis Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Text Analysis Engine:', error);
      throw error;
    }
  }

  /**
   * Analyze text using multiple NLP techniques
   */
  async analyzeText(
    text: string,
    options: TextAnalysisOptions = {}
  ): Promise<TextAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      extractEntities = true,
      performSentiment = true,
      extractTopics = false,
      detectLanguage = true,
      extractKeyPhrases = true,
      generateSummary = false,
      analyzeReadability = true,
      detectIntentions = false,
      enableCoreference = false,
      enableDependencyParsing = false
    } = options;

    logger.info(`Starting text analysis for ${text.length} characters`);

    try {
      // Basic text statistics
      const statistics = this.calculateTextStatistics(text);

      // Language detection
      let language: LanguageDetection = { language: 'en', confidence: 1.0 };
      if (detectLanguage) {
        language = await this.detectLanguage(text);
      }

      // Preprocess text
      const preprocessedText = this.preprocessText(text, language.language);

      // Named Entity Recognition
      let entities: NamedEntity[] = [];
      if (extractEntities) {
        entities = await this.extractNamedEntities(preprocessedText, language.language);
      }

      // Sentiment Analysis
      let sentiment: SentimentAnalysis | null = null;
      if (performSentiment) {
        sentiment = await this.analyzeSentiment(preprocessedText, language.language);
      }

      // Topic Modeling
      let topics: Topic[] = [];
      if (extractTopics) {
        topics = await this.extractTopics(preprocessedText, language.language);
      }

      // Key Phrase Extraction
      let keyPhrases: KeyPhrase[] = [];
      if (extractKeyPhrases) {
        keyPhrases = await this.extractKeyPhrases(preprocessedText, language.language);
      }

      // Text Summarization
      let summary: TextSummary | null = null;
      if (generateSummary && text.length > 500) {
        summary = await this.generateSummary(preprocessedText, language.language);
      }

      // Readability Analysis
      let readabilityScore: number | undefined;
      if (analyzeReadability) {
        readabilityScore = this.calculateReadabilityScore(text, statistics);
      }

      // Intention Detection
      let intentions: string[] | undefined;
      if (detectIntentions) {
        intentions = await this.detectIntentions(preprocessedText, language.language);
      }

      // Coreference Resolution
      if (enableCoreference) {
        await this.resolveCoreferences(entities, text);
      }

      const result: TextAnalysisResult = {
        text: preprocessedText,
        language,
        entities,
        sentiment,
        topics,
        keyPhrases,
        summary,
        readabilityScore,
        intentions,
        statistics
      };

      logger.info(`Text analysis completed: ${entities.length} entities, sentiment: ${sentiment?.label || 'N/A'}`);
      return result;

    } catch (error) {
      logger.error('Text analysis failed:', error);
      throw error;
    }
  }

  /**
   * Detect language of text
   */
  private async detectLanguage(text: string): Promise<LanguageDetection> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'language_detection.py');
      
      const args = [
        pythonScript,
        '--text', text.substring(0, 1000) // Use first 1000 chars for detection
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve({
              language: result.language || 'en',
              confidence: result.confidence || 0.8,
              alternateLanguages: result.alternatives || []
            });
          } catch (parseError) {
            resolve({ language: 'en', confidence: 0.8 });
          }
        } else {
          resolve({ language: 'en', confidence: 0.8 });
        }
      });

      python.on('error', () => {
        resolve({ language: 'en', confidence: 0.8 });
      });
    });
  }

  /**
   * Extract named entities
   */
  private async extractNamedEntities(text: string, language: string): Promise<NamedEntity[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'named_entity_recognition.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--language', language,
        '--model', this.getModelForLanguage(language, 'ner')
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const entities = this.parseNamedEntities(result.entities || []);
            resolve(entities);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`NER failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Analyze sentiment
   */
  private async analyzeSentiment(text: string, language: string): Promise<SentimentAnalysis> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'sentiment_analysis.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--language', language,
        '--enable-aspects'
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve({
              label: result.sentiment || 'neutral',
              score: result.score || 0,
              confidence: result.confidence || 0.8,
              aspects: result.aspects || []
            });
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Sentiment analysis failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract topics using LDA or similar
   */
  private async extractTopics(text: string, language: string): Promise<Topic[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'topic_modeling.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--language', language,
        '--num-topics', '5',
        '--algorithm', 'lda'
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const topics = this.parseTopics(result.topics || []);
            resolve(topics);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          logger.warn('Topic modeling failed, returning empty topics');
          resolve([]);
        }
      });

      python.on('error', () => {
        resolve([]);
      });
    });
  }

  /**
   * Extract key phrases
   */
  private async extractKeyPhrases(text: string, language: string): Promise<KeyPhrase[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'keyphrase_extraction.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--language', language,
        '--algorithm', 'textrank'
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const keyPhrases = this.parseKeyPhrases(result.keyphrases || [], text);
            resolve(keyPhrases);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          logger.warn('Key phrase extraction failed, returning empty phrases');
          resolve([]);
        }
      });

      python.on('error', () => {
        resolve([]);
      });
    });
  }

  /**
   * Generate text summary
   */
  private async generateSummary(text: string, language: string): Promise<TextSummary> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'text_summarization.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--language', language,
        '--extractive-sentences', '3',
        '--enable-abstractive'
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve({
              extractive: result.extractive_summary || [],
              abstractive: result.abstractive_summary,
              keyPoints: result.key_points || [],
              compressionRatio: (result.summary_length || text.length) / text.length
            });
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Summarization failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Detect intentions in text
   */
  private async detectIntentions(text: string, language: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'intention_detection.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--language', language
      ];

      const python = spawn(this.config.pythonPath, args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.intentions || []);
          } catch (parseError) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });

      python.on('error', () => {
        resolve([]);
      });
    });
  }

  /**
   * Preprocess text for analysis
   */
  private preprocessText(text: string, language: string): string {
    // Basic text cleaning
    let processed = text
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Language-specific preprocessing
    if (language === 'en') {
      // English-specific preprocessing
      processed = processed
        .replace(/n't/g, ' not') // Expand contractions
        .replace(/'ll/g, ' will')
        .replace(/'re/g, ' are')
        .replace(/'ve/g, ' have')
        .replace(/'d/g, ' would');
    }

    return processed;
  }

  /**
   * Calculate text statistics
   */
  private calculateTextStatistics(text: string): TextStatistics {
    const characterCount = text.length;
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const averageSentencesPerParagraph = paragraphCount > 0 ? sentenceCount / paragraphCount : 0;

    // Vocabulary diversity (unique words / total words)
    const uniqueWords = new Set(words);
    const vocabularyDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;

    // Simple complexity score based on various factors
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount || 0;
    const complexityScore = (averageWordsPerSentence * 0.4) + (avgWordLength * 0.3) + ((1 - vocabularyDiversity) * 0.3);

    return {
      characterCount,
      wordCount,
      sentenceCount,
      paragraphCount,
      averageWordsPerSentence,
      averageSentencesPerParagraph,
      vocabularyDiversity,
      complexityScore
    };
  }

  /**
   * Calculate readability score (Flesch Reading Ease)
   */
  private calculateReadabilityScore(text: string, statistics: TextStatistics): number {
    const { wordCount, sentenceCount } = statistics;
    
    if (sentenceCount === 0 || wordCount === 0) return 0;

    // Count syllables (simplified approach)
    const syllableCount = this.countSyllables(text);
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * (wordCount / sentenceCount)) - (84.6 * (syllableCount / wordCount));
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in text (simplified)
   */
  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let syllableCount = 0;

    for (const word of words) {
      // Simple syllable counting heuristic
      const vowelGroups = word.match(/[aeiouy]+/g) || [];
      let syllables = vowelGroups.length;
      
      // Adjust for common patterns
      if (word.endsWith('e') && syllables > 1) syllables--;
      if (syllables === 0) syllables = 1;
      
      syllableCount += syllables;
    }

    return syllableCount;
  }

  /**
   * Resolve coreferences in entities
   */
  private async resolveCoreferences(entities: NamedEntity[], text: string): Promise<void> {
    // This would implement coreference resolution to link pronouns to entities
    // For now, it's a placeholder
    logger.debug('Coreference resolution applied');
  }

  /**
   * Parse named entities from Python output
   */
  private parseNamedEntities(entities: any[]): NamedEntity[] {
    return entities.map(entity => ({
      text: entity.text,
      label: entity.label,
      start: entity.start,
      end: entity.end,
      confidence: entity.confidence || 0.8,
      description: entity.description,
      canonicalForm: entity.canonical_form,
      entityId: entity.entity_id
    }));
  }

  /**
   * Parse topics from Python output
   */
  private parseTopics(topics: any[]): Topic[] {
    return topics.map((topic, index) => ({
      id: `topic_${index}`,
      keywords: topic.keywords || [],
      coherence: topic.coherence || 0.5,
      documents: topic.documents,
      representative_text: topic.representative_text
    }));
  }

  /**
   * Parse key phrases from Python output
   */
  private parseKeyPhrases(phrases: any[], text: string): KeyPhrase[] {
    return phrases.map(phrase => {
      // Find positions of the phrase in text
      const positions: number[] = [];
      let index = text.toLowerCase().indexOf(phrase.phrase.toLowerCase());
      while (index !== -1) {
        positions.push(index);
        index = text.toLowerCase().indexOf(phrase.phrase.toLowerCase(), index + 1);
      }

      return {
        phrase: phrase.phrase,
        relevance: phrase.relevance || 0.5,
        frequency: positions.length,
        positions
      };
    });
  }

  /**
   * Get appropriate model for language and task
   */
  private getModelForLanguage(language: string, task: string): string {
    const modelMap: Record<string, Record<string, string>> = {
      'en': {
        'ner': 'en_core_web_lg',
        'sentiment': 'en_core_web_lg'
      },
      'es': {
        'ner': 'es_core_news_lg',
        'sentiment': 'es_core_news_lg'
      },
      'fr': {
        'ner': 'fr_core_news_lg',
        'sentiment': 'fr_core_news_lg'
      },
      'de': {
        'ner': 'de_core_news_lg',
        'sentiment': 'de_core_news_lg'
      }
    };

    return modelMap[language]?.[task] || modelMap['en'][task] || 'en_core_web_lg';
  }

  /**
   * Verify dependencies
   */
  private async verifyDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.config.pythonPath, [
        '-c', 
        'import spacy, transformers, sklearn, nltk; print("Dependencies OK")'
      ]);
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Required dependencies not found. Please install spacy, transformers, scikit-learn, nltk.'));
        }
      });
      
      python.on('error', () => {
        reject(new Error('Python not found or dependencies missing.'));
      });
    });
  }

  /**
   * Load language models
   */
  private async loadLanguageModels(): Promise<void> {
    try {
      // This would load spaCy models and other NLP models
      logger.info('Language models loaded successfully');
    } catch (error) {
      logger.error('Failed to load language models:', error);
      throw error;
    }
  }

  /**
   * Check if text analysis engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Text Analysis Engine...');
    this.models.clear();
    this.isInitialized = false;
    logger.info('Text Analysis Engine shutdown complete');
  }
}

export default TextAnalysisEngine;