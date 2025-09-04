/**
 * Footer Component
 * 
 * Application footer with links, copyright, and additional information.
 */

import React from 'react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: 'サービス',
      links: [
        { label: '株価検索', href: '/' },
        { label: 'ウォッチリスト', href: '/watchlist' },
        { label: 'API情報', href: '/api-info' }
      ]
    },
    {
      title: 'サポート',
      links: [
        { label: 'ヘルプ', href: '/help' },
        { label: 'お問い合わせ', href: '/contact' },
        { label: 'FAQ', href: '/faq' }
      ]
    },
    {
      title: '会社情報',
      links: [
        { label: 'About', href: '/about' },
        { label: 'プライバシーポリシー', href: '/privacy' },
        { label: '利用規約', href: '/terms' }
      ]
    }
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl">📈</div>
                <h3 className="text-xl font-bold">株価チェッカー</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                リアルタイムの株価情報とチャート分析を提供する、使いやすい株価追跡ツールです。
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://github.com" 
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a 
                  href="https://twitter.com" 
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Footer Links */}
            {footerLinks.map((section, index) => (
              <div key={index}>
                <h4 className="text-lg font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a 
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-400">
              &copy; {currentYear} 株価チェッカー. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <div className="text-sm text-gray-400">
                <span className="inline-flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  APIサービス稼働中
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                最終更新: {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-800 py-4">
          <div className="text-xs text-gray-500 text-center">
            <p className="mb-2">
              ⚠️ 免責事項: このサービスで提供される株価情報は教育・情報提供目的のみです。
              投資判断は自己責任で行ってください。
            </p>
            <p>
              株式投資にはリスクが伴います。過去の実績は将来の結果を保証するものではありません。
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer