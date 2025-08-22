import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  MicrophoneIcon,
  QrCodeIcon,
  XMarkIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  showVoiceSearch?: boolean;
  showQRScanner?: boolean;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'entity' | 'case' | 'recent' | 'suggestion';
  metadata?: any;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  showVoiceSearch = false,
  showQRScanner = false,
  autoFocus = false,
  size = 'md',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Fetch search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => apiClient.getSearchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length > 2 && showSuggestions,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Voice search functionality
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      onSearch(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // QR code scanner functionality
  const startQRScanner = async () => {
    try {
      if (!('BarcodeDetector' in window)) {
        // Fallback to camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Implementation would require additional QR scanning library
        console.log('QR Scanner opened', stream);
      } else {
        const barcodeDetector = new BarcodeDetector();
        // Implementation for native barcode detection
        console.log('Native barcode detector available');
      }
    } catch (error) {
      console.error('QR Scanner error:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            relative flex items-center bg-white dark:bg-intel-800 border-2 rounded-xl transition-all duration-200
            ${sizeClasses[size]}
            ${
              isFocused
                ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                : 'border-intel-200 dark:border-intel-700 hover:border-intel-300 dark:hover:border-intel-600'
            }
          `}
        >
          {/* Search Icon */}
          <MagnifyingGlassIcon className={`${iconSizes[size]} text-intel-400 ml-4 flex-shrink-0`} />

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsFocused(false);
                setShowSuggestions(false);
              }, 200);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent px-3 py-0 text-intel-900 dark:text-white placeholder-intel-500 dark:placeholder-intel-400 focus:outline-none"
          />

          {/* Clear Button */}
          {query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              type="button"
              onClick={clearSearch}
              className="p-1 mr-2 text-intel-400 hover:text-intel-600 dark:hover:text-intel-300 transition-colors"
            >
              <XMarkIcon className={iconSizes[size]} />
            </motion.button>
          )}

          {/* Voice Search Button */}
          {showVoiceSearch && (
            <motion.button
              type="button"
              onClick={startVoiceSearch}
              disabled={isListening}
              className={`
                p-2 mr-2 rounded-lg transition-colors
                ${
                  isListening
                    ? 'bg-danger-100 dark:bg-danger-900/50 text-danger-600 dark:text-danger-400'
                    : 'text-intel-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50'
                }
              `}
            >
              <MicrophoneIcon className={iconSizes[size]} />
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-danger-500"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </motion.button>
          )}

          {/* QR Scanner Button */}
          {showQRScanner && (
            <button
              type="button"
              onClick={startQRScanner}
              className="p-2 mr-2 text-intel-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 rounded-lg transition-colors"
            >
              <QrCodeIcon className={iconSizes[size]} />
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && (query.length > 0 || suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-intel-800 border border-intel-200 dark:border-intel-700 rounded-xl shadow-xl max-h-80 overflow-y-auto z-50"
          >
            {/* Recent Searches */}
            {query.length === 0 && (
              <div className="p-4 border-b border-intel-200 dark:border-intel-700">
                <h3 className="text-sm font-medium text-intel-700 dark:text-intel-300 mb-3 flex items-center">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  Recent Searches
                </h3>
                <div className="space-y-2">
                  {['threat intelligence', 'case 2024-001', 'john doe'].map((recent, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick({ id: `recent-${index}`, text: recent, type: 'recent' })}
                      className="block w-full text-left px-3 py-2 text-sm text-intel-600 dark:text-intel-400 hover:bg-intel-50 dark:hover:bg-intel-700 rounded-lg transition-colors"
                    >
                      {recent}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            {query.length > 2 && (
              <div className="p-4">
                <h3 className="text-sm font-medium text-intel-700 dark:text-intel-300 mb-3 flex items-center">
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  Suggestions
                </h3>
                <div className="space-y-1">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-center w-full px-3 py-2 text-sm text-intel-700 dark:text-intel-300 hover:bg-intel-50 dark:hover:bg-intel-700 rounded-lg transition-colors"
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">{suggestion.text}</div>
                        {suggestion.metadata && (
                          <div className="text-xs text-intel-500 dark:text-intel-400 mt-1">
                            {suggestion.type === 'entity' && `Entity • ${suggestion.metadata.type}`}
                            {suggestion.type === 'case' && `Case • ${suggestion.metadata.status}`}
                          </div>
                        )}
                      </div>
                      <div
                        className={`
                          px-2 py-1 text-xs rounded-md
                          ${
                            suggestion.type === 'entity'
                              ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                              : suggestion.type === 'case'
                              ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                              : 'bg-intel-100 dark:bg-intel-700 text-intel-700 dark:text-intel-300'
                          }
                        `}
                      >
                        {suggestion.type}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query.length > 2 && suggestions.length === 0 && (
              <div className="p-4 text-center text-intel-500 dark:text-intel-400">
                <p className="text-sm">No suggestions found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}