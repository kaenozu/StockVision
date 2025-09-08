// ドキュメント検索サービス
// クライアントサイドでドキュメントコンテンツを検索する

// ドキュメントの検索結果を表すインターフェース
export interface DocSearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  type: 'heading' | 'content';
  heading?: string;
}

// ドキュメントのメタデータを表すインターフェース
interface DocMetadata {
  id: string;
  title: string;
  path: string;
  content: string;
  headings: { level: number; title: string; id: string }[];
}

// ドキュメントコンテンツを取得する関数
// 実際の実装では、MarkdownファイルやAPIからコンテンツを取得する
const fetchDocContent = async (path: string): Promise<string> => {
  try {
    // 例: ローカルのMarkdownファイルをフェッチ
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching document ${path}:`, error);
    return '';
  }
};

// ドキュメントのメタデータを取得する関数
// 実際の実装では、APIや静的ファイルからメタデータを取得する
const fetchDocMetadata = async (): Promise<DocMetadata[]> => {
  // 例: 仮のメタデータ
  // 実際には、docsディレクトリ内のファイルをスキャンしてメタデータを生成する
  // または、ビルド時にメタデータを生成してJSONファイルに出力する
  
  // ここでは、既存のドキュメントファイルを想定
  const docs = [
    { id: 'api-spec', title: 'API仕様', path: '/docs/api_spec.md' },
    { id: 'architecture', title: 'アーキテクチャ', path: '/docs/architecture.md' },
    { id: 'development-guide', title: '開発ガイド', path: '/docs/development_guide.md' },
    { id: 'frontend-architecture', title: 'フロントエンドアーキテクチャ', path: '/docs/frontend_architecture.md' },
    { id: 'story-book', title: 'Storybook', path: '/docs/storybook.md' },
    { id: 'testing-guide', title: 'テストガイド', path: '/docs/testing_guide.md' },
    { id: 'cache-key-improvements', title: 'キャッシュキーの改善', path: '/docs/cache_key_improvements.md' },
    // 他のドキュメントも追加
  ];

  const metadata: DocMetadata[] = [];
  
  for (const doc of docs) {
    try {
      const content = await fetchDocContent(doc.path);
      if (content) {
        // 見出しを抽出 (簡単な正規表現を使用)
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const headings: { level: number; title: string; id: string }[] = [];
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
          const level = match[1].length;
          const title = match[2].trim();
          // IDを生成 (スペースをハイフンに置換し、小文字にする)
          const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
          headings.push({ level, title, id });
        }
        
        metadata.push({
          ...doc,
          content,
          headings
        });
      }
    } catch (error) {
      console.error(`Error processing document ${doc.path}:`, error);
    }
  }
  
  return metadata;
};

// ドキュメントコンテンツから検索結果を抽出する関数
const extractSearchResults = (
  content: string,
  query: string,
  url: string,
  title: string,
  maxSnippetLength: number = 150
): DocSearchResult[] => {
  const results: DocSearchResult[] = [];
  const normalizedQuery = query.toLowerCase();
  
  // 行単位でコンテンツを分割
  const lines = content.split('\n');
  
  // 各行をチェック
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = line.toLowerCase();
    
    if (normalizedLine.includes(normalizedQuery)) {
      // 見出し行かどうかをチェック
      const isHeading = /^#{1,6}\s+/.test(line);
      
      // クエリを含む行の前後数行を取得
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      const contextLines = lines.slice(start, end);
      
      // スニペットを生成
      let snippet = contextLines.join(' ').trim();
      if (snippet.length > maxSnippetLength) {
        // クエリの位置を見つける
        const queryIndex = snippet.toLowerCase().indexOf(normalizedQuery);
        const startIndex = Math.max(0, queryIndex - Math.floor(maxSnippetLength / 2));
        snippet = snippet.substring(startIndex, startIndex + maxSnippetLength) + '...';
      }
      
      // 見出しを取得 (現在の行または直前の見出し)
      let heading = '';
      for (let j = i; j >= 0; j--) {
        if (/^#{1,6}\s+/.test(lines[j])) {
          heading = lines[j].replace(/^#{1,6}\s+/, '').trim();
          break;
        }
      }
      
      results.push({
        id: `${url}-${i}`,
        title: isHeading ? line.replace(/^#{1,6}\s+/, '').trim() : title,
        content: snippet,
        url: isHeading ? `${url}#${line.replace(/^#{1,6}\s+/, '').trim().toLowerCase().replace(/\s+/g, '-')}` : url,
        type: isHeading ? 'heading' : 'content',
        heading: heading || undefined
      });
    }
  }
  
  return results;
};

// メインの検索関数
export const searchDocs = async (query: string): Promise<DocSearchResult[]> => {
  if (!query.trim()) {
    return [];
  }
  
  try {
    // ドキュメントのメタデータを取得
    const docs = await fetchDocMetadata();
    
    const allResults: DocSearchResult[] = [];
    
    // 各ドキュメントを検索
    for (const doc of docs) {
      const results = extractSearchResults(
        doc.content,
        query,
        doc.path,
        doc.title
      );
      
      allResults.push(...results);
    }
    
    // 結果をスコアリングしてソート (簡単な実装)
    // 実際には、より高度なスコアリングアルゴリズムを使用する
    allResults.sort((a, b) => {
      // クエリがタイトルに完全一致するものを優先
      const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase());
      const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase());
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      // 見出しタイプの結果を優先
      if (a.type === 'heading' && b.type !== 'heading') return -1;
      if (a.type !== 'heading' && b.type === 'heading') return 1;
      
      return 0;
    });
    
    // 結果数を制限
    return allResults.slice(0, 50);
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
};