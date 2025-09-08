import { addons } from '@storybook/addons';
import { create } from '@storybook/theming';

// カスタムテーマ作成
const lightTheme = create({
  base: 'light',
  
  // ブランディング
  brandTitle: 'StockVision Components',
  brandUrl: 'https://stockvision.com',
  brandTarget: '_self',
  
  // 色設定
  colorPrimary: '#2196F3',
  colorSecondary: '#FF9800',
  
  // UI色設定
  appBg: '#ffffff',
  appContentBg: '#ffffff',
  appBorderColor: '#e0e0e0',
  appBorderRadius: 4,
  
  // テキスト色
  textColor: '#333333',
  textInverseColor: '#ffffff',
  textMutedColor: '#666666',
  
  // ツールバー
  barTextColor: '#333333',
  barSelectedColor: '#2196F3',
  barBg: '#ffffff',
  
  // 入力フォーム
  inputBg: '#ffffff',
  inputBorder: '#e0e0e0',
  inputTextColor: '#333333',
  inputBorderRadius: 4,
  
  // フォント設定
  fontBase: '"Roboto", "Helvetica Neue", Arial, sans-serif',
  fontCode: '"Fira Code", "Monaco", "Consolas", monospace',
});

const darkTheme = create({
  base: 'dark',
  
  // ブランディング
  brandTitle: 'StockVision Components',
  brandUrl: 'https://stockvision.com',
  brandTarget: '_self',
  
  // 色設定
  colorPrimary: '#90CAF9',
  colorSecondary: '#FFB74D',
  
  // UI色設定
  appBg: '#121212',
  appContentBg: '#1e1e1e',
  appBorderColor: '#333333',
  appBorderRadius: 4,
  
  // テキスト色
  textColor: '#ffffff',
  textInverseColor: '#000000',
  textMutedColor: '#b0b0b0',
  
  // ツールバー
  barTextColor: '#ffffff',
  barSelectedColor: '#90CAF9',
  barBg: '#1e1e1e',
  
  // 入力フォーム
  inputBg: '#2c2c2c',
  inputBorder: '#444444',
  inputTextColor: '#ffffff',
  inputBorderRadius: 4,
  
  // フォント設定
  fontBase: '"Roboto", "Helvetica Neue", Arial, sans-serif',
  fontCode: '"Fira Code", "Monaco", "Consolas", monospace',
});

// Storybookマネージャー設定
addons.setConfig({
  theme: lightTheme,
  
  // パネル設定
  panelPosition: 'bottom',
  selectedPanel: undefined,
  initialActive: 'sidebar',
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
  },
  
  // ツールバー設定
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
  
  // ナビゲーション設定
  enableShortcuts: true,
  showNav: true,
  showPanel: true,
  showToolbar: true,
});

// テーマ切り替え機能
let currentTheme = 'light';

const switchTheme = () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  addons.setConfig({
    theme: currentTheme === 'light' ? lightTheme : darkTheme,
  });
};

// カスタムツールバーアイテムの追加
addons.register('stockvision/theme-switcher', () => {
  const channel = addons.getChannel();
  
  addons.add('stockvision/theme-switcher', {
    title: 'Theme Switcher',
    type: 'tool',
    render: () => {
      const ThemeSwitcher = () => {
        const handleClick = () => {
          switchTheme();
          // テーマ変更イベントを送信
          channel.emit('DARK_MODE', currentTheme === 'dark');
        };
        
        return React.createElement('button', {
          onClick: handleClick,
          style: {
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: currentTheme === 'light' ? '#333' : '#fff',
          },
          title: `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`,
        }, [
          React.createElement('span', {
            key: 'icon',
            style: { fontSize: '14px' }
          }, currentTheme === 'light' ? '🌙' : '☀️'),
          React.createElement('span', {
            key: 'text',
            style: { fontSize: '12px' }
          }, currentTheme === 'light' ? 'Dark' : 'Light')
        ]);
      };
      
      return React.createElement(ThemeSwitcher);
    },
  });
});

