import { spawn } from 'child_process';
import path from 'path';
import logger from '../../config/logger';
import { Pool } from 'pg';
import { ExtractionEngineConfig } from '../ExtractionEngine.js';

const logger = logger.child({ name: 'EmbeddingService' });

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  modality: 'text' | 'image' | 'audio' | 'multimodal';
  source: string;
  createdAt: Date;
}

export interface SimilarityResult {
  id: string;
  similarity: number;
  metadata: Record<string, any>;
  vector?: number[];
}

export interface EmbeddingOptions {
  model?: string;
  normalize?: boolean;
  dimension?: number;
  poolingStrategy?: 'mean' | 'max' | 'cls';
}

export interface CrossModalQuery {
  textQuery?: string;
  imageQuery?: string;
  audioQuery?: string;
  weights?: {
    text?: number;
    image?: number;
    audio?: number;
  };
}

export interface ClusterResult {
  clusterId: string;
  centroid: number[];
  members: string[];
  coherenceScore: number;
  representativeItem?: string;
}

export class EmbeddingService {
  private config: ExtractionEngineConfig;
  private db: Pool;
  private isInitialized: boolean = false;
  private availableModels: Map<string, any> = new Map();

  constructor(config: ExtractionEngineConfig, db?: Pool) {
    this.config = config;
    this.db = db as Pool;
  }

  /**
   * Initialize embedding service
   */
  async initialize(): Promise<void> {
    try {
      // Verify dependencies
      await this.verifyDependencies();
      
      // Load embedding models
      await this.loadEmbeddingModels();
      
      // Initialize vector database tables
      if (this.db) {
        await this.initializeVectorTables();
      }
      
      this.isInitialized = true;
      logger.info('Embedding Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Embedding Service:', error);
      throw error;
    }
  }

