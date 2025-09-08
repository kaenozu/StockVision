import type { Meta, StoryObj } from '@storybook/react';
import { 
  LoadingSpinner, 
  InlineLoadingSpinner, 
  PageLoadingOverlay, 
  LoadingSkeleton 
} from './LoadingSpinner';

const meta = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '様々なサイズと色のローディングスピナー。日本語メッセージとアクセシビリティ機能をサポート。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'スピナーのサイズ',
      table: {
        type: { summary: 'sm | md | lg | xl' },
        defaultValue: { summary: 'md' }
      }
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'white'],
      description: 'スピナーの色',
      table: {
        type: { summary: 'primary | secondary | success | error | white' },
        defaultValue: { summary: 'primary' }
      }
    },
    message: {
      control: 'text',
      description: 'ローディングメッセージ',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '読み込み中...' }
      }
    },
    showMessage: {
      control: 'boolean',
      description: 'メッセージを表示',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' }
      }
    }
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本ストーリー
export const Default: Story = {
  args: {},
};

export const WithMessage: Story = {
  args: {
    showMessage: true,
  },
};

export const CustomMessage: Story = {
  args: {
    message: 'データを取得しています...',
    showMessage: true,
  },
};

// サイズバリエーション
export const Small: Story = {
  args: {
    size: 'sm',
    showMessage: true,
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    showMessage: true,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    showMessage: true,
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    showMessage: true,
  },
};

// カラーバリエーション
export const Primary: Story = {
  args: {
    color: 'primary',
    showMessage: true,
  },
};

export const Secondary: Story = {
  args: {
    color: 'secondary',
    showMessage: true,
  },
};

export const Success: Story = {
  args: {
    color: 'success',
    showMessage: true,
  },
};

export const Error: Story = {
  args: {
    color: 'error',
    showMessage: true,
  },
};

export const White: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  args: {
    color: 'white',
    showMessage: true,
  },
};

// サイズ比較
export const SizeComparison: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-8">
      <h3 className="text-lg font-medium">Size Comparison</h3>
      <div className="flex items-center space-x-8">
        <div className="text-center space-y-2">
          <LoadingSpinner size="sm" />
          <p className="text-xs text-gray-500">Small</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingSpinner size="md" />
          <p className="text-xs text-gray-500">Medium</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-gray-500">Large</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingSpinner size="xl" />
          <p className="text-xs text-gray-500">Extra Large</p>
        </div>
      </div>
    </div>
  ),
};

// カラー比較
export const ColorComparison: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-8">
      <h3 className="text-lg font-medium">Color Comparison</h3>
      <div className="flex items-center space-x-8">
        <div className="text-center space-y-2">
          <LoadingSpinner color="primary" size="lg" />
          <p className="text-xs text-gray-500">Primary</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingSpinner color="secondary" size="lg" />
          <p className="text-xs text-gray-500">Secondary</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingSpinner color="success" size="lg" />
          <p className="text-xs text-gray-500">Success</p>
        </div>
        <div className="text-center space-y-2">
          <LoadingSpinner color="error" size="lg" />
          <p className="text-xs text-gray-500">Error</p>
        </div>
      </div>
    </div>
  ),
};

// インラインスピナー
export const InlineSpinnerExample: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Inline Spinner Examples</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <InlineLoadingSpinner size="sm" color="primary" />
          <span>小さなインラインスピナー</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <InlineLoadingSpinner size="md" color="success" />
          <span>中サイズのインラインスピナー</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <InlineLoadingSpinner size="lg" color="error" />
          <span>大きなインラインスピナー</span>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <InlineLoadingSpinner size="md" color="white" />
          <span className="text-white">ダークバックグラウンドでの使用例</span>
        </div>
      </div>
    </div>
  ),
};

// ページローディングオーバーレイ
export const PageLoadingExample: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className="relative h-96">
      <div className="p-6 text-gray-500">
        <h3 className="text-lg font-medium mb-4">Page Loading Overlay Example</h3>
        <p>下のボタンをクリックしてオーバーレイを表示/非表示</p>
      </div>
      <PageLoadingOverlay message="株価データを読み込んでいます..." />
    </div>
  ),
};

export const PageLoadingWithCustomMessage: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className="relative h-96">
      <div className="p-6 text-gray-500">
        <h3 className="text-lg font-medium mb-4">Custom Loading Message</h3>
        <p>カスタムメッセージ付きのローディングオーバーレイ</p>
      </div>
      <PageLoadingOverlay message="ウォッチリストを同期しています..." />
    </div>
  ),
};

// ローディングスケルトン
export const LoadingSkeletonExample: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Loading Skeleton Examples</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">デフォルト (3行)</h4>
          <LoadingSkeleton />
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">5行</h4>
          <LoadingSkeleton lines={5} />
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">1行</h4>
          <LoadingSkeleton lines={1} />
        </div>
      </div>
    </div>
  ),
};

// ユースケース例
export const UseCaseExamples: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-8">
      <h3 className="text-lg font-medium">Use Case Examples</h3>
      
      {/* データ取得中 */}
      <div className="border rounded-lg p-6">
        <h4 className="font-medium mb-4">データ取得中</h4>
        <LoadingSpinner size="lg" showMessage message="株価データを取得しています..." />
      </div>
      
      {/* フォーム送信中 */}
      <div className="border rounded-lg p-6">
        <h4 className="font-medium mb-4">フォーム送信中</h4>
        <div className="flex items-center space-x-2">
          <InlineLoadingSpinner size="sm" color="primary" />
          <span className="text-sm">ウォッチリストに追加しています...</span>
        </div>
      </div>
      
      {/* エラー状態のローディング */}
      <div className="border rounded-lg p-6">
        <h4 className="font-medium mb-4">エラー再試行中</h4>
        <LoadingSpinner size="md" color="error" showMessage message="再接続を試行中..." />
      </div>
      
      {/* 成功状態のローディング */}
      <div className="border rounded-lg p-6">
        <h4 className="font-medium mb-4">保存中</h4>
        <LoadingSpinner size="md" color="success" showMessage message="設定を保存しています..." />
      </div>
      
      {/* スケルトンローディング */}
      <div className="border rounded-lg p-6">
        <h4 className="font-medium mb-4">株価カード読み込み中</h4>
        <LoadingSkeleton lines={4} />
      </div>
    </div>
  ),
};