// カスタムアドオンパネル
addons.register('stockvision/design-system', () => {
  addons.add('stockvision/design-system', {
    title: 'Design System',
    type: 'panel',
    render: ({ active, key }) => {
      if (!active) return null;
      
      const DesignSystemPanel = () => {
        return React.createElement('div', {
          style: {
            padding: '16px',
            height: '100%',
            overflow: 'auto',
            backgroundColor: currentTheme === 'light' ? '#ffffff' : '#1e1e1e',
            color: currentTheme === 'light' ? '#333333' : '#ffffff',
          }
        }, [
          React.createElement('h3', {
            key: 'title',
            style: { marginTop: 0, color: '#2196F3' }
          }, 'StockVision Design System'),
          
          React.createElement('div', {
            key: 'colors',
            style: { marginBottom: '24px' }
          }, [
            React.createElement('h4', { key: 'colors-title' }, 'Colors'),
            React.createElement('div', {
              key: 'color-palette',
              style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }
            }, [
              { name: 'Primary', color: '#2196F3' },
              { name: 'Secondary', color: '#FF9800' },
              { name: 'Success', color: '#4CAF50' },
              { name: 'Error', color: '#F44336' },
              { name: 'Warning', color: '#FF9800' },
              { name: 'Info', color: '#2196F3' },
            ].map(({ name, color }) => 
              React.createElement('div', {
                key: name,
                style: {
                  width: '60px',
                  height: '60px',
                  backgroundColor: color,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '10px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }
              }, name)
            ))
          ]),
          
          React.createElement('div', {
            key: 'typography',
            style: { marginBottom: '24px' }
          }, [
            React.createElement('h4', { key: 'typography-title' }, 'Typography'),
            React.createElement('div', {
              key: 'font-samples'
            }, [
              React.createElement('p', {
                key: 'h1',
                style: { fontSize: '2.5rem', fontWeight: 300, margin: '8px 0' }
              }, 'Heading 1'),
              React.createElement('p', {
                key: 'h2',
                style: { fontSize: '2rem', fontWeight: 300, margin: '8px 0' }
              }, 'Heading 2'),
              React.createElement('p', {
                key: 'body',
                style: { fontSize: '1rem', margin: '8px 0' }
              }, 'Body text - The quick brown fox jumps over the lazy dog'),
              React.createElement('p', {
                key: 'small',
                style: { fontSize: '0.875rem', color: '#666', margin: '8px 0' }
              }, 'Small text - Additional information')
            ])
          ]),
          
          React.createElement('div', {
            key: 'spacing',
            style: { marginBottom: '24px' }
          }, [
            React.createElement('h4', { key: 'spacing-title' }, 'Spacing'),
            React.createElement('div', {
              key: 'spacing-examples',
              style: { display: 'flex', gap: '8px', alignItems: 'flex-end' }
            }, [4, 8, 16, 24, 32, 48, 64].map(size =>
              React.createElement('div', {
                key: size,
                style: {
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: '#2196F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                }
              }, `${size}px`)
            ))
          ]),
          
          React.createElement('div', {
            key: 'components',
          }, [
            React.createElement('h4', { key: 'components-title' }, 'Component Guidelines'),
            React.createElement('ul', {
              key: 'guidelines',
              style: { lineHeight: 1.6 }
            }, [
              'Use consistent spacing (8px grid system)',
              'Apply proper color contrast ratios',
              'Ensure components are accessible',
              'Follow Material Design principles',
              'Support both light and dark themes',
              'Make components responsive'
            ].map((item, index) =>
              React.createElement('li', { key: index }, item)
            ))
          ])
        ]);
      };
      
      return React.createElement(DesignSystemPanel, { key });
    },
  });
});

// Component Statusアドオン
addons.register('stockvision/component-status', () => {
  addons.add('stockvision/component-status', {
    title: 'Component Status',
    type: 'panel',
    render: ({ active, key }) => {
      if (!active) return null;
      
      const ComponentStatusPanel = () => {
        const componentStatus = {
          'Button': { status: 'stable', version: '1.0.0', tests: '98%', accessibility: 'AA' },
          'Card': { status: 'stable', version: '1.2.0', tests: '95%', accessibility: 'AA' },
          'StockChart': { status: 'beta', version: '0.8.0', tests: '87%', accessibility: 'A' },
          'StockCard': { status: 'stable', version: '1.1.0', tests: '92%', accessibility: 'AA' },
          'SearchModal': { status: 'alpha', version: '0.3.0', tests: '75%', accessibility: 'A' },
          'Navigation': { status: 'stable', version: '2.0.0', tests: '99%', accessibility: 'AAA' },
        };
        
        const statusColors = {
          'stable': '#4CAF50',
          'beta': '#FF9800',
          'alpha': '#F44336',
          'deprecated': '#9E9E9E',
        };
        
        return React.createElement('div', {
          style: {
            padding: '16px',
            height: '100%',
            overflow: 'auto',
            backgroundColor: currentTheme === 'light' ? '#ffffff' : '#1e1e1e',
            color: currentTheme === 'light' ? '#333333' : '#ffffff',
          }
        }, [
          React.createElement('h3', {
            key: 'title',
            style: { marginTop: 0, color: '#2196F3' }
          }, 'Component Status Overview'),
          
          React.createElement('table', {
            key: 'status-table',
            style: {
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '16px',
            }
          }, [
            React.createElement('thead', { key: 'thead' }, [
              React.createElement('tr', {
                key: 'header',
                style: {
                  borderBottom: `1px solid ${currentTheme === 'light' ? '#e0e0e0' : '#333'}`,
                }
              }, [
                'Component',
                'Status',
                'Version',
                'Test Coverage',
                'Accessibility'
              ].map(header =>
                React.createElement('th', {
                  key: header,
                  style: {
                    padding: '8px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                  }
                }, header)
              ))
            ]),
            React.createElement('tbody', { key: 'tbody' },
              Object.entries(componentStatus).map(([name, info]) =>
                React.createElement('tr', {
                  key: name,
                  style: {
                    borderBottom: `1px solid ${currentTheme === 'light' ? '#f0f0f0' : '#2a2a2a'}`,
                  }
                }, [
                  React.createElement('td', {
                    key: 'name',
                    style: { padding: '8px', fontWeight: '500' }
                  }, name),
                  React.createElement('td', {
                    key: 'status',
                    style: { padding: '8px' }
                  }, React.createElement('span', {
                    style: {
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: statusColors[info.status],
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }
                  }, info.status)),
                  React.createElement('td', {
                    key: 'version',
                    style: { padding: '8px', fontFamily: 'monospace' }
                  }, info.version),
                  React.createElement('td', {
                    key: 'tests',
                    style: { padding: '8px' }
                  }, info.tests),
                  React.createElement('td', {
                    key: 'accessibility',
                    style: { padding: '8px' }
                  }, info.accessibility),
                ])
              )
            )
          ])
        ]);
      };
      
      return React.createElement(ComponentStatusPanel, { key });
    },
  });
});