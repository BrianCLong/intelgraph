#!/usr/bin/env python3
"""
Sentence Transformer Encoder for Entity Resolution
Provides semantic embeddings for entity matching using pre-trained models
"""

import numpy as np
from sentence_transformers import SentenceTransformer
import json
import sys
import logging
from typing import List, Optional
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SentenceEncoder:
    """
    Wrapper for sentence transformer models optimized for entity resolution
    """
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the sentence encoder with a pre-trained model
        
        Args:
            model_name: Name of the sentence transformer model
        """
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        try:
            self._load_model()
            logger.info(f"Sentence encoder initialized with {model_name} on {self.device}")
        except Exception as e:
            logger.error(f"Failed to initialize sentence encoder: {e}")
            raise
    
    def _load_model(self) -> None:
        """Load the sentence transformer model"""
        self.model = SentenceTransformer(self.model_name, device=self.device)
        
        # Optimize for inference
        self.model.eval()
        if self.device == 'cuda':
            self.model.half()  # Use half precision on GPU for speed
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Encode texts into semantic embeddings
        
        Args:
            texts: List of text strings to encode
            batch_size: Batch size for processing
            
        Returns:
            numpy array of embeddings
        """
        if not self.model:
            raise RuntimeError("Model not initialized")
        
        try:
            # Clean and preprocess texts
            cleaned_texts = [self._preprocess_text(text) for text in texts]
            
            # Generate embeddings
            embeddings = self.model.encode(
                cleaned_texts,
                batch_size=batch_size,
                show_progress_bar=len(texts) > 100,
                convert_to_numpy=True,
                normalize_embeddings=True  # L2 normalization for cosine similarity
            )
            
            logger.info(f"Generated embeddings for {len(texts)} texts, shape: {embeddings.shape}")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error encoding texts: {e}")
            raise
    
    def encode_single(self, text: str) -> np.ndarray:
        """
        Encode a single text string
        
        Args:
            text: Text string to encode
            
        Returns:
            numpy array embedding
        """
        return self.encode([text])[0]
    
    def similarity(self, text1: str, text2: str) -> float:
        """
        Calculate semantic similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Cosine similarity score between 0 and 1
        """
        embeddings = self.encode([text1, text2])
        return float(np.dot(embeddings[0], embeddings[1]))
    
    def find_similar(self, query: str, candidates: List[str], top_k: int = 5) -> List[tuple]:
        """
        Find most similar texts from candidates
        
        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return
            
        Returns:
            List of (index, similarity_score) tuples
        """
        if not candidates:
            return []
        
        # Encode query and candidates
        all_texts = [query] + candidates
        embeddings = self.encode(all_texts)
        
        query_embedding = embeddings[0]
        candidate_embeddings = embeddings[1:]
        
        # Calculate similarities
        similarities = np.dot(candidate_embeddings, query_embedding)
        
        # Get top-k results
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = [(idx, float(similarities[idx])) for idx in top_indices]
        
        return results
    
    def _preprocess_text(self, text: str) -> str:
        """
        Preprocess text for better embedding quality
        
        Args:
            text: Raw text string
            
        Returns:
            Preprocessed text
        """
        if not isinstance(text, str):
            text = str(text)
        
        # Basic cleaning
        text = text.strip()
        
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Truncate if too long (BERT models have token limits)
        if len(text) > 500:
            text = text[:500]
        
        return text
    
    def get_model_info(self) -> dict:
        """
        Get information about the loaded model
        
        Returns:
            Dictionary with model information
        """
        if not self.model:
            return {"error": "Model not initialized"}
        
        return {
            "model_name": self.model_name,
            "device": self.device,
            "max_seq_length": self.model.max_seq_length,
            "embedding_dimension": self.model.get_sentence_embedding_dimension(),
            "tokenizer_vocab_size": len(self.model.tokenizer.get_vocab()) if hasattr(self.model, 'tokenizer') else None
        }


# Global encoder instance for reuse
_encoder_instance: Optional[SentenceEncoder] = None

def get_encoder(model_name: str = 'all-MiniLM-L6-v2') -> SentenceEncoder:
    """
    Get or create a global encoder instance
    
    Args:
        model_name: Name of the sentence transformer model
        
    Returns:
        SentenceEncoder instance
    """
    global _encoder_instance
    
    if _encoder_instance is None or _encoder_instance.model_name != model_name:
        _encoder_instance = SentenceEncoder(model_name)
    
    return _encoder_instance

