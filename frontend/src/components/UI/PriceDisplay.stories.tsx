import type { Meta, StoryObj } from '@storybook/react';
import { 
  PriceDisplay, 
  SimplePriceDisplay, 
  PriceWithChange, 
  CompactPriceDisplay, 
  HighlightedPrice 
} from './PriceDisplay';

const meta = {
  title: 'UI/PriceDisplay',
  component: PriceDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '価格表示コンポーネント。多様な形式での価格表示、価格変動の表示、アクセシビリティ機能をサポート。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    price: {
      control: { type: 'number' },
      description: '表示する価格',
      table: {
        type: { summary: 'number' }
      }
    },
    previousPrice: {
      control: { type: 'number' },
      description: '前回の価格（変動計算用）',
      table: {
        type: { summary: 'number' }
      }
    },
    currency: {
      control: { type: 'select' },
      options: ['JPY', 'USD', 'EUR'],
      description: '通貨',
      table: {
        type: { summary: 'JPY | USD | EUR' },
        defaultValue: { summary: 'JPY' }
      }
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: '表示サイズ',
      table: {
        type: { summary: 'xs | sm | md | lg | xl' },
        defaultValue: { summary: 'md' }
      }
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'compact', 'detailed'],
      description: '表示スタイル',
      table: {
        type: { summary: 'default | compact | detailed' },
        defaultValue: { summary: 'default' }
      }
    },
    showCurrency: {
      control: 'boolean',
      description: '通貨記号を表示',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' }
      }
    },
    showChange: {
      control: 'boolean',
      description: '価格変動を表示',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' }
      }
    },
    showChangePercent: {
      control: 'boolean',
      description: '変動率を表示',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' }
      }
    },
    animate: {
      control: 'boolean',
      description: 'アニメーション有効',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' }
      }
    },
    highlight: {
      control: 'boolean',
      description: 'ハイライト表示',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' }
      }
    }
  },
} satisfies Meta<typeof PriceDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な価格表示
export const Default: Story = {
  args: {
    price: 1500,
    currency: 'JPY'
  },
};

export const WithoutCurrency: Story = {
  args: {
    price: 1500,
    showCurrency: false
  },
};

// 通貨バリエーション
export const JPY: Story = {
  args: {
    price: 1500,
    currency: 'JPY'
  },
};

export const USD: Story = {
  args: {
    price: 150.25,
    currency: 'USD'
  },
};

export const EUR: Story = {
  args: {
    price: 125.75,
    currency: 'EUR'
  },
};

// サイズバリエーション
export const ExtraSmall: Story = {
  args: {
    price: 1500,
    size: 'xs'
  },
};

export const Small: Story = {
  args: {
    price: 1500,
    size: 'sm'
  },
};

export const Medium: Story = {
  args: {
    price: 1500,
    size: 'md'
  },
};

export const Large: Story = {
  args: {
    price: 1500,
    size: 'lg'
  },
};

export const ExtraLarge: Story = {
  args: {
    price: 1500,
    size: 'xl'
  },
};

// 価格変動表示
export const PriceIncrease: Story = {
  args: {
    price: 1650,
    previousPrice: 1500,
    showChange: true,
    showChangePercent: true
  },
};

export const PriceDecrease: Story = {
  args: {
    price: 1350,
    previousPrice: 1500,
    showChange: true,
    showChangePercent: true
  },
};

export const PriceNoChange: Story = {
  args: {
    price: 1500,
    previousPrice: 1500,
    showChange: true,
    showChangePercent: true
  },
};

// 変動率のみ表示
export const PercentageOnly: Story = {
  args: {
    price: 1650,
    previousPrice: 1500,
    showChange: false,
    showChangePercent: true
  },
};

// バリエーション
export const CompactVariant: Story = {
  args: {
    price: 1500,
    variant: 'compact'
  },
};

export const DetailedVariant: Story = {
  args: {
    price: 1650,
    previousPrice: 1500,
    variant: 'detailed',
    showChange: true,
    showChangePercent: true
  },
};