  /**
   * Generate text embedding
   */
  async generateTextEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      model = 'sentence-transformers/all-MiniLM-L6-v2',
      normalize = true,
      poolingStrategy = 'mean'
    } = options;

    try {
      logger.debug(`Generating text embedding for: ${text.substring(0, 100)}...`);
      
      const embedding = await this.runTextEmbedding(text, model, normalize, poolingStrategy);
      
      logger.debug(`Generated text embedding with dimension: ${embedding.length}`);
      return embedding;
    } catch (error) {
      logger.error('Text embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate image embedding
   */
  async generateImageEmbedding(
    imagePath: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      model = 'openai/clip-vit-base-patch32',
      normalize = true
    } = options;

    try {
      logger.debug(`Generating image embedding for: ${imagePath}`);
      
      const embedding = await this.runImageEmbedding(imagePath, model, normalize);
      
      logger.debug(`Generated image embedding with dimension: ${embedding.length}`);
      return embedding;
    } catch (error) {
      logger.error('Image embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate audio embedding
   */
  async generateAudioEmbedding(
    audioPath: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      model = 'facebook/wav2vec2-base',
      normalize = true
    } = options;

    try {
      logger.debug(`Generating audio embedding for: ${audioPath}`);
      
      const embedding = await this.runAudioEmbedding(audioPath, model, normalize);
      
      logger.debug(`Generated audio embedding with dimension: ${embedding.length}`);
      return embedding;
    } catch (error) {
      logger.error('Audio embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate multimodal embedding by combining different modalities
   */
  async generateMultimodalEmbedding(
    inputs: {
      text?: string;
      imagePath?: string;
      audioPath?: string;
    },
    weights: {
      text?: number;
      image?: number;
      audio?: number;
    } = {}
  ): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      text: textWeight = 1.0,
      image: imageWeight = 1.0,
      audio: audioWeight = 1.0
    } = weights;

    try {
      const embeddings: number[][] = [];
      const modalityWeights: number[] = [];

      // Generate embeddings for each modality
      if (inputs.text && textWeight > 0) {
        const textEmbedding = await this.generateTextEmbedding(inputs.text);
        embeddings.push(textEmbedding);
        modalityWeights.push(textWeight);
      }

      if (inputs.imagePath && imageWeight > 0) {
        const imageEmbedding = await this.generateImageEmbedding(inputs.imagePath);
        embeddings.push(imageEmbedding);
        modalityWeights.push(imageWeight);
      }

      if (inputs.audioPath && audioWeight > 0) {
        const audioEmbedding = await this.generateAudioEmbedding(inputs.audioPath);
        embeddings.push(audioEmbedding);
        modalityWeights.push(audioWeight);
      }

      if (embeddings.length === 0) {
        throw new Error('No valid inputs provided for multimodal embedding');
      }

      // Combine embeddings using weighted fusion
      const combinedEmbedding = this.fuseEmbeddings(embeddings, modalityWeights);
      
      logger.debug(`Generated multimodal embedding with dimension: ${combinedEmbedding.length}`);
      return combinedEmbedding;
    } catch (error) {
      logger.error('Multimodal embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Store embedding in vector database
   */
  async storeEmbedding(
    id: string,
    vector: number[],
    metadata: Record<string, any>,
    modality: 'text' | 'image' | 'audio' | 'multimodal',
    source: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    try {
      const query = `
        INSERT INTO embeddings (id, vector, metadata, modality, source, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
          vector = EXCLUDED.vector,
          metadata = EXCLUDED.metadata,
          modality = EXCLUDED.modality,
          source = EXCLUDED.source,
          created_at = NOW()
      `;

      await this.db.query(query, [
        id,
        JSON.stringify(vector),
        JSON.stringify(metadata),
        modality,
        source
      ]);

      logger.debug(`Stored embedding: ${id} (${modality})`);
    } catch (error) {
      logger.error('Failed to store embedding:', error);
      throw error;
    }
  }

  /**
   * Find similar embeddings using vector similarity
   */
  async findSimilar(
    queryVector: number[],
    options: {
      topK?: number;
      threshold?: number;
      modality?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<SimilarityResult[]> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    const {
      topK = 10,
      threshold = 0.0,
      modality,
      metadata
    } = options;

    try {
      let query = `
        SELECT 
          id,
          vector,
          metadata,
          modality,
          source,
          (1 - (vector <=> $1::vector)) as similarity
        FROM embeddings
        WHERE (1 - (vector <=> $1::vector)) >= $2
      `;
      
      const params: any[] = [JSON.stringify(queryVector), threshold];
      let paramCount = 2;

      if (modality) {
        query += ` AND modality = $${++paramCount}`;
        params.push(modality);
      }

      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          query += ` AND metadata->>'${key}' = $${++paramCount}`;
          params.push(value);
        }
      }

      query += ` ORDER BY similarity DESC LIMIT $${++paramCount}`;
      params.push(topK);

      const result = await this.db.query(query, params);

      const similarities: SimilarityResult[] = result.rows.map(row => ({
        id: row.id,
        similarity: row.similarity,
        metadata: row.metadata,
        vector: JSON.parse(row.vector)
      }));

      logger.debug(`Found ${similarities.length} similar embeddings`);
      return similarities;
    } catch (error) {
      logger.error('Similarity search failed:', error);
      throw error;
    }
  }

  /**
   * Perform cross-modal search
   */
  async crossModalSearch(
    query: CrossModalQuery,
    options: {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<SimilarityResult[]> {
    const { topK = 10, threshold = 0.5 } = options;

    try {
      // Generate embeddings for each query modality
      const queryEmbeddings: number[][] = [];
      const modalityWeights: number[] = [];

      if (query.textQuery) {
        const textEmbedding = await this.generateTextEmbedding(query.textQuery);
        queryEmbeddings.push(textEmbedding);
        modalityWeights.push(query.weights?.text || 1.0);
      }

      if (query.imageQuery) {
        const imageEmbedding = await this.generateImageEmbedding(query.imageQuery);
        queryEmbeddings.push(imageEmbedding);
        modalityWeights.push(query.weights?.image || 1.0);
      }

      if (query.audioQuery) {
        const audioEmbedding = await this.generateAudioEmbedding(query.audioQuery);
        queryEmbeddings.push(audioEmbedding);
        modalityWeights.push(query.weights?.audio || 1.0);
      }

      if (queryEmbeddings.length === 0) {
        throw new Error('No valid query modalities provided');
      }

      // Combine query embeddings
      const combinedQuery = this.fuseEmbeddings(queryEmbeddings, modalityWeights);

      // Search for similar embeddings
      const results = await this.findSimilar(combinedQuery, { topK, threshold });

      logger.info(`Cross-modal search returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Cross-modal search failed:', error);
      throw error;
    }
  }

  /**
   * Perform clustering on embeddings
   */
  async clusterEmbeddings(
    embeddingIds: string[],
    options: {
      numClusters?: number;
      algorithm?: 'kmeans' | 'hierarchical' | 'dbscan';
      minClusterSize?: number;
    } = {}
  ): Promise<ClusterResult[]> {
    const {
      numClusters = 5,
      algorithm = 'kmeans',
      minClusterSize = 2
    } = options;

    try {
      // Get embeddings from database
      const embeddings = await this.getEmbeddingsByIds(embeddingIds);
      
      if (embeddings.length < numClusters) {
        throw new Error('Not enough embeddings for clustering');
      }

      // Run clustering algorithm
      const clusters = await this.runClustering(embeddings, numClusters, algorithm);

      // Filter out small clusters
      const validClusters = clusters.filter(cluster => cluster.members.length >= minClusterSize);

      logger.info(`Clustering completed: ${validClusters.length} clusters found`);
      return validClusters;
    } catch (error) {
      logger.error('Clustering failed:', error);
      throw error;
    }
  }

  /**
   * Run text embedding generation
   */
  private async runTextEmbedding(
    text: string,
    model: string,
    normalize: boolean,
    poolingStrategy: string
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'text_embedding.py');
      
      const args = [
        pythonScript,
        '--text', text,
        '--model', model,
        '--pooling', poolingStrategy
      ];

      if (normalize) {
        args.push('--normalize');
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
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.embedding || []);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Text embedding failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run image embedding generation
   */
  private async runImageEmbedding(
    imagePath: string,
    model: string,
    normalize: boolean
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'image_embedding.py');
      
      const args = [
        pythonScript,
        '--image', imagePath,
        '--model', model
      ];

      if (normalize) {
        args.push('--normalize');
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
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.embedding || []);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Image embedding failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run audio embedding generation
   */
  private async runAudioEmbedding(
    audioPath: string,
    model: string,
    normalize: boolean
  ): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'audio_embedding.py');
      
      const args = [
        pythonScript,
        '--audio', audioPath,
        '--model', model
      ];

      if (normalize) {
        args.push('--normalize');
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
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.embedding || []);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Audio embedding failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Fuse multiple embeddings using weighted combination
   */
  private fuseEmbeddings(embeddings: number[][], weights: number[]): number[] {
    if (embeddings.length === 0) {
      throw new Error('No embeddings to fuse');
    }

    if (embeddings.length !== weights.length) {
      throw new Error('Number of embeddings must match number of weights');
    }

    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Get dimension from first embedding
    const dimension = embeddings[0].length;

    // Verify all embeddings have same dimension
    for (const embedding of embeddings) {
      if (embedding.length !== dimension) {
        throw new Error('All embeddings must have the same dimension');
      }
    }

    // Weighted combination
    const fusedEmbedding = new Array(dimension).fill(0);
    
    for (let i = 0; i < dimension; i++) {
      for (let j = 0; j < embeddings.length; j++) {
        fusedEmbedding[i] += embeddings[j][i] * normalizedWeights[j];
      }
    }

    // Normalize the fused embedding
    const norm = Math.sqrt(fusedEmbedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        fusedEmbedding[i] /= norm;
      }
    }

    return fusedEmbedding;
  }

  /**
   * Get embeddings by IDs
   */
  private async getEmbeddingsByIds(ids: string[]): Promise<EmbeddingVector[]> {
    if (!this.db) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT id, vector, metadata, modality, source, created_at
      FROM embeddings
      WHERE id = ANY($1)
    `;

    const result = await this.db.query(query, [ids]);

    return result.rows.map(row => ({
      id: row.id,
      vector: JSON.parse(row.vector),
      metadata: row.metadata,
      modality: row.modality,
      source: row.source,
      createdAt: row.created_at
    }));
  }

  /**
   * Run clustering algorithm
   */
  private async runClustering(
    embeddings: EmbeddingVector[],
    numClusters: number,
    algorithm: string
  ): Promise<ClusterResult[]> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.modelsPath, 'clustering.py');
      
      const embeddingData = {
        embeddings: embeddings.map(e => ({
          id: e.id,
          vector: e.vector,
          metadata: e.metadata
        }))
      };

      const args = [
        pythonScript,
        '--data', JSON.stringify(embeddingData),
        '--num-clusters', numClusters.toString(),
        '--algorithm', algorithm
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
            resolve(result.clusters || []);
          } catch (parseError) {
            reject(parseError);
          }
        } else {
          reject(new Error(`Clustering failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Initialize vector database tables
   */
  private async initializeVectorTables(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS embeddings (
        id VARCHAR(255) PRIMARY KEY,
        vector JSONB NOT NULL,
        metadata JSONB DEFAULT '{}',
        modality VARCHAR(50) NOT NULL,
        source VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_embeddings_modality ON embeddings(modality);
      CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source);
      CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at);
    `;

    await this.db.query(createTableQuery);
    logger.debug('Vector database tables initialized');
  }

  /**
   * Verify dependencies
   */
  private async verifyDependencies(): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.config.pythonPath, [
        '-c', 
        'import sentence_transformers, transformers, torch, sklearn; print("Dependencies OK")'
      ]);
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Required dependencies not found. Please install sentence-transformers, transformers, torch, scikit-learn.'));
        }
      });
      
      python.on('error', () => {
        reject(new Error('Python not found or dependencies missing.'));
      });
    });
  }

  /**
   * Load embedding models
   */
  private async loadEmbeddingModels(): Promise<void> {
    try {
      // Load available embedding models
      const textModels = [
        'sentence-transformers/all-MiniLM-L6-v2',
        'sentence-transformers/all-mpnet-base-v2',
        'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
      ];

      const imageModels = [
        'openai/clip-vit-base-patch32',
        'openai/clip-vit-large-patch14'
      ];

      const audioModels = [
        'facebook/wav2vec2-base',
        'facebook/wav2vec2-large'
      ];

      this.availableModels.set('text', textModels);
      this.availableModels.set('image', imageModels);
      this.availableModels.set('audio', audioModels);

      logger.info('Embedding models loaded successfully');
    } catch (error) {
      logger.error('Failed to load embedding models:', error);
      throw error;
    }
  }

  /**
   * Check if embedding service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get available models for a modality
   */
  getAvailableModels(modality: string): string[] {
    return this.availableModels.get(modality) || [];
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Embedding Service...');
    this.availableModels.clear();
    this.isInitialized = false;
    logger.info('Embedding Service shutdown complete');
  }
}

export default EmbeddingService;