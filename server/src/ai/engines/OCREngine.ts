import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import path from 'path';
import logger from '../../config/logger';
import sharp from 'sharp';
import { ExtractionEngineConfig } from '../ExtractionEngine.js';

const logger = logger.child({ name: 'OCREngine' });

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };
  language: string;
  engine: string;
}

export interface OCROptions {
  language?: string;
  enhanceImage?: boolean;
  confidenceThreshold?: number;
  preserveWhitespace?: boolean;
  enableStructureAnalysis?: boolean;
}

export class OCREngine {
  private config: ExtractionEngineConfig;
  private isInitialized: boolean = false;

  constructor(config: ExtractionEngineConfig) {
    this.config = config;
  }

  /**
   * Initialize OCR engine and verify dependencies
   */
  async initialize(): Promise<void> {
    try {
      // Verify Tesseract installation
      await this.verifyTesseractInstallation();
      
      // Verify Python dependencies for PaddleOCR
      await this.verifyPaddleOCRInstallation();
      
      this.isInitialized = true;
      logger.info('OCR Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OCR Engine:', error);
      throw error;
    }
  }

  /**
   * Extract text from image using multiple OCR engines
   */
  async extractText(imagePath: string, options: OCROptions = {}): Promise<OCRResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      language = 'eng',
      enhanceImage = true,
      confidenceThreshold = 0.6,
      preserveWhitespace = false,
      enableStructureAnalysis = true
    } = options;

    logger.info(`Starting OCR extraction for: ${imagePath}`);

    try {
      let processedImagePath = imagePath;

      // Enhance image if requested
      if (enhanceImage) {
        processedImagePath = await this.enhanceImageForOCR(imagePath);
      }

      // Run multiple OCR engines and combine results
      const [tesseractResults, paddleResults] = await Promise.allSettled([
        this.runTesseractOCR(processedImagePath, language, confidenceThreshold),
        this.runPaddleOCR(processedImagePath, language, confidenceThreshold)
      ]);

      const allResults: OCRResult[] = [];

      // Process Tesseract results
      if (tesseractResults.status === 'fulfilled') {
        allResults.push(...tesseractResults.value);
      } else {
        logger.warn('Tesseract OCR failed:', tesseractResults.reason);
      }

      // Process PaddleOCR results
      if (paddleResults.status === 'fulfilled') {
        allResults.push(...paddleResults.value);
      } else {
        logger.warn('PaddleOCR failed:', paddleResults.reason);
      }

      // Merge and deduplicate results
      const mergedResults = this.mergeOCRResults(allResults, confidenceThreshold);

      // Structure analysis if enabled
      if (enableStructureAnalysis && mergedResults.length > 0) {
        await this.analyzeTextStructure(mergedResults);
      }

      logger.info(`OCR extraction completed: ${mergedResults.length} text regions found`);
      return mergedResults;

    } catch (error) {
      logger.error('OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Run Tesseract OCR
   */
  private async runTesseractOCR(
    imagePath: string,
    language: string,
    confidenceThreshold: number
  ): Promise<OCRResult[]> {
    return new Promise((resolve, reject) => {
      const args = [
        imagePath,
        'stdout',
        '-l', language,
        '--psm', '6', // Uniform block of text
        '--oem', '3', // Default OCR Engine Mode
        '-c', 'preserve_interword_spaces=1',
        'tsv'
      ];

      const tesseract = spawn('tesseract', args);
      let output = '';
      let errorOutput = '';

      tesseract.stdout.on('data', (data) => {
        output += data.toString();
      });

      tesseract.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      tesseract.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Tesseract failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const results = this.parseTesseractTSV(output, confidenceThreshold);
          resolve(results);
        } catch (parseError) {
          reject(parseError);
        }
      });

      tesseract.on('error', (error) => {
        reject(new Error(`Failed to spawn tesseract: ${error.message}`));
      });
    });
  }

  /**
   * Run PaddleOCR
   */
  private async runPaddleOCR(
    imagePath: string,
    language: string,
    confidenceThreshold: number
  ): Promise<OCRResult[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'paddle_ocr.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--lang', this.mapLanguageForPaddle(language),
        '--confidence', confidenceThreshold.toString()
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
          reject(new Error(`PaddleOCR failed with code ${code}: ${errorOutput}`));
          return;
        }

        try {
          const results = JSON.parse(output);
          const ocrResults = this.parsePaddleOCRResults(results, confidenceThreshold);
          resolve(ocrResults);
        } catch (parseError) {
          reject(parseError);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn PaddleOCR: ${error.message}`));
      });
    });
  }

  /**
   * Enhance image for better OCR results
   */
  private async enhanceImageForOCR(imagePath: string): Promise<string> {
    const enhancedPath = path.join(
      this.config.tempPath,
      `enhanced_${Date.now()}_${path.basename(imagePath)}`
    );

    try {
      await sharp(imagePath)
        .resize(null, 2000, { // Upscale to minimum 2000px height
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3
        })
        .sharpen()
        .normalize()
        .threshold(128) // Binarize
        .png()
        .toFile(enhancedPath);

      return enhancedPath;
    } catch (error) {
      logger.warn('Image enhancement failed, using original:', error);
      return imagePath;
    }
  }

  /**
   * Parse Tesseract TSV output
   */
  private parseTesseractTSV(tsvOutput: string, confidenceThreshold: number): OCRResult[] {
    const lines = tsvOutput.trim().split('\n');
    const results: OCRResult[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const columns = lines[i].split('\t');
      
      if (columns.length >= 12) {
        const confidence = parseFloat(columns[10]);
        const text = columns[11];

        if (confidence >= confidenceThreshold * 100 && text.trim()) {
          results.push({
            text: text.trim(),
            confidence: confidence / 100,
            boundingBox: {
              x: parseInt(columns[6]),
              y: parseInt(columns[7]),
              width: parseInt(columns[8]),
              height: parseInt(columns[9]),
              confidence: confidence / 100
            },
            language: 'detected',
            engine: 'tesseract'
          });
        }
      }
    }

    return results;
  }

  /**
   * Parse PaddleOCR results
   */
  private parsePaddleOCRResults(paddleResults: any[], confidenceThreshold: number): OCRResult[] {
    const results: OCRResult[] = [];

    for (const result of paddleResults) {
      const [bbox, [text, confidence]] = result;
      
      if (confidence >= confidenceThreshold && text.trim()) {
        // PaddleOCR returns 4 corner points, convert to bounding box
        const xs = bbox.map((point: number[]) => point[0]);
        const ys = bbox.map((point: number[]) => point[1]);
        
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const width = Math.max(...xs) - x;
        const height = Math.max(...ys) - y;

        results.push({
          text: text.trim(),
          confidence,
          boundingBox: {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height),
            confidence
          },
          language: 'detected',
          engine: 'paddleocr'
        });
      }
    }

    return results;
  }

  /**
   * Merge results from multiple OCR engines
   */
  private mergeOCRResults(allResults: OCRResult[], confidenceThreshold: number): OCRResult[] {
    if (allResults.length === 0) return [];

    // Group results by spatial overlap
    const groups: OCRResult[][] = [];
    
    for (const result of allResults) {
      let merged = false;
      
      for (const group of groups) {
        const representative = group[0];
        const overlap = this.calculateBoundingBoxOverlap(
          result.boundingBox,
          representative.boundingBox
        );
        
        if (overlap > 0.5) { // 50% overlap threshold
          group.push(result);
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        groups.push([result]);
      }
    }

    // For each group, select the best result
    const mergedResults: OCRResult[] = [];
    
    for (const group of groups) {
      if (group.length === 1) {
        mergedResults.push(group[0]);
      } else {
        // Choose result with highest confidence
        const bestResult = group.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        
        // If multiple engines agree, increase confidence
        if (group.length > 1) {
          const textSimilarity = this.calculateTextSimilarity(
            group.map(r => r.text)
          );
          
          if (textSimilarity > 0.8) {
            bestResult.confidence = Math.min(0.95, bestResult.confidence * 1.2);
          }
        }
        
        mergedResults.push(bestResult);
      }
    }

    return mergedResults.filter(r => r.confidence >= confidenceThreshold);
  }

  /**
   * Calculate bounding box overlap (IoU)
   */
  private calculateBoundingBoxOverlap(box1: any, box2: any): number {
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
   * Calculate text similarity between multiple texts
   */
  private calculateTextSimilarity(texts: string[]): number {
    if (texts.length < 2) return 1.0;
    
    const normalized = texts.map(t => t.toLowerCase().trim());
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const similarity = this.levenshteinSimilarity(normalized[i], normalized[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Calculate Levenshtein similarity
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Analyze text structure for layout understanding
   */
  private async analyzeTextStructure(results: OCRResult[]): Promise<void> {
    // Sort by reading order (top to bottom, left to right)
    results.sort((a, b) => {
      const yDiff = a.boundingBox.y - b.boundingBox.y;
      if (Math.abs(yDiff) < 20) { // Same line
        return a.boundingBox.x - b.boundingBox.x;
      }
      return yDiff;
    });

    // Add structure metadata
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      // Detect if this is likely a heading (larger text, isolated)
      const isHeading = this.detectHeading(result, results);
      
      // Detect if this is part of a table
      const isTableCell = this.detectTableCell(result, results);
      
      // Add reading order
      result.metadata = {
        ...result.metadata,
        readingOrder: i,
        isHeading,
        isTableCell,
        structureType: isHeading ? 'heading' : (isTableCell ? 'table' : 'paragraph')
      };
    }
  }

  /**
   * Detect if text is likely a heading
   */
  private detectHeading(result: OCRResult, allResults: OCRResult[]): boolean {
    const height = result.boundingBox.height;
    const avgHeight = allResults.reduce((sum, r) => sum + r.boundingBox.height, 0) / allResults.length;
    
    // Heading heuristics
    const isLargerText = height > avgHeight * 1.3;
    const isShortText = result.text.length < 50;
    const isIsolated = !this.hasNearbyText(result, allResults, 30);
    
    return isLargerText && isShortText && isIsolated;
  }

  /**
   * Detect if text is part of a table
   */
  private detectTableCell(result: OCRResult, allResults: OCRResult[]): boolean {
    // Look for aligned text elements (same x or y coordinates)
    const threshold = 10; // pixels
    
    const alignedElements = allResults.filter(other => {
      if (other === result) return false;
      
      const sameRow = Math.abs(result.boundingBox.y - other.boundingBox.y) < threshold;
      const sameColumn = Math.abs(result.boundingBox.x - other.boundingBox.x) < threshold;
      
      return sameRow || sameColumn;
    });
    
    return alignedElements.length >= 2; // At least 2 other aligned elements
  }

  /**
   * Check if text has nearby text elements
   */
  private hasNearbyText(result: OCRResult, allResults: OCRResult[], threshold: number): boolean {
    return allResults.some(other => {
      if (other === result) return false;
      
      const distance = Math.sqrt(
        Math.pow(result.boundingBox.x - other.boundingBox.x, 2) +
        Math.pow(result.boundingBox.y - other.boundingBox.y, 2)
      );
      
      return distance < threshold;
    });
  }

  /**
   * Map language codes for PaddleOCR
   */
  private mapLanguageForPaddle(tesseractLang: string): string {
    const languageMap: Record<string, string> = {
      'eng': 'en',
      'chi_sim': 'ch',
      'chi_tra': 'chinese_cht',
      'jpn': 'japan',
      'kor': 'korean',
      'fra': 'french',
      'deu': 'german',
      'spa': 'spanish',
      'rus': 'russian',
      'ara': 'arabic'
    };
    
    return languageMap[tesseractLang] || 'en';
  }

  /**
   * Verify Tesseract installation
   */
  private async verifyTesseractInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tesseract = spawn('tesseract', ['--version']);
      
      tesseract.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Tesseract not found. Please install Tesseract OCR.'));
        }
      });
      
      tesseract.on('error', () => {
        reject(new Error('Tesseract not found. Please install Tesseract OCR.'));
      });
    });
  }

  /**
   * Verify PaddleOCR installation
   */
  private async verifyPaddleOCRInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.config.pythonPath, ['-c', 'import paddleocr; print("OK")']);
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('PaddleOCR not installed. Please install PaddleOCR Python package.'));
        }
      });
      
      python.on('error', () => {
        reject(new Error('Python not found or PaddleOCR not installed.'));
      });
    });
  }

  /**
   * Check if OCR engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down OCR Engine...');
    // Cleanup temporary files if needed
    this.isInitialized = false;
    logger.info('OCR Engine shutdown complete');
  }
}

export default OCREngine;