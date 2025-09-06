import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiSearch, FiX } from 'react-icons/fi';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'ドキュメントを検索...',
  className = ''
}) => {
  const { isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESCキーで検索をクリア
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  // クエリが変更されたら即座に検索を実行
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query.trim());
    }, 300); // 300msのデバウンス

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <form 
      onSubmit={handleSubmit}
      className={`relative flex items-center ${className}`}
    >
      <div className={`
        relative flex items-center w-full transition-all duration-200
        ${isFocused ? 'ring-2 ring-blue-500' : ''}
        ${isDark 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-300'
        }
        border rounded-lg
      `}>
        <FiSearch className={`
          absolute left-3 text-lg pointer-events-none
          ${isDark ? 'text-gray-400' : 'text-gray-500'}
        `} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full pl-10 pr-10 py-2 border-0 rounded-lg outline-none
            ${isDark 
              ? 'bg-gray-800 text-white placeholder-gray-500' 
              : 'bg-white text-gray-900 placeholder-gray-400'
            }
          `}
          aria-label="ドキュメント検索"
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              absolute right-3 p-1 rounded-full
              ${isDark 
                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300' 
                : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }
            `}
            aria-label="検索をクリア"
          >
            <FiX className="text-lg" />
          </button>
        )}
      </div>
    </form>
  );
};