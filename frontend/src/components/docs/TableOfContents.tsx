import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FiHash } from 'react-icons/fi';

interface TOCItem {
  level: number;
  title: string;
  id: string;
}

interface TableOfContentsProps {
  items: TOCItem[];
  className?: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ 
  items, 
  className = '' 
}) => {
  const { isDark } = useTheme();
  
  if (items.length === 0) {
    return null;
  }

  return (
    <nav 
      aria-labelledby="toc-heading"
      className={className}
    >
      <h2 
        id="toc-heading"
        className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        目次
      </h2>
      
      <ul className="space-y-1">
        {items.map((item) => {
          // インデントレベルを計算 (h1: 0, h2: 1, h3: 2, ...)
          const indentLevel = Math.max(0, item.level - 1);
          
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`
                  flex items-start py-1 text-sm transition-colors duration-150
                  ${isDark 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                  hover:underline
                `}
                style={{ paddingLeft: `${indentLevel * 1}rem` }}
              >
                <FiHash 
                  className={`
                    flex-shrink-0 mt-1 mr-2 text-xs
                    ${isDark ? 'text-gray-600' : 'text-gray-400'}
                  `} 
                />
                <span className="truncate">{item.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};