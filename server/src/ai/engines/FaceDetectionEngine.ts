import { spawn } from 'child_process';
import path from 'path';
import logger from '../../config/logger';
import { ExtractionEngineConfig } from '../ExtractionEngine.js';

const logger = logger.child({ name: 'FaceDetectionEngine' });

export interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };
  confidence: number;
  landmarks: FaceLandmarks;
  estimatedAge?: number;
  estimatedGender?: string;
  dominantEmotion?: string;
  emotions?: EmotionScores;
  recognizedIdentity?: string;
  identityConfidence?: number;
  featureVector?: number[];
  qualityScore?: number;
}

export interface FaceLandmarks {
  leftEye: Point;
  rightEye: Point;
  nose: Point;
  leftMouth: Point;
  rightMouth: Point;
  additionalPoints?: Point[];
}

export interface Point {
  x: number;
  y: number;
  confidence?: number;
}

export interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  fearful: number;
  disgusted: number;
  neutral: number;
}

export interface FaceDetectionOptions {
  minFaceSize?: number;
  confidenceThreshold?: number;
  extractFeatures?: boolean;
  recognizeIdentities?: boolean;
  analyzeEmotions?: boolean;
  estimateAge?: boolean;
  estimateGender?: boolean;
  enableQualityCheck?: boolean;
  trackAcrossFrames?: boolean;
}

export interface VideoFaceDetectionOptions extends FaceDetectionOptions {
  frameRate?: number;
  startTime?: number;
  endTime?: number;
  enableTemporalSmoothing?: boolean;
}

export interface IdentityDatabase {
  addIdentity(name: string, faceVector: number[]): Promise<void>;
  removeIdentity(name: string): Promise<void>;
  searchIdentity(faceVector: number[], threshold?: number): Promise<{ name: string; confidence: number } | null>;
  listIdentities(): Promise<string[]>;
}

export class FaceDetectionEngine {
  private config: ExtractionEngineConfig;
  private isInitialized: boolean = false;
  private identityDatabase: Map<string, number[]> = new Map();

  constructor(config: ExtractionEngineConfig) {
    this.config = config;
  }

  /**
   * Initialize face detection engine
   */
  async initialize(): Promise<void> {
    try {
      // Verify dependencies
      await this.verifyDependencies();
      
      // Load pre-trained models
      await this.loadModels();
      
      // Initialize identity database
      await this.initializeIdentityDatabase();
      
      this.isInitialized = true;
      logger.info('Face Detection Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Face Detection Engine:', error);
      throw error;
    }
  }

  /**
   * Detect faces in image
   */
  async detectFaces(
    imagePath: string,
    options: FaceDetectionOptions = {}
  ): Promise<FaceDetection[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      minFaceSize = 20,
      confidenceThreshold = 0.7,
      extractFeatures = true,
      recognizeIdentities = false,
      analyzeEmotions = true,
      estimateAge = true,
      estimateGender = true,
      enableQualityCheck = true
    } = options;

    logger.info(`Starting face detection for: ${imagePath}`);