def encode_sentences(texts: List[str], model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Convenience function to encode sentences
    
    Args:
        texts: List of text strings
        model_name: Name of the sentence transformer model
        
    Returns:
        numpy array of embeddings
    """
    encoder = get_encoder(model_name)
    return encoder.encode(texts)

def calculate_similarity_matrix(texts: List[str], model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Calculate similarity matrix for a list of texts
    
    Args:
        texts: List of text strings
        model_name: Name of the sentence transformer model
        
    Returns:
        Symmetric similarity matrix
    """
    encoder = get_encoder(model_name)
    embeddings = encoder.encode(texts)
    
    # Calculate cosine similarity matrix
    similarity_matrix = np.dot(embeddings, embeddings.T)
    
    return similarity_matrix

def find_duplicates(texts: List[str], threshold: float = 0.85, model_name: str = 'all-MiniLM-L6-v2') -> List[tuple]:
    """
    Find potential duplicates in a list of texts
    
    Args:
        texts: List of text strings
        threshold: Similarity threshold for duplicates
        model_name: Name of the sentence transformer model
        
    Returns:
        List of (index1, index2, similarity) tuples for potential duplicates
    """
    similarity_matrix = calculate_similarity_matrix(texts, model_name)
    duplicates = []
    
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            similarity = similarity_matrix[i][j]
            if similarity >= threshold:
                duplicates.append((i, j, float(similarity)))
    
    # Sort by similarity score descending
    duplicates.sort(key=lambda x: x[2], reverse=True)
    
    return duplicates

def batch_entity_similarity(entity_texts: List[str], batch_size: int = 100, model_name: str = 'all-MiniLM-L6-v2') -> np.ndarray:
    """
    Process large batches of entity texts for similarity calculation
    
    Args:
        entity_texts: List of entity text representations
        batch_size: Batch size for processing
        model_name: Name of the sentence transformer model
        
    Returns:
        Embeddings array
    """
    encoder = get_encoder(model_name)
    
    all_embeddings = []
    for i in range(0, len(entity_texts), batch_size):
        batch = entity_texts[i:i + batch_size]
        batch_embeddings = encoder.encode(batch, batch_size=min(batch_size, len(batch)))
        all_embeddings.append(batch_embeddings)
        
        logger.info(f"Processed batch {i//batch_size + 1}/{(len(entity_texts) + batch_size - 1)//batch_size}")
    
    return np.vstack(all_embeddings)


def main():
    """
    Command line interface for the sentence encoder
    """
    if len(sys.argv) < 2:
        print("Usage: python sentence_encoder.py <command> [args...]")
        print("Commands:")
        print("  encode <text1> [text2] ... - Encode texts and return embeddings")
        print("  similarity <text1> <text2> - Calculate similarity between two texts")
        print("  find_similar <query> <candidate1> [candidate2] ... - Find similar texts")
        print("  info - Show model information")
        sys.exit(1)
    
    command = sys.argv[1]
    encoder = get_encoder()
    
    try:
        if command == "encode":
            texts = sys.argv[2:]
            if not texts:
                print("Error: No texts provided")
                sys.exit(1)
            
            embeddings = encoder.encode(texts)
            print(json.dumps(embeddings.tolist()))
        
        elif command == "similarity":
            if len(sys.argv) != 4:
                print("Error: Similarity requires exactly 2 texts")
                sys.exit(1)
            
            text1, text2 = sys.argv[2], sys.argv[3]
            similarity = encoder.similarity(text1, text2)
            print(json.dumps({"similarity": similarity}))
        
        elif command == "find_similar":
            if len(sys.argv) < 4:
                print("Error: find_similar requires query and at least one candidate")
                sys.exit(1)
            
            query = sys.argv[2]
            candidates = sys.argv[3:]
            results = encoder.find_similar(query, candidates)
            print(json.dumps(results))
        
        elif command == "info":
            info = encoder.get_model_info()
            print(json.dumps(info, indent=2))
        
        else:
            print(f"Error: Unknown command '{command}'")
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Error executing command: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()