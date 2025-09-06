import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next'; // i18nをインポート
import { SearchBar } from '../components/docs/SearchBar';
import { SearchResults } from '../components/docs/SearchResults';
import { TableOfContents } from '../components/docs/TableOfContents';
import { searchDocs, DocSearchResult } from '../services/docSearchService';
import { loadDocContent, getDocMetadataById, generateTableOfContents, DocMetadata } from '../services/docLoaderService';
import { FiBook, FiHome, FiChevronRight, FiMenu, FiX } from 'react-icons/fi';
import { Link, useParams, useLocation } from 'react-router-dom';

interface DocPage {
  id: string;
  title: string;
  path: string;
  category?: string;
}

const DocumentationPage: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation(['common', 'docs']); // 翻訳フックを使用
  const { '*': docPath } = useParams<{ '*': string }>();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docMetadata, setDocMetadata] = useState<DocMetadata | null>(null);
  const [tocItems, setTocItems] = useState<{ level: number; title: string; id: string }[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // ドキュメントのリスト
  const [docPages, setDocPages] = useState<DocPage[]>([]);
  
  // ページがロードされたときやURLが変更されたときにドキュメントを読み込む
  useEffect(() => {
    const loadDocument = async () => {
      if (docPath) {
        setIsLoading(true);
        setError(null);
        setDocContent('');
        setTocItems([]);
        
        try {
          // ドキュメントのメタデータを取得
          const docs = await getDocMetadataById(docPath);
          if (docs) {
            setDocMetadata(docs);
            
            // ドキュメントのコンテンツを読み込む
            const content = await loadDocContent(docs.path);
            setDocContent(content);
            
            // 目次を生成
            const toc = generateTableOfContents(content);
            setTocItems(toc);
          } else {
            setError(t('document.not_found'));
          }
        } catch (err) {
          setError(t('document.load_error'));
          console.error('Error loading document:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadDocument();
  }, [docPath, t]); // tを依存関係に追加
  
  // ドキュメントのリストを取得
  useEffect(() => {
    const loadDocList = async () => {
      try {
        // 仮のデータ
        const docsList: DocPage[] = [
          { id: 'api-spec', title: t('docs:api_spec.title'), path: '/docs/api_spec.md', category: 'API' },
          { id: 'architecture', title: t('docs:architecture.title'), path: '/docs/architecture.md', category: '設計' },
          // 他のドキュメントも追加
        ];
        setDocPages(docsList);
      } catch (err) {
        console.error('Error loading document list:', err);
      }
    };
    
    loadDocList();
  }, [t]); // tを依存関係に追加
  
  // 現在のドキュメントを取得
  const currentDoc = docPath ? docPages.find(doc => doc.path.includes(docPath)) : null;
  
  // パンくずリスト
  const breadcrumbs = [
    { title: t('common.home'), path: '/' },
    { title: t('common.documents'), path: '/docs' },
    ...(currentDoc ? [{ title: currentDoc.title, path: `/docs/${currentDoc.id}` }] : [])
  ];

  // 検索を実行
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await searchDocs(query);
      setSearchResults(results);
    } catch (err) {
      setError(t('document.search_error'));
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ページがロードされたときやURLが変更されたときに、アンカーにジャンプ
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      // ページが完全にロードされるまで待つ
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* ヘッダー */}
      <header className={`sticky top-0 z-10 border-b ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ロゴとパンくずリスト */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/docs" 
                className={`flex items-center space-x-2 ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'}`}
              >
                <FiBook className="text-xl" />
                <span className="font-semibold">{t('common.documents')}</span>
              </Link>
              
              <FiChevronRight className={`text-lg ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.path} className="flex items-center">
                      {index < breadcrumbs.length - 1 ? (
                        <>
                          <Link 
                            to={crumb.path} 
                            className={`text-sm ${
                              isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {crumb.title}
                          </Link>
                          <FiChevronRight className={`mx-2 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                        </>
                      ) : (
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {crumb.title}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
            
            {/* 検索バーとモバイルメニュー */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block w-64">
                <SearchBar 
                  onSearch={performSearch}
                  placeholder={t('document.search_placeholder')}
                />
              </div>
              
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2 rounded-md md:hidden ${
                  isDark 
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300' 
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                aria-label={t('navigation.menu')}
              >
                {isSidebarOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* サイドバー (デスクトップ) */}
          <aside className="hidden lg:block lg:w-1/4">
            <div className={`rounded-lg shadow p-6 sticky top-24 ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {t('common.documents')}
              </h2>
              
              <nav>
                <ul className="space-y-2">
                  {docPages.map((doc) => (
                    <li key={doc.id}>
                      <Link
                        to={`/docs/${doc.id}`}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                          currentDoc?.id === doc.id
                            ? isDark
                              ? 'bg-blue-900 text-blue-100'
                              : 'bg-blue-100 text-blue-900'
                            : isDark
                              ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        {doc.title}
                        {doc.category && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {doc.category}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>

          {/* メインコンテンツ */}
          <main className="lg:w-3/4">
            {/* モバイル用のオーバーレイサイドバー */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <div 
                  className={`fixed inset-y-0 left-0 w-64 p-4 transform transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                  } ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                      {t('common.documents')}
                    </h2>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className={`p-2 rounded-md ${
                        isDark 
                          ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300' 
                          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                      aria-label={t('navigation.close')}
                    >
                      <FiX className="text-xl" />
                    </button>
                  </div>
                  
                  <nav>
                    <ul className="space-y-2">
                      {docPages.map((doc) => (
                        <li key={doc.id}>
                          <Link
                            to={`/docs/${doc.id}`}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                              currentDoc?.id === doc.id
                                ? isDark
                                  ? 'bg-blue-900 text-blue-100'
                                  : 'bg-blue-100 text-blue-900'
                                : isDark
                                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            {doc.title}
                            {doc.category && (
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                              }`}>
                                {doc.category}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </div>
            )}

            {/* 検索結果 */}
            {searchQuery && (
              <div className="mb-8">
                <div className={`rounded-lg shadow mb-6 ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <SearchResults 
                    results={searchResults}
                    query={searchQuery}
                    className={isDark ? 'bg-gray-800' : 'bg-white'}
                  />
                </div>
              </div>
            )}

            {/* ドキュメントコンテンツ */}
            {!searchQuery && docPath && (
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-3/4">
                  <div className={`rounded-lg shadow p-6 ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    {isLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : error ? (
                      <div className={`p-4 rounded-md ${isDark ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'}`}>
                        <h2 className="text-xl font-bold mb-2">{t('common.error')}</h2>
                        <p>{error}</p>
                      </div>
                    ) : (
                      <article 
                        className="prose prose-lg max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: docContent }}
                      />
                    )}
                  </div>
                </div>
                
                {/* 目次サイドバー */}
                <div className="hidden lg:block lg:w-1/4">
                  <div className={`rounded-lg shadow p-6 sticky top-24 ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <h3 className={`text-md font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t('document.table_of_contents')}
                    </h3>
                    <TableOfContents items={tocItems} />
                  </div>
                </div>
              </div>
            )}

            {/* ホームページ */}
            {!searchQuery && !docPath && (
              <div className={`rounded-lg shadow p-6 ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h1 className="text-3xl font-bold mb-6">{t('document.home')}</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {docPages.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/docs/${doc.id}`}
                      className={`block p-6 rounded-lg border transition-all hover:shadow-md ${
                        isDark 
                          ? 'bg-gray-750 border-gray-700 hover:border-gray-600' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-gray-700' : 'bg-gray-200'
                        }`}>
                          <FiBook className="text-xl" />
                        </div>
                        <div>
                          <h3 className={`text-xl font-semibold mb-2 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {doc.title}
                          </h3>
                          {doc.category && (
                            <span className={`inline-block mb-2 text-xs px-2 py-1 rounded-full ${
                              isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {doc.category}
                            </span>
                          )}
                          <p className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {/* ここにドキュメントの概要を表示 */}
                            {t('document.description')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;