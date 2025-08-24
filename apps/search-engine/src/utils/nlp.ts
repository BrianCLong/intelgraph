import * as natural from 'natural';
import * as stopword from 'stopword';
import compromise from 'compromise';

export { natural, stopword };

export class NLPProcessor {
  private tokenizer: natural.WordTokenizer;
  private stemmer: any;
  private sentimentAnalyzer: natural.SentimentAnalyzer;
  private classifier: natural.LogisticRegressionClassifier;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    this.classifier = new natural.LogisticRegressionClassifier();
    this.initializeClassifier();
  }

  private initializeClassifier(): void {
    const trainingData = [
      { text: 'threat malware attack vulnerability', label: 'security' },
      { text: 'person individual human people', label: 'entity' },
      { text: 'location address place geography', label: 'geographic' },
      { text: 'document file report paper', label: 'document' },
      { text: 'event incident occurrence happening', label: 'temporal' },
      { text: 'organization company business enterprise', label: 'organization' }
    ];

    trainingData.forEach(item => {
      this.classifier.addDocument(item.text, item.label);
    });

    this.classifier.train();
  }

  tokenize(text: string): string[] {
    return this.tokenizer.tokenize(text.toLowerCase()) || [];
  }

  removeStopwords(tokens: string[], language: string = 'en'): string[] {
    return stopword.removeStopwords(tokens, stopword[language as keyof typeof stopword] || stopword.en);
  }

  stem(tokens: string[]): string[] {
    return tokens.map(token => this.stemmer.stem(token));
  }

  extractEntities(text: string): {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
    misc: string[];
  } {
    const doc = compromise(text);
    
    return {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      dates: doc.dates().out('array'),
      misc: doc.topics().out('array')
    };
  }

  extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
    const tokens = this.tokenize(text);
    const cleanTokens = this.removeStopwords(tokens);
    
    const nGrams = this.generateNGrams(cleanTokens, 2, 3);
    const phraseFrequency = this.calculatePhraseFrequency(nGrams);
    
    return Object.entries(phraseFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxPhrases)
      .map(([phrase]) => phrase);
  }

  private generateNGrams(tokens: string[], minN: number, maxN: number): string[] {
    const nGrams: string[] = [];
    
    for (let n = minN; n <= maxN; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        const nGram = tokens.slice(i, i + n).join(' ');
        nGrams.push(nGram);
      }
    }
    
    return nGrams;
  }

  private calculatePhraseFrequency(phrases: string[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    
    phrases.forEach(phrase => {
      frequency[phrase] = (frequency[phrase] || 0) + 1;
    });
    
    return frequency;
  }

  analyzeSentiment(text: string): {
    score: number;
    comparative: number;
    classification: 'positive' | 'negative' | 'neutral';
  } {
    const tokens = this.tokenize(text);
    const cleanTokens = this.removeStopwords(tokens);
    const score = this.sentimentAnalyzer.getSentiment(cleanTokens);
    
    let classification: 'positive' | 'negative' | 'neutral';
    if (score > 0.1) {
      classification = 'positive';
    } else if (score < -0.1) {
      classification = 'negative';
    } else {
      classification = 'neutral';
    }
    
    return {
      score,
      comparative: score / cleanTokens.length,
      classification
    };
  }

  classifyIntent(text: string): string {
    const features = this.extractFeatures(text);
    return this.classifier.classify(features.join(' '));
  }

  private extractFeatures(text: string): string[] {
    const tokens = this.tokenize(text);
    const cleanTokens = this.removeStopwords(tokens);
    const stemmedTokens = this.stem(cleanTokens);
    
    return stemmedTokens;
  }

  expandAcronyms(text: string): string {
    const acronymMap: Record<string, string> = {
      'IOC': 'Indicator of Compromise',
      'TTPs': 'Tactics Techniques Procedures',
      'APT': 'Advanced Persistent Threat',
      'STIX': 'Structured Threat Information eXpression',
      'TAXII': 'Trusted Automated eXchange of Indicator Information',
      'CVE': 'Common Vulnerabilities and Exposures',
      'CVSS': 'Common Vulnerability Scoring System',
      'MITRE': 'MITRE ATT&CK Framework',
      'TLP': 'Traffic Light Protocol',
      'OSINT': 'Open Source Intelligence',
      'HUMINT': 'Human Intelligence',
      'SIGINT': 'Signals Intelligence',
      'GEOINT': 'Geospatial Intelligence'
    };

    let expandedText = text;
    Object.entries(acronymMap).forEach(([acronym, expansion]) => {
      const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
      expandedText = expandedText.replace(regex, `${acronym} (${expansion})`);
    });

    return expandedText;
  }

  detectLanguage(text: string): string {
    const languages = ['english', 'spanish', 'french', 'german', 'italian', 'portuguese'];
    const scores: Record<string, number> = {};

    languages.forEach(lang => {
      const langStopwords = stopword[lang as keyof typeof stopword] || [];
      const tokens = this.tokenize(text);
      const stopwordCount = tokens.filter(token => langStopwords.includes(token)).length;
      scores[lang] = stopwordCount / tokens.length;
    });

    return Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
  }

  calculateTextSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.removeStopwords(this.tokenize(text1)));
    const tokens2 = new Set(this.removeStopwords(this.tokenize(text2)));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  generateSummary(text: string, maxSentences: number = 3): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= maxSentences) {
      return text;
    }

    const sentenceScores = sentences.map(sentence => {
      const tokens = this.removeStopwords(this.tokenize(sentence));
      const keyPhrases = this.extractKeyPhrases(sentence, 5);
      
      return {
        sentence: sentence.trim(),
        score: tokens.length + keyPhrases.length * 2
      };
    });

    return sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .map(item => item.sentence)
      .join('. ') + '.';
  }

  extractDates(text: string): Array<{
    text: string;
    start: number;
    end: number;
    normalized: string;
  }> {
    const datePatterns = [
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi,
      /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi
    ];

    const dates: Array<{
      text: string;
      start: number;
      end: number;
      normalized: string;
    }> = [];

    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const dateText = match[0];
        const normalized = this.normalizeDate(dateText);
        
        dates.push({
          text: dateText,
          start: match.index,
          end: match.index + dateText.length,
          normalized
        });
      }
    });

    return dates.sort((a, b) => a.start - b.start);
  }

  private normalizeDate(dateText: string): string {
    try {
      const date = new Date(dateText);
      return date.toISOString().split('T')[0];
    } catch {
      return dateText;
    }
  }

  extractNumericValues(text: string): Array<{
    text: string;
    value: number;
    unit?: string;
    start: number;
    end: number;
  }> {
    const numericPattern = /\b(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?\b/g;
    const values: Array<{
      text: string;
      value: number;
      unit?: string;
      start: number;
      end: number;
    }> = [];

    let match;
    while ((match = numericPattern.exec(text)) !== null) {
      const fullText = match[0];
      const value = parseFloat(match[1]);
      const unit = match[2];

      values.push({
        text: fullText,
        value,
        unit,
        start: match.index,
        end: match.index + fullText.length
      });
    }

    return values;
  }
}