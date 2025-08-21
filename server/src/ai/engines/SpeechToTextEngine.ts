import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import logger from '../../config/logger';
import { ExtractionEngineConfig } from '../ExtractionEngine.js';

const logger = logger.child({ name: 'SpeechToTextEngine' });

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
  language?: string;
  detectedLanguage?: string;
  audioQuality?: number;
  noiseLevel?: number;
  words?: WordTimestamp[];
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SpeechToTextOptions {
  language?: string;
  model?: string;
  enableDiarization?: boolean;
  enhanceAudio?: boolean;
  timestamping?: boolean;
  maxSpeakers?: number;
  chunkDuration?: number;
  enablePunctuation?: boolean;
  filterProfanity?: boolean;
}

export interface SpeakerInfo {
  speakerId: string;
  segments: TranscriptionSegment[];
  totalDuration: number;
  characterCount: number;
  confidence: number;
}

export class SpeechToTextEngine {
  private config: ExtractionEngineConfig;
  private isInitialized: boolean = false;
  private availableModels: string[] = [];

  constructor(config: ExtractionEngineConfig) {
    this.config = config;
  }

  /**
   * Initialize speech-to-text engine
   */
  async initialize(): Promise<void> {
    try {
      // Verify dependencies
      await this.verifyDependencies();
      
      // Load available models
      await this.loadAvailableModels();
      
      this.isInitialized = true;
      logger.info('Speech-to-Text Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Speech-to-Text Engine:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio file
   */
  async transcribe(
    audioPath: string,
    options: SpeechToTextOptions = {}
  ): Promise<TranscriptionSegment[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      language = 'auto',
      model = 'whisper-base',
      enableDiarization = false,
      enhanceAudio = true,
      timestamping = true,
      maxSpeakers = 5,
      chunkDuration = 30,
      enablePunctuation = true,
      filterProfanity = false
    } = options;

    logger.info(`Starting transcription for: ${audioPath} with model: ${model}`);

    try {
      let processedAudioPath = audioPath;

      // Enhance audio if requested
      if (enhanceAudio) {
        processedAudioPath = await this.enhanceAudio(audioPath);
      }

      // Run transcription
      const segments = await this.runWhisperTranscription(
        processedAudioPath,
        model,
        language,
        timestamping,
        enablePunctuation
      );

      // Apply speaker diarization if requested
      if (enableDiarization && segments.length > 0) {
        await this.applySpeakerDiarization(
          segments,
          processedAudioPath,
          maxSpeakers
        );
      }

      // Analyze audio quality
      await this.analyzeAudioQuality(segments, processedAudioPath);

      // Filter profanity if requested
      if (filterProfanity) {
        this.filterProfanity(segments);
      }

      // Post-process transcription
      this.postProcessTranscription(segments);

      logger.info(`Transcription completed: ${segments.length} segments, ${this.getTotalDuration(segments).toFixed(2)}s`);
      return segments;

    } catch (error) {
      logger.error('Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe video file (extract audio and transcribe)
   */
  async transcribeVideo(
    videoPath: string,
    options: SpeechToTextOptions = {}
  ): Promise<TranscriptionSegment[]> {
    try {
      // Extract audio from video
      const audioPath = await this.extractAudioFromVideo(videoPath);
      
      // Transcribe extracted audio
      return await this.transcribe(audioPath, options);
    } catch (error) {
      logger.error('Video transcription failed:', error);
      throw error;
    }
  }

  /**
   * Get speaker analysis from transcription
   */
  getSpeakerAnalysis(segments: TranscriptionSegment[]): SpeakerInfo[] {
    const speakers = new Map<string, TranscriptionSegment[]>();
    
    // Group segments by speaker
    for (const segment of segments) {
      const speakerId = segment.speaker || 'unknown';
      if (!speakers.has(speakerId)) {
        speakers.set(speakerId, []);
      }
      speakers.get(speakerId)!.push(segment);
    }

    // Calculate speaker statistics
    const speakerInfos: SpeakerInfo[] = [];
    
    for (const [speakerId, speakerSegments] of speakers.entries()) {
      const totalDuration = speakerSegments.reduce(
        (sum, seg) => sum + (seg.endTime - seg.startTime),
        0
      );
      
      const characterCount = speakerSegments.reduce(
        (sum, seg) => sum + seg.text.length,
        0
      );
      
      const avgConfidence = speakerSegments.reduce(
        (sum, seg) => sum + seg.confidence,
        0
      ) / speakerSegments.length;

      speakerInfos.push({
        speakerId,
        segments: speakerSegments,
        totalDuration,
        characterCount,
        confidence: avgConfidence
      });
    }

    return speakerInfos.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * Run Whisper transcription
   */
  private async runWhisperTranscription(
    audioPath: string,
    model: string,
    language: string,
    timestamping: boolean,
    enablePunctuation: boolean
  ): Promise<TranscriptionSegment[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'whisper_transcription.py');
      
      const args = [
        pythonScript,
        '--audio', audioPath,
        '--model', model,
        '--output-format', 'json'
      ];

      if (language !== 'auto') {
        args.push('--language', language);
      }

      if (timestamping) {
        args.push('--word-timestamps');
      }

      if (enablePunctuation) {
        args.push('--enable-punctuation');
      }

      if (this.config.enableGPU) {
        args.push('--device', 'cuda');
      }

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
        if (code !== 0) {
          reject(new Error(`Whisper transcription failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          const segments = this.parseWhisperOutput(result);
          resolve(segments);
        } catch (parseError) {
          reject(parseError);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Whisper: ${error.message}`));
      });
    });
  }

  /**
   * Parse Whisper output into transcription segments
   */
  private parseWhisperOutput(whisperResult: any): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = [];

    for (const segment of whisperResult.segments || []) {
      const words: WordTimestamp[] = [];
      
      if (segment.words) {
        for (const word of segment.words) {
          words.push({
            word: word.word,
            startTime: word.start,
            endTime: word.end,
            confidence: word.confidence || 0.8
          });
        }
      }

      segments.push({
        text: segment.text.trim(),
        startTime: segment.start,
        endTime: segment.end,
        confidence: segment.confidence || 0.8,
        detectedLanguage: whisperResult.language || 'unknown',
        words
      });
    }

    return segments;
  }

  /**
   * Apply speaker diarization using pyannote-audio
   */
  private async applySpeakerDiarization(
    segments: TranscriptionSegment[],
    audioPath: string,
    maxSpeakers: number
  ): Promise<void> {
    try {
      const diarizationResult = await this.runSpeakerDiarization(audioPath, maxSpeakers);
      
      // Assign speakers to segments based on temporal overlap
      for (const segment of segments) {
        const segmentMidpoint = (segment.startTime + segment.endTime) / 2;
        
        // Find the speaker segment that contains this transcription segment
        for (const speakerSegment of diarizationResult) {
          if (segmentMidpoint >= speakerSegment.start && segmentMidpoint <= speakerSegment.end) {
            segment.speaker = speakerSegment.speaker;
            break;
          }
        }
        
        // If no speaker found, assign based on closest temporal overlap
        if (!segment.speaker) {
          let bestOverlap = 0;
          let bestSpeaker = 'unknown';
          
          for (const speakerSegment of diarizationResult) {
            const overlap = this.calculateTemporalOverlap(
              { startTime: segment.startTime, endTime: segment.endTime },
              { startTime: speakerSegment.start, endTime: speakerSegment.end }
            );
            
            if (overlap > bestOverlap) {
              bestOverlap = overlap;
              bestSpeaker = speakerSegment.speaker;
            }
          }
          
          segment.speaker = bestSpeaker;
        }
      }
    } catch (error) {
      logger.warn('Speaker diarization failed, continuing without speaker labels:', error);
    }
  }

  /**
   * Run speaker diarization
   */
  private async runSpeakerDiarization(
    audioPath: string,
    maxSpeakers: number
  ): Promise<{ start: number; end: number; speaker: string }[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'speaker_diarization.py');
      
      const args = [
        pythonScript,
        '--audio', audioPath,
        '--max-speakers', maxSpeakers.toString()
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
        if (code !== 0) {
          reject(new Error(`Speaker diarization failed: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output);
          resolve(result.segments || []);
        } catch (parseError) {
          reject(parseError);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn speaker diarization: ${error.message}`));
      });
    });
  }

  /**
   * Enhance audio quality for better transcription
   */
  private async enhanceAudio(audioPath: string): Promise<string> {
    const enhancedPath = path.join(
      this.config.tempPath,
      `enhanced_${Date.now()}_${path.basename(audioPath)}`
    );

    return new Promise((resolve, reject) => {
      // Use FFmpeg for audio enhancement
      const ffmpeg = spawn('ffmpeg', [
        '-i', audioPath,
        '-af', 'highpass=f=80,lowpass=f=8000,volume=1.5,dynaudnorm', // Audio filters
        '-ar', '16000', // Sample rate
        '-ac', '1', // Mono
        '-y', // Overwrite output
        enhancedPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(enhancedPath);
        } else {
          logger.warn('Audio enhancement failed, using original audio');
          resolve(audioPath);
        }
      });

      ffmpeg.on('error', () => {
        logger.warn('FFmpeg not available, using original audio');
        resolve(audioPath);
      });
    });
  }

  /**
   * Extract audio from video file
   */
  private async extractAudioFromVideo(videoPath: string): Promise<string> {
    const audioPath = path.join(
      this.config.tempPath,
      `extracted_${Date.now()}.wav`
    );

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vn', // No video
        '-acodec', 'pcm_s16le', // Audio codec
        '-ar', '16000', // Sample rate
        '-ac', '1', // Mono
        '-y', // Overwrite output
        audioPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(audioPath);
        } else {
          reject(new Error('Failed to extract audio from video'));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }

  /**
   * Analyze audio quality metrics
   */
  private async analyzeAudioQuality(
    segments: TranscriptionSegment[],
    audioPath: string
  ): Promise<void> {
    try {
      const qualityMetrics = await this.runAudioQualityAnalysis(audioPath);
      
      // Apply quality metrics to segments
      for (const segment of segments) {
        segment.audioQuality = qualityMetrics.snr; // Signal-to-noise ratio
        segment.noiseLevel = qualityMetrics.noiseLevel;
      }
    } catch (error) {
      logger.warn('Audio quality analysis failed:', error);
    }
  }

  /**
   * Run audio quality analysis
   */
  private async runAudioQualityAnalysis(audioPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'audio_quality.py');
      
      const args = [pythonScript, '--audio', audioPath];

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
            resolve(result);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Audio quality analysis failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Filter profanity from transcription
   */
  private filterProfanity(segments: TranscriptionSegment[]): void {
    const profanityWords = [
      // Add profanity words to filter - using placeholders here
      'profanity1', 'profanity2', 'profanity3'
    ];

    for (const segment of segments) {
      let filteredText = segment.text;
      
      for (const word of profanityWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filteredText = filteredText.replace(regex, '*'.repeat(word.length));
      }
      
      segment.text = filteredText;
      
      // Also filter word timestamps if available
      if (segment.words) {
        for (const wordTimestamp of segment.words) {
          for (const profanityWord of profanityWords) {
            if (wordTimestamp.word.toLowerCase() === profanityWord.toLowerCase()) {
              wordTimestamp.word = '*'.repeat(profanityWord.length);
            }
          }
        }
      }
    }
  }

  /**
   * Post-process transcription for better readability
   */
  private postProcessTranscription(segments: TranscriptionSegment[]): void {
    for (const segment of segments) {
      // Clean up text
      segment.text = segment.text
        .replace(/\s+/g, ' ') // Remove extra whitespace
        .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Proper sentence spacing
        .trim();

      // Capitalize first letter of sentences
      segment.text = segment.text.replace(
        /(^|\. )([a-z])/g,
        (match, prefix, letter) => prefix + letter.toUpperCase()
      );
    }
  }

  /**
   * Calculate temporal overlap between two time ranges
   */
  private calculateTemporalOverlap(
    range1: { startTime: number; endTime: number },
    range2: { startTime: number; endTime: number }
  ): number {
    const start = Math.max(range1.startTime, range2.startTime);
    const end = Math.min(range1.endTime, range2.endTime);

    if (end <= start) return 0;

    const intersectionDuration = end - start;
    const range1Duration = range1.endTime - range1.startTime;
    const range2Duration = range2.endTime - range2.startTime;
    const unionDuration = range1Duration + range2Duration - intersectionDuration;

    return intersectionDuration / unionDuration;
  }

  /**
   * Get total duration of all segments
   */
  private getTotalDuration(segments: TranscriptionSegment[]): number {
    if (segments.length === 0) return 0;
    
    const firstStart = Math.min(...segments.map(s => s.startTime));
    const lastEnd = Math.max(...segments.map(s => s.endTime));
    
    return lastEnd - firstStart;
  }

  /**
   * Verify dependencies
   */
  private async verifyDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.config.pythonPath, [
        '-c', 
        'import whisper, pyannote.audio; print("Dependencies OK")'
      ]);
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Required dependencies not found. Please install whisper and pyannote.audio.'));
        }
      });
      
      python.on('error', () => {
        reject(new Error('Python not found or dependencies missing.'));
      });
    });
  }

  /**
   * Load available models
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      const models = [
        'whisper-tiny', 'whisper-base', 'whisper-small', 
        'whisper-medium', 'whisper-large', 'whisper-large-v2',
        'whisper-large-v3'
      ];
      
      this.availableModels = models;
      logger.info(`Available models: ${this.availableModels.join(', ')}`);
    } catch (error) {
      logger.error('Failed to load available models:', error);
      throw error;
    }
  }

  /**
   * Check if speech-to-text engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [...this.availableModels];
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Speech-to-Text Engine...');
    this.isInitialized = false;
    logger.info('Speech-to-Text Engine shutdown complete');
  }
}

export default SpeechToTextEngine;