// ハイライト表示
export const Highlighted: Story = {
  args: {
    price: 1650,
    previousPrice: 1500,
    highlight: true,
    showChange: true,
    showChangePercent: true
  },
};

// 複合例
export const AllSizesShowcase: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">サイズバリエーション</h3>
        <div className="flex items-center space-x-4">
          <PriceDisplay price={1500} size="xs" />
          <PriceDisplay price={1500} size="sm" />
          <PriceDisplay price={1500} size="md" />
          <PriceDisplay price={1500} size="lg" />
          <PriceDisplay price={1500} size="xl" />
        </div>
      </div>
    </div>
  ),
};

export const CurrencyShowcase: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">通貨バリエーション</h3>
        <div className="flex items-center space-x-4">
          <PriceDisplay price={1500} currency="JPY" />
          <PriceDisplay price={150.25} currency="USD" />
          <PriceDisplay price={125.75} currency="EUR" />
        </div>
      </div>
    </div>
  ),
};

export const ChangeShowcase: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">価格変動表示</h3>
        <div className="flex items-center space-x-6">
          <PriceDisplay 
            price={1650} 
            previousPrice={1500} 
            showChange={true} 
            showChangePercent={true} 
            size="lg"
          />
          <PriceDisplay 
            price={1350} 
            previousPrice={1500} 
            showChange={true} 
            showChangePercent={true} 
            size="lg"
          />
          <PriceDisplay 
            price={1500} 
            previousPrice={1500} 
            showChange={true} 
            showChangePercent={true} 
            size="lg"
          />
        </div>
      </div>
    </div>
  ),
};

// プリセットコンポーネント
export const SimplePriceDisplayExample: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Simple Price Display</h3>
      <div className="flex items-center space-x-4">
        <SimplePriceDisplay price={1500} />
        <SimplePriceDisplay price={150.25} currency="USD" />
        <SimplePriceDisplay price={125.75} currency="EUR" size="lg" />
      </div>
    </div>
  ),
};

export const PriceWithChangeExample: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Price With Change</h3>
      <div className="flex items-center space-x-6">
        <PriceWithChange price={1650} previousPrice={1500} />
        <PriceWithChange price={1350} previousPrice={1500} />
        <PriceWithChange price={150.25} previousPrice={145.50} currency="USD" />
      </div>
    </div>
  ),
};

export const CompactPriceDisplayExample: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Compact Price Display</h3>
      <div className="flex items-center space-x-4">
        <CompactPriceDisplay price={1500} />
        <CompactPriceDisplay price={1650} previousPrice={1500} />
        <CompactPriceDisplay price={1350} previousPrice={1500} />
      </div>
    </div>
  ),
};

export const HighlightedPriceExample: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Highlighted Price</h3>
      <div className="flex items-center space-x-6">
        <HighlightedPrice price={1650} previousPrice={1500} />
        <HighlightedPrice price={1350} previousPrice={1500} />
        <HighlightedPrice price={150.25} previousPrice={145.50} currency="USD" />
      </div>
    </div>
  ),
};

export const ComplexExample: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4">株価ダッシュボード例</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">日経平均株価</div>
            <HighlightedPrice 
              price={32500} 
              previousPrice={32150} 
              size="xl" 
            />
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">S&P 500</div>
            <HighlightedPrice 
              price={4285.50} 
              previousPrice={4320.75} 
              currency="USD" 
              size="xl" 
            />
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">DAX</div>
            <HighlightedPrice 
              price={15825.25} 
              previousPrice={15750.00} 
              currency="EUR" 
              size="xl" 
            />
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-4">個別銘柄</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">トヨタ自動車 (7203)</span>
            <PriceWithChange price={2850} previousPrice={2790} />
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">ソフトバンクグループ (9984)</span>
            <PriceWithChange price={8950} previousPrice={9120} />
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">任天堂 (7974)</span>
            <PriceWithChange price={5680} previousPrice={5680} />
          </div>
        </div>
      </div>
    </div>
  ),
};