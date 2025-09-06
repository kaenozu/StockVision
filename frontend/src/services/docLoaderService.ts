// ドキュメントローダーサービス
// Markdownファイルを読み込んでHTMLに変換して表示する

import { marked } from 'marked';
import { getI18n } from 'react-i18next'; // i18nインスタンスを取得

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

// ドキュメントのメタデータを表すインターフェース
export interface DocMetadata {
  id: string;
  title: string;
  path: string;
  category?: string;
  lastModified?: string;
  wordCount?: number;
  content: string;
  headings: { level: number; title: string; id: string }[];
}

// ドキュメントコンテンツを取得する関数
// 実際の実装では、MarkdownファイルやAPIからコンテンツを取得する
export const fetchDocContent = async (path: string): Promise<string> => {
  try {
    // i18nインスタンスを取得
    const i18n = getI18n();
    const currentLang = i18n?.language || 'ja'; // デフォルト言語を日本語に設定
    
    // 言語に対応したパスに変換
    // 例: /docs/api_spec.md -> /docs/ja/api_spec.md
    const localizedPath = path.replace('/docs/', `/docs/${currentLang}/`);
    
    // 相対パスまたは絶対パスでMarkdownファイルを読み込む
    // 例: /docs/ja/api_spec.md
    const response = await fetch(localizedPath);
    
    if (!response.ok) {
      // 404エラーなどの場合は、デフォルト言語（日本語）で再試行
      if (response.status === 404 && currentLang !== 'ja') {
        const fallbackPath = path.replace('/docs/', `/docs/ja/`);
        const fallbackResponse = await fetch(fallbackPath);
        if (!fallbackResponse.ok) {
          throw new Error(`Failed to fetch document: ${fallbackResponse.status}`);
        }
        return await fallbackResponse.text();
      }
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching document ${path}:`, error);
    return '';
  }
};

// ドキュメントのメタデータを取得する関数
// 実際には、APIや静的ファイルからメタデータを取得する
export const getDocMetadataById = async (path: string): Promise<DocMetadata | null> => {
  // i18nインスタンスを取得
  const i18n = getI18n();
  const currentLang = i18n?.language || 'ja'; // デフォルト言語を日本語に設定
  
  // 言語に対応したパスに変換
  const localizedPath = path.replace('/docs/', `/docs/${currentLang}/`);
  
  try {
    const content = await fetchDocContent(localizedPath);
    if (content) {
      // MarkdownをHTMLに変換
      const html = marked(content);
      
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
      
      // ドキュメントIDをパスから生成
      const id = path.replace('/docs/', '').replace('.md', '');
      
      // ドキュメントタイトルを最初の見出しから取得 (なければファイル名)
      const firstHeadingMatch = content.match(/^(#{1,6})\s+(.+)$/m);
      const title = firstHeadingMatch ? firstHeadingMatch[2].trim() : id;
      
      return {
        id,
        title,
        path: localizedPath,
        content: html,
        headings
      };
    }
  } catch (error) {
    console.error(`Error processing document ${localizedPath}:`, error);
  }
  
  return null;
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

// ドキュメントコンテンツから検索結果を抽出する関数
export const extractSearchResults = (
  content: string,
  query: string,
  url: string,
  title: string,
  maxSnippetLength: number = 150
): { id: string; title: string; content: string; url: string; type: 'heading' | 'content'; heading?: string }[] => {
  const results: { id: string; title: string; content: string; url: string; type: 'heading' | 'content'; heading?: string }[] = [];
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
export const searchDocs = async (query: string): Promise<{ id: string; title: string; content: string; url: string; type: 'heading' | 'content'; heading?: string }[]> => {
  if (!query.trim()) {
    return [];
  }
  
  try {
    // ここでは、すべてのドキュメントを検索する
    // 実際には、インデックスを作成して検索する
    
    // i18nインスタンスを取得
    const i18n = getI18n();
    const currentLang = i18n?.language || 'ja'; // デフォルト言語を日本語に設定
    
    // 言語に対応したドキュメントファイルを想定
    const docPaths = [
      `/docs/${currentLang}/api_spec.md`,
      `/docs/${currentLang}/architecture.md`,
      // 他のドキュメントも追加
    ];

    const allResults: { id: string; title: string; content: string; url: string; type: 'heading' | 'content'; heading?: string }[] = [];
    
    // 各ドキュメントを検索
    for (const path of docPaths) {
      try {
        const content = await fetchDocContent(path);
        if (content) {
          // ドキュメントURLを生成
          const url = `/docs${path.replace(`/docs/${currentLang}`, '')}`;
          
          // ドキュメントタイトルを最初の見出しから取得 (なければファイル名)
          const firstHeadingMatch = content.match(/^(#{1,6})\s+(.+)$/m);
          const title = firstHeadingMatch ? firstHeadingMatch[2].trim() : path.replace(`/docs/${currentLang}/`, '').replace('.md', '');
          
          const results = extractSearchResults(
            content,
            query,
            url,
            title
          );
          
          allResults.push(...results);
        }
      } catch (error) {
        console.error(`Error searching document ${path}:`, error);
      }
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