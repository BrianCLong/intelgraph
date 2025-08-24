#!/usr/bin/env python3
"""
Feature Extraction for Entity Resolution
Generates numerical features for entity matching
"""

import json
import sys
import logging
import numpy as np
from typing import Dict, List, Any, Tuple
import re
from difflib import SequenceMatcher
from datetime import datetime
import hashlib
import unicodedata
from collections import Counter
import Levenshtein

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FeatureExtractor:
    """
    Feature extraction for entity resolution
    """
    
    def __init__(self):
        self.feature_names = []
    
    def extract_features(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract all features for an entity pair
        
        Args:
            entity1: First entity data
            entity2: Second entity data
            
        Returns:
            Dictionary of feature names to values
        """
        features = {}
        
        # String similarity features
        features.update(self._extract_string_features(entity1, entity2))
        
        # Structural features
        features.update(self._extract_structural_features(entity1, entity2))
        
        # Temporal features
        features.update(self._extract_temporal_features(entity1, entity2))
        
        # Numerical features
        features.update(self._extract_numerical_features(entity1, entity2))
        
        # Graph features (if available)
        features.update(self._extract_graph_features(entity1, entity2))
        
        return features
    
    def _extract_string_features(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Dict[str, float]:
        """Extract string-based similarity features"""
        features = {}
        
        # Get main string fields
        name1 = self._get_entity_name(entity1)
        name2 = self._get_entity_name(entity2)
        
        desc1 = self._get_entity_description(entity1)
        desc2 = self._get_entity_description(entity2)
        
        # Name similarity features
        features['name_exact_match'] = 1.0 if name1.lower() == name2.lower() else 0.0
        features['name_levenshtein'] = self._levenshtein_similarity(name1, name2)
        features['name_jaro_winkler'] = self._jaro_winkler_similarity(name1, name2)
        features['name_cosine'] = self._cosine_similarity(name1, name2)
        features['name_jaccard'] = self._jaccard_similarity(name1, name2)
        features['name_longest_common_substring'] = self._longest_common_substring_ratio(name1, name2)
        
        # Normalized name features
        norm_name1 = self._normalize_string(name1)
        norm_name2 = self._normalize_string(name2)
        features['name_normalized_exact'] = 1.0 if norm_name1 == norm_name2 else 0.0
        features['name_normalized_levenshtein'] = self._levenshtein_similarity(norm_name1, norm_name2)
        
        # Description similarity features
        if desc1 and desc2:
            features['desc_levenshtein'] = self._levenshtein_similarity(desc1, desc2)
            features['desc_cosine'] = self._cosine_similarity(desc1, desc2)
            features['desc_jaccard'] = self._jaccard_similarity(desc1, desc2)
        else:
            features['desc_levenshtein'] = 0.0
            features['desc_cosine'] = 0.0
            features['desc_jaccard'] = 0.0
        
        # Token-based features
        tokens1 = self._tokenize(name1)
        tokens2 = self._tokenize(name2)
        features['token_overlap'] = len(set(tokens1) & set(tokens2)) / max(len(set(tokens1) | set(tokens2)), 1)
        features['token_containment'] = len(set(tokens1) & set(tokens2)) / max(len(set(tokens1)), 1)
        
        # Phonetic features
        features['soundex_match'] = 1.0 if self._soundex(name1) == self._soundex(name2) else 0.0
        
        # Length features
        features['name_length_ratio'] = min(len(name1), len(name2)) / max(len(name1), len(name2), 1)
        features['name_length_diff'] = abs(len(name1) - len(name2))
        
        return features
    
    def _extract_structural_features(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Dict[str, float]:
        """Extract structural similarity features"""
        features = {}
        
        # Entity type matching
        type1 = entity1.get('type', '').lower()
        type2 = entity2.get('type', '').lower()
        features['type_exact_match'] = 1.0 if type1 == type2 else 0.0
        
        # Field presence similarity
        fields1 = set(entity1.keys())
        fields2 = set(entity2.keys())
        features['field_jaccard'] = len(fields1 & fields2) / max(len(fields1 | fields2), 1)
        features['field_overlap'] = len(fields1 & fields2) / max(min(len(fields1), len(fields2)), 1)
        
        # Common field value similarities
        common_fields = fields1 & fields2
        if common_fields:
            similarities = []
            for field in common_fields:
                if field in ['id', 'created_at', 'updated_at']:
                    continue
                val1 = str(entity1.get(field, ''))
                val2 = str(entity2.get(field, ''))
                if val1 and val2:
                    similarities.append(self._levenshtein_similarity(val1, val2))
            
            if similarities:
                features['common_field_avg_similarity'] = np.mean(similarities)
                features['common_field_max_similarity'] = max(similarities)
                features['common_field_min_similarity'] = min(similarities)
            else:
                features['common_field_avg_similarity'] = 0.0
                features['common_field_max_similarity'] = 0.0
                features['common_field_min_similarity'] = 0.0
        else:
            features['common_field_avg_similarity'] = 0.0
            features['common_field_max_similarity'] = 0.0
            features['common_field_min_similarity'] = 0.0
        
        return features
    
    def _extract_temporal_features(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Dict[str, float]:
        """Extract temporal similarity features"""
        features = {}
        
        # Creation time similarity
        created1 = self._parse_datetime(entity1.get('created_at') or entity1.get('createdAt'))
        created2 = self._parse_datetime(entity2.get('created_at') or entity2.get('createdAt'))
        
        if created1 and created2:
            time_diff = abs((created1 - created2).total_seconds())
            features['creation_time_diff_seconds'] = time_diff
            features['creation_same_day'] = 1.0 if created1.date() == created2.date() else 0.0
            features['creation_same_hour'] = 1.0 if (
                created1.date() == created2.date() and created1.hour == created2.hour
            ) else 0.0
        else:
            features['creation_time_diff_seconds'] = float('inf')
            features['creation_same_day'] = 0.0
            features['creation_same_hour'] = 0.0
        
        # Update time similarity
        updated1 = self._parse_datetime(entity1.get('updated_at') or entity1.get('updatedAt'))
        updated2 = self._parse_datetime(entity2.get('updated_at') or entity2.get('updatedAt'))
        
        if updated1 and updated2:
            time_diff = abs((updated1 - updated2).total_seconds())
            features['update_time_diff_seconds'] = time_diff
            features['update_same_day'] = 1.0 if updated1.date() == updated2.date() else 0.0
        else:
            features['update_time_diff_seconds'] = float('inf')
            features['update_same_day'] = 0.0
        
        return features
    
    def _extract_numerical_features(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Dict[str, float]:
        """Extract numerical similarity features"""
        features = {}
        
        # Find numerical fields
        num_fields1 = {k: v for k, v in entity1.items() if isinstance(v, (int, float))}
        num_fields2 = {k: v for k, v in entity2.items() if isinstance(v, (int, float))}
        
        common_num_fields = set(num_fields1.keys()) & set(num_fields2.keys())
        
        if common_num_fields:
            ratios = []
            diffs = []
            
            for field in common_num_fields:
                val1 = num_fields1[field]
                val2 = num_fields2[field]
                
                if val1 != 0 and val2 != 0:
                    ratio = min(val1, val2) / max(val1, val2)
                    ratios.append(ratio)
                
                diffs.append(abs(val1 - val2))
            
            if ratios:
                features['numerical_avg_ratio'] = np.mean(ratios)
                features['numerical_min_ratio'] = min(ratios)
            else:
                features['numerical_avg_ratio'] = 0.0
                features['numerical_min_ratio'] = 0.0
            
            if diffs:
                features['numerical_avg_diff'] = np.mean(diffs)
                features['numerical_max_diff'] = max(diffs)
            else:
                features['numerical_avg_diff'] = 0.0
                features['numerical_max_diff'] = 0.0
        else:
            features['numerical_avg_ratio'] = 0.0
            features['numerical_min_ratio'] = 0.0
            features['numerical_avg_diff'] = 0.0
            features['numerical_max_diff'] = 0.0
        
        return features
    
    def _extract_graph_features(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> Dict[str, float]:
        """Extract graph-based similarity features"""
        features = {}
        
        # Relationship counts
        rels1 = entity1.get('relationships', [])
        rels2 = entity2.get('relationships', [])
        
        features['relationship_count_diff'] = abs(len(rels1) - len(rels2))
        features['relationship_count_ratio'] = min(len(rels1), len(rels2)) / max(len(rels1), len(rels2), 1)
        
        # Common neighbors (if relationship data includes target entities)
        neighbors1 = set()
        neighbors2 = set()
        
        if isinstance(rels1, list):
            for rel in rels1:
                if isinstance(rel, dict) and 'target' in rel:
                    neighbors1.add(rel['target'])
        
        if isinstance(rels2, list):
            for rel in rels2:
                if isinstance(rel, dict) and 'target' in rel:
                    neighbors2.add(rel['target'])
        
        common_neighbors = neighbors1 & neighbors2
        all_neighbors = neighbors1 | neighbors2
        
        features['common_neighbors'] = len(common_neighbors)
        features['neighbor_jaccard'] = len(common_neighbors) / max(len(all_neighbors), 1)
        features['neighbor_overlap'] = len(common_neighbors) / max(min(len(neighbors1), len(neighbors2)), 1)
        
        return features
    
    def _get_entity_name(self, entity: Dict[str, Any]) -> str:
        """Extract primary name/identifier from entity"""
        for field in ['name', 'title', 'label', 'identifier', 'value']:
            if field in entity and entity[field]:
                return str(entity[field])
        return str(entity.get('id', ''))
    
    def _get_entity_description(self, entity: Dict[str, Any]) -> str:
        """Extract description/content from entity"""
        for field in ['description', 'content', 'details', 'summary']:
            if field in entity and entity[field]:
                return str(entity[field])
        return ''
    
    def _normalize_string(self, s: str) -> str:
        """Normalize string for comparison"""
        if not s:
            return ''
        
        # Convert to lowercase
        s = s.lower()
        
        # Remove diacritics
        s = unicodedata.normalize('NFD', s)
        s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
        
        # Remove punctuation and extra whitespace
        s = re.sub(r'[^\w\s]', ' ', s)
        s = re.sub(r'\s+', ' ', s)
        s = s.strip()
        
        return s
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words"""
        if not text:
            return []
        
        # Simple word tokenization
        tokens = re.findall(r'\w+', text.lower())
        return tokens
    
    def _levenshtein_similarity(self, s1: str, s2: str) -> float:
        """Calculate Levenshtein similarity (0-1)"""
        if not s1 and not s2:
            return 1.0
        if not s1 or not s2:
            return 0.0
        
        distance = Levenshtein.distance(s1, s2)
        max_len = max(len(s1), len(s2))
        return 1.0 - (distance / max_len)
    
    def _jaro_winkler_similarity(self, s1: str, s2: str) -> float:
        """Calculate Jaro-Winkler similarity"""
        if not s1 and not s2:
            return 1.0
        if not s1 or not s2:
            return 0.0
        
        return Levenshtein.jaro_winkler(s1, s2)
    
    def _cosine_similarity(self, s1: str, s2: str) -> float:
        """Calculate cosine similarity of character n-grams"""
        if not s1 and not s2:
            return 1.0
        if not s1 or not s2:
            return 0.0
        
        # Character 2-grams
        ngrams1 = [s1[i:i+2] for i in range(len(s1)-1)]
        ngrams2 = [s2[i:i+2] for i in range(len(s2)-1)]
        
        if not ngrams1 and not ngrams2:
            return 1.0
        if not ngrams1 or not ngrams2:
            return 0.0
        
        # Count vectors
        count1 = Counter(ngrams1)
        count2 = Counter(ngrams2)
        
        # Calculate cosine similarity
        intersection = sum((count1 & count2).values())
        norm1 = sum(count1.values())
        norm2 = sum(count2.values())
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return intersection / (norm1 * norm2) ** 0.5
    
    def _jaccard_similarity(self, s1: str, s2: str) -> float:
        """Calculate Jaccard similarity of character sets"""
        if not s1 and not s2:
            return 1.0
        if not s1 or not s2:
            return 0.0
        
        set1 = set(s1.lower())
        set2 = set(s2.lower())
        
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        return intersection / union if union > 0 else 0.0
    
    def _longest_common_substring_ratio(self, s1: str, s2: str) -> float:
        """Calculate longest common substring ratio"""
        if not s1 and not s2:
            return 1.0
        if not s1 or not s2:
            return 0.0
        
        matcher = SequenceMatcher(None, s1, s2)
        match = matcher.find_longest_match(0, len(s1), 0, len(s2))
        
        max_len = max(len(s1), len(s2))
        return match.size / max_len if max_len > 0 else 0.0
    
    def _soundex(self, s: str) -> str:
        """Simple Soundex implementation"""
        if not s:
            return ''
        
        s = s.upper()
        if not s:
            return ''
        
        # Keep first letter
        soundex = s[0]
        
        # Mapping
        mapping = {
            'BFPV': '1',
            'CGJKQSXZ': '2',
            'DT': '3',
            'L': '4',
            'MN': '5',
            'R': '6'
        }
        
        # Convert letters to numbers
        for char in s[1:]:
            for group, code in mapping.items():
                if char in group:
                    soundex += code
                    break
        
        # Remove duplicates and pad/truncate to 4 characters
        prev = ''
        result = soundex[0]
        for char in soundex[1:]:
            if char != prev:
                result += char
                prev = char
        
        return (result + '000')[:4]
    
    def _parse_datetime(self, dt_str: str) -> datetime:
        """Parse datetime string"""
        if not dt_str:
            return None
        
        try:
            # Try different formats
            formats = [
                '%Y-%m-%dT%H:%M:%S.%fZ',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(dt_str, fmt)
                except ValueError:
                    continue
            
            # If all else fails, try parsing as timestamp
            if dt_str.isdigit():
                return datetime.fromtimestamp(int(dt_str))
            
        except Exception:
            pass
        
        return None

def main():
    """
    Command line interface for feature extraction
    """
    if len(sys.argv) != 3:
        print("Usage: python feature_extraction.py <input_file> <output_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        # Load examples
        with open(input_file, 'r') as f:
            examples = json.load(f)
        
        extractor = FeatureExtractor()
        featured_examples = []
        
        logger.info(f"Processing {len(examples)} examples...")
        
        for i, example in enumerate(examples):
            entity1 = example.get('entity1', {})
            entity2 = example.get('entity2', {})
            
            # Extract features
            features = extractor.extract_features(entity1, entity2)
            
            # Add to example
            featured_example = {**example, 'features': features}
            featured_examples.append(featured_example)
            
            if (i + 1) % 100 == 0:
                logger.info(f"Processed {i + 1}/{len(examples)} examples")
        
        # Save featured examples
        with open(output_file, 'w') as f:
            json.dump(featured_examples, f, indent=2)
        
        logger.info(f"Feature extraction completed. Output saved to: {output_file}")
        logger.info(f"Generated {len(features)} features per example")
        
    except Exception as e:
        logger.error(f"Feature extraction failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()