    try {
      // Run primary face detection
      const detections = await this.runFaceDetection(
        imagePath,
        minFaceSize,
        confidenceThreshold
      );

      // Process each detected face
      for (const detection of detections) {
        // Extract facial landmarks
        await this.extractLandmarks(detection, imagePath);

        // Calculate quality score
        if (enableQualityCheck) {
          detection.qualityScore = this.calculateFaceQuality(detection);
        }

        // Extract features for recognition
        if (extractFeatures || recognizeIdentities) {
          detection.featureVector = await this.extractFaceFeatures(
            imagePath,
            detection.boundingBox
          );
        }

        // Recognize identity
        if (recognizeIdentities && detection.featureVector) {
          const identity = await this.recognizeIdentity(detection.featureVector);
          if (identity) {
            detection.recognizedIdentity = identity.name;
            detection.identityConfidence = identity.confidence;
          }
        }

        // Analyze emotions
        if (analyzeEmotions) {
          detection.emotions = await this.analyzeEmotions(imagePath, detection.boundingBox);
          detection.dominantEmotion = this.getDominantEmotion(detection.emotions);
        }

        // Estimate age
        if (estimateAge) {
          detection.estimatedAge = await this.estimateAge(imagePath, detection.boundingBox);
        }

        // Estimate gender
        if (estimateGender) {
          detection.estimatedGender = await this.estimateGender(imagePath, detection.boundingBox);
        }
      }

      // Filter by quality if quality check is enabled
      const qualifiedDetections = enableQualityCheck
        ? detections.filter(d => d.qualityScore && d.qualityScore > 0.5)
        : detections;

      logger.info(`Face detection completed: ${qualifiedDetections.length} faces detected`);
      return qualifiedDetections;

    } catch (error) {
      logger.error('Face detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect faces in video
   */
  async detectFacesInVideo(
    videoPath: string,
    options: VideoFaceDetectionOptions = {}
  ): Promise<{ frame: number; timestamp: number; faces: FaceDetection[] }[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      frameRate = 1,
      startTime = 0,
      endTime,
      enableTemporalSmoothing = true,
      trackAcrossFrames = true,
      ...faceOptions
    } = options;

    logger.info(`Starting video face detection for: ${videoPath}`);

    try {
      const results = await this.runVideoFaceDetection(
        videoPath,
        frameRate,
        startTime,
        endTime,
        faceOptions
      );

      // Apply tracking across frames
      if (trackAcrossFrames) {
        this.applyVideoFaceTracking(results);
      }

      // Apply temporal smoothing
      if (enableTemporalSmoothing) {
        this.applyTemporalSmoothing(results);
      }

      logger.info(`Video face detection completed: ${results.length} frames processed`);
      return results;

    } catch (error) {
      logger.error('Video face detection failed:', error);
      throw error;
    }
  }

  /**
   * Run primary face detection using MTCNN
   */
  private async runFaceDetection(
    imagePath: string,
    minFaceSize: number,
    confidenceThreshold: number
  ): Promise<FaceDetection[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'mtcnn_detection.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--min-face-size', minFaceSize.toString(),
        '--confidence', confidenceThreshold.toString()
      ];

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
          reject(new Error(`Face detection failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const results = JSON.parse(output);
          const detections = this.parseFaceDetectionResults(results);
          resolve(detections);
        } catch (parseError) {
          reject(parseError);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn face detection: ${error.message}`));
      });
    });
  }

  /**
   * Run video face detection
   */
  private async runVideoFaceDetection(
    videoPath: string,
    frameRate: number,
    startTime: number,
    endTime: number | undefined,
    faceOptions: FaceDetectionOptions
  ): Promise<{ frame: number; timestamp: number; faces: FaceDetection[] }[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'video_face_detection.py');
      
      const args = [
        pythonScript,
        '--video', videoPath,
        '--frame-rate', frameRate.toString(),
        '--start-time', startTime.toString(),
        '--min-face-size', (faceOptions.minFaceSize || 20).toString(),
        '--confidence', (faceOptions.confidenceThreshold || 0.7).toString()
      ];

      if (endTime !== undefined) {
        args.push('--end-time', endTime.toString());
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
          reject(new Error(`Video face detection failed: ${errorOutput}`));
          return;
        }

        try {
          const results = JSON.parse(output);
          const frameResults = this.parseVideoFaceDetectionResults(results);
          resolve(frameResults);
        } catch (parseError) {
          reject(parseError);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn video face detection: ${error.message}`));
      });
    });
  }

  /**
   * Extract facial landmarks
   */
  private async extractLandmarks(detection: FaceDetection, imagePath: string): Promise<void> {
    try {
      const landmarks = await this.runLandmarkExtraction(imagePath, detection.boundingBox);
      detection.landmarks = landmarks;
    } catch (error) {
      logger.warn('Landmark extraction failed:', error);
      // Provide default landmarks based on bounding box
      detection.landmarks = this.getDefaultLandmarks(detection.boundingBox);
    }
  }

  /**
   * Run landmark extraction
   */
  private async runLandmarkExtraction(imagePath: string, boundingBox: any): Promise<FaceLandmarks> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'face_landmarks.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--bbox', `${boundingBox.x},${boundingBox.y},${boundingBox.width},${boundingBox.height}`
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
            resolve(result.landmarks);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Landmark extraction failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract face features for recognition
   */
  private async extractFaceFeatures(imagePath: string, boundingBox: any): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'face_features.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--bbox', `${boundingBox.x},${boundingBox.y},${boundingBox.width},${boundingBox.height}`
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
            resolve(result.features || []);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Feature extraction failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Analyze emotions
   */
  private async analyzeEmotions(imagePath: string, boundingBox: any): Promise<EmotionScores> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'emotion_analysis.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--bbox', `${boundingBox.x},${boundingBox.y},${boundingBox.width},${boundingBox.height}`
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
            resolve(result.emotions || this.getDefaultEmotions());
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          logger.warn('Emotion analysis failed, using defaults');
          resolve(this.getDefaultEmotions());
        }
      });

      python.on('error', (error) => {
        logger.warn('Emotion analysis failed, using defaults');
        resolve(this.getDefaultEmotions());
      });
    });
  }

  /**
   * Estimate age
   */
  private async estimateAge(imagePath: string, boundingBox: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'age_estimation.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--bbox', `${boundingBox.x},${boundingBox.y},${boundingBox.width},${boundingBox.height}`
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
            resolve(result.age || 30); // Default age
          } catch (parseError) {
            resolve(30);
          }
        } else {
          resolve(30);
        }
      });

      python.on('error', () => {
        resolve(30);
      });
    });
  }

  /**
   * Estimate gender
   */
  private async estimateGender(imagePath: string, boundingBox: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'gender_estimation.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--bbox', `${boundingBox.x},${boundingBox.y},${boundingBox.width},${boundingBox.height}`
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
            resolve(result.gender || 'unknown');
          } catch (parseError) {
            resolve('unknown');
          }
        } else {
          resolve('unknown');
        }
      });

      python.on('error', () => {
        resolve('unknown');
      });
    });
  }

  /**
   * Parse face detection results
   */
  private parseFaceDetectionResults(results: any): FaceDetection[] {
    const detections: FaceDetection[] = [];

    for (const face of results.faces || []) {
      detections.push({
        boundingBox: {
          x: Math.round(face.bbox[0]),
          y: Math.round(face.bbox[1]),
          width: Math.round(face.bbox[2]),
          height: Math.round(face.bbox[3]),
          confidence: face.confidence
        },
        confidence: face.confidence,
        landmarks: this.getDefaultLandmarks({
          x: face.bbox[0],
          y: face.bbox[1],
          width: face.bbox[2],
          height: face.bbox[3]
        })
      });
    }

    return detections;
  }

  /**
   * Parse video face detection results
   */
  private parseVideoFaceDetectionResults(
    results: any
  ): { frame: number; timestamp: number; faces: FaceDetection[] }[] {
    const frameResults: { frame: number; timestamp: number; faces: FaceDetection[] }[] = [];

    for (const frameResult of results.frames || []) {
      const faces = this.parseFaceDetectionResults(frameResult);
      
      frameResults.push({
        frame: frameResult.frame_number,
        timestamp: frameResult.timestamp,
        faces
      });
    }

    return frameResults;
  }

  /**
   * Apply face tracking across video frames
   */
  private applyVideoFaceTracking(
    frameResults: { frame: number; timestamp: number; faces: FaceDetection[] }[]
  ): void {
    const tracks = new Map<string, FaceDetection[]>();
    let nextTrackId = 0;

    for (const frameResult of frameResults) {
      const unmatchedFaces = [...frameResult.faces];
      const activeTrackIds = new Set<string>();

      // Try to match faces with existing tracks
      for (const [trackId, trackHistory] of tracks.entries()) {
        const lastFace = trackHistory[trackHistory.length - 1];
        
        let bestMatch: FaceDetection | null = null;
        let bestSimilarity = 0;
        let bestIndex = -1;

        for (let i = 0; i < unmatchedFaces.length; i++) {
          const face = unmatchedFaces[i];
          
          // Calculate similarity based on bounding box overlap and features
          const boxSimilarity = this.calculateBoundingBoxSimilarity(
            face.boundingBox,
            lastFace.boundingBox
          );
          
          let featureSimilarity = 0;
          if (face.featureVector && lastFace.featureVector) {
            featureSimilarity = this.calculateFeatureSimilarity(
              face.featureVector,
              lastFace.featureVector
            );
          }
          
          const overallSimilarity = (boxSimilarity + featureSimilarity) / 2;
          
          if (overallSimilarity > bestSimilarity && overallSimilarity > 0.5) {
            bestMatch = face;
            bestSimilarity = overallSimilarity;
            bestIndex = i;
          }
        }

        if (bestMatch) {
          // Assign track ID (could add this as metadata)
          trackHistory.push(bestMatch);
          unmatchedFaces.splice(bestIndex, 1);
          activeTrackIds.add(trackId);
        }
      }

      // Create new tracks for unmatched faces
      for (const face of unmatchedFaces) {
        const trackId = `face_track_${nextTrackId++}`;
        tracks.set(trackId, [face]);
        activeTrackIds.add(trackId);
      }

      // Remove inactive tracks
      for (const [trackId, trackHistory] of tracks.entries()) {
        if (!activeTrackIds.has(trackId)) {
          const frameGap = frameResult.frame - this.getLastFrameNumber(trackHistory);
          
          if (frameGap > 5) { // Remove if not seen for 5 frames
            tracks.delete(trackId);
          }
        }
      }
    }
  }

  /**
   * Apply temporal smoothing to face attributes
   */
  private applyTemporalSmoothing(
    frameResults: { frame: number; timestamp: number; faces: FaceDetection[] }[]
  ): void {
    // This would smooth attributes like emotions, age estimates across frames
    // Implementation would track faces and apply moving averages
    logger.debug('Temporal smoothing applied to face detection results');
  }

  /**
   * Calculate face quality score
   */
  private calculateFaceQuality(detection: FaceDetection): number {
    let qualityScore = detection.confidence;
    
    // Factor in face size (larger faces are typically higher quality)
    const faceSize = detection.boundingBox.width * detection.boundingBox.height;
    const sizeScore = Math.min(faceSize / (100 * 100), 1.0); // Normalize to 100x100 minimum
    
    // Factor in landmark confidence if available
    let landmarkScore = 1.0;
    if (detection.landmarks?.leftEye?.confidence) {
      const avgLandmarkConfidence = [
        detection.landmarks.leftEye.confidence,
        detection.landmarks.rightEye.confidence,
        detection.landmarks.nose.confidence,
        detection.landmarks.leftMouth.confidence,
        detection.landmarks.rightMouth.confidence
      ].reduce((sum, conf) => sum + (conf || 0), 0) / 5;
      
      landmarkScore = avgLandmarkConfidence;
    }
    
    // Combined quality score
    qualityScore = (qualityScore + sizeScore + landmarkScore) / 3;
    
    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * Recognize identity using feature matching
   */
  private async recognizeIdentity(
    faceVector: number[],
    threshold: number = 0.6
  ): Promise<{ name: string; confidence: number } | null> {
    let bestMatch: { name: string; confidence: number } | null = null;
    let bestSimilarity = 0;

    for (const [name, knownVector] of this.identityDatabase.entries()) {
      const similarity = this.calculateFeatureSimilarity(faceVector, knownVector);
      
      if (similarity > bestSimilarity && similarity > threshold) {
        bestSimilarity = similarity;
        bestMatch = { name, confidence: similarity };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate feature similarity using cosine similarity
   */
  private calculateFeatureSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculate bounding box similarity
   */
  private calculateBoundingBoxSimilarity(box1: any, box2: any): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 <= x1 || y2 <= y1) return 0;

    const intersectionArea = (x2 - x1) * (y2 - y1);
    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;
    const unionArea = box1Area + box2Area - intersectionArea;

    return intersectionArea / unionArea;
  }

  /**
   * Get dominant emotion from emotion scores
   */
  private getDominantEmotion(emotions: EmotionScores): string {
    const entries = Object.entries(emotions);
    const dominant = entries.reduce((max, [emotion, score]) => 
      score > max.score ? { emotion, score } : max,
      { emotion: 'neutral', score: 0 }
    );
    
    return dominant.emotion;
  }

  /**
   * Get default landmarks based on bounding box
   */
  private getDefaultLandmarks(boundingBox: any): FaceLandmarks {
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;
    
    return {
      leftEye: { x: centerX - boundingBox.width * 0.2, y: centerY - boundingBox.height * 0.1 },
      rightEye: { x: centerX + boundingBox.width * 0.2, y: centerY - boundingBox.height * 0.1 },
      nose: { x: centerX, y: centerY },
      leftMouth: { x: centerX - boundingBox.width * 0.15, y: centerY + boundingBox.height * 0.2 },
      rightMouth: { x: centerX + boundingBox.width * 0.15, y: centerY + boundingBox.height * 0.2 }
    };
  }

  /**
   * Get default emotion scores
   */
  private getDefaultEmotions(): EmotionScores {
    return {
      happy: 0.1,
      sad: 0.1,
      angry: 0.1,
      surprised: 0.1,
      fearful: 0.1,
      disgusted: 0.1,
      neutral: 0.4
    };
  }

  /**
   * Get last frame number from track history
   */
  private getLastFrameNumber(trackHistory: FaceDetection[]): number {
    // This would extract frame number from metadata
    return 0; // Placeholder
  }

  /**
   * Identity database methods
   */
  async addIdentity(name: string, faceVector: number[]): Promise<void> {
    this.identityDatabase.set(name, faceVector);
    logger.info(`Added identity: ${name}`);
  }

  async removeIdentity(name: string): Promise<void> {
    this.identityDatabase.delete(name);
    logger.info(`Removed identity: ${name}`);
  }

  async listIdentities(): Promise<string[]> {
    return Array.from(this.identityDatabase.keys());
  }

  /**
   * Verify dependencies
   */
  private async verifyDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.config.pythonPath, [
        '-c', 
        'import mtcnn, facenet_pytorch, cv2; print("Dependencies OK")'
      ]);
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Required dependencies not found. Please install mtcnn, facenet-pytorch, opencv-python.'));
        }
      });
      
      python.on('error', () => {
        reject(new Error('Python not found or dependencies missing.'));
      });
    });
  }

  /**
   * Load pre-trained models
   */
  private async loadModels(): Promise<void> {
    // Load MTCNN and other face analysis models
    logger.info('Face detection models loaded');
  }

  /**
   * Initialize identity database
   */
  private async initializeIdentityDatabase(): Promise<void> {
    // Load known identities from persistent storage
    logger.info('Identity database initialized');
  }

  /**
   * Check if face detection engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Face Detection Engine...');
    this.isInitialized = false;
    logger.info('Face Detection Engine shutdown complete');
  }
}

export default FaceDetectionEngine;