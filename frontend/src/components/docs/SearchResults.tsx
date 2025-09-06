import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiFileText, FiHash } from 'react-icons/fi';

interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  url: string;
  type: 'heading' | 'content';
  heading?: string; // 親の見出し
}

interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
  onResultClick?: (url: string) => void;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  results, 
  query,
  onResultClick,
  className = ''
}) => {
  const { isDark } = useTheme();
  
  if (results.length === 0) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
          "{query}" に一致する結果が見つかりませんでした。
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg overflow-hidden ${className}`}>
      <div className={`
        px-4 py-2 text-sm font-medium border-b
        ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}
      `}>
        検索結果: {results.length} 件
      </div>
      
      <div className={`
        max-h-96 overflow-y-auto
        ${isDark ? 'bg-gray-900' : 'bg-white'}
      `}>
        {results.map((result) => (
          <a
            key={result.id}
            href={result.url}
            onClick={(e) => {
              e.preventDefault();
              onResultClick?.(result.url);
            }}
            className={`
              block p-4 border-b transition-colors duration-150
              ${isDark 
                ? 'border-gray-800 hover:bg-gray-800' 
                : 'border-gray-100 hover:bg-gray-50'
              }
              ${isDark ? 'focus:ring-2 focus:ring-blue-500 focus:outline-none' : ''}
            `}
          >
            <div className="flex items-start">
              <div className={`
                mt-1 mr-3 flex-shrink-0
                ${isDark ? 'text-blue-400' : 'text-blue-500'}
              `}>
                {result.type === 'heading' ? (
                  <FiHash className="text-lg" />
                ) : (
                  <FiFileText className="text-lg" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                {result.heading && (
                  <div className={`
                    text-xs font-medium truncate mb-1
                    ${isDark ? 'text-gray-500' : 'text-gray-400'}
                  `}>
                    {result.heading}
                  </div>
                )}
                
                <h3 className={`
                  text-sm font-medium truncate mb-1
                  ${isDark ? 'text-white' : 'text-gray-900'}
                `}>
                  {result.title}
                </h3>
                
                <p className={`
                  text-xs line-clamp-2
                  ${isDark ? 'text-gray-400' : 'text-gray-600'}
                `}>
                  {result.content}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}