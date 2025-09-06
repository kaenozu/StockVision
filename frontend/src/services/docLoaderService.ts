// ドキュメントローダーサービス
// Markdownファイルを読み込んでHTMLに変換して表示する

import { marked } from 'marked';

// ハイライト.jsをインポート
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml'; // HTMLも含まれる

// ハイライト.jsに言語を登録
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);

// markedの設定
marked.setOptions({
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: 'hljs language-', // ハイライト.jsのクラス名プレフィックス
});

// ドキュメントのメタデータ
export interface DocMetadata {
  id: string;
  title: string;
  path: string;
  category?: string;
  lastModified?: string;
  wordCount?: number;
}

// ドキュメントコンテンツを読み込む関数
export const loadDocContent = async (path: string): Promise<string> => {
  try {
    // 相対パスまたは絶対パスでMarkdownファイルを読み込む
    // 例: /docs/api_spec.md
    const response = await fetch(path);
    
    if (!response.ok) {
      // 404エラーなどの場合は、空のコンテンツを返すか、エラーページを表示
      if (response.status === 404) {
        return `# ドキュメントが見つかりません\n\n指定されたパス \`${path}\` のドキュメントが見つかりませんでした。`;
      }
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    const markdown = await response.text();
    
    // MarkdownをHTMLに変換
    const html = marked(markdown);
    
    return html;
  } catch (error) {
    console.error(`Error loading document ${path}:`, error);
    // エラーが発生した場合は、エラーメッセージをHTMLとして返す
    return `<div class="error"><h1>ドキュメントの読み込みエラー</h1><p>ドキュメントの読み込み中にエラーが発生しました: ${(error as Error).message}</p></div>`;
  }
};

// ドキュメントのメタデータを取得する関数
// 実際には、APIや静的ファイルからメタデータを取得する
export const getDocMetadata = async (): Promise<DocMetadata[]> => {
  // 仮のメタデータ
  // 実際には、docsディレクトリ内のファイルをスキャンしてメタデータを生成する
  // または、ビルド時にメタデータを生成してJSONファイルに出力する
  
  const docs: DocMetadata[] = [
    { id: 'api-spec', title: 'API仕様', path: '/docs/api_spec.md', category: 'API' },
    { id: 'architecture', title: 'アーキテクチャ', path: '/docs/architecture.md', category: '設計' },
    { id: 'development-guide', title: '開発ガイド', path: '/docs/development_guide.md', category: '開発' },
    { id: 'frontend-architecture', title: 'フロントエンドアーキテクチャ', path: '/docs/frontend_architecture.md', category: '設計' },
    { id: 'story-book', title: 'Storybook', path: '/docs/storybook.md', category: 'UI' },
    { id: 'testing-guide', title: 'テストガイド', path: '/docs/testing_guide.md', category: 'テスト' },
    { id: 'cache-key-improvements', title: 'キャッシュキーの改善', path: '/docs/cache_key_improvements.md', category: 'パフォーマンス' },
    // 他のドキュメントも追加
  ];
  
  return docs;
};

// 特定のドキュメントのメタデータを取得する関数
export const getDocMetadataById = async (id: string): Promise<DocMetadata | undefined> => {
  const docs = await getDocMetadata();
  return docs.find(doc => doc.id === id);
};

// ドキュメントの目次を生成する関数
export const generateTableOfContents = (html: string): { level: number; title: string; id: string }[] => {
  const toc: { level: number; title: string; id: string }[] = [];
  
  // HTMLから見出しを抽出
  const headingRegex = /<h([1-6])[^>]*id=["']([^"']*)["'][^>]*>(.*?)<\/h[1-6]>/gi;
  let match;
  
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2];
    const title = match[3].replace(/<[^>]*>/g, ''); // タグを削除
    
    toc.push({ level, title, id });
  }
  
  return toc;
};