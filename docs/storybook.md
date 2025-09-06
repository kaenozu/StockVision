# Storybook (コンポーネントカタログ)

Storybookは、UIコンポーネントを独立した環境で開発、テスト、ドキュメント化するためのツールです。StockVisionでは、コンポーネントの動作確認やデザインシステムの定義、他の開発者へのコンポーネントの使い方の説明に使用しています。

## Storybookの起動

Storybookをローカルで起動するには、以下のコマンドを実行します。

```bash
cd frontend
npm run storybook
```

ブラウザで `http://localhost:6006` にアクセスすると、Storybookのインターフェースが表示されます。

## Storybookの構造

Storybookには、以下の主要なセクションがあります。

- **Stories**: 各コンポーネントの異なる状態やバリエーションを表示します。
- **Docs**: コンポーネントのプロパティ、使用方法、ベストプラクティスなどのドキュメントを表示します。
- **Accessibility**: axe-coreを使用してコンポーネントのアクセシビリティをチェックします。
- **Interactions**: コンポーネントとのインタラクションをテストします。

## コンポーネントのドキュメント化

新しいコンポーネントを作成する際は、対応する `.stories.tsx` ファイルも作成し、Storybookに登録します。

### Storiesファイルの作成

コンポーネントと同じディレクトリに、`コンポーネント名.stories.tsx` というファイルを作成します。

例: `Button.tsx` に対応する `Button.stories.tsx`

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

// メタデータを定義
const meta: Meta<typeof Button> = {
  title: 'UI/Button', // Storybook内でのカテゴリとコンポーネント名
  component: Button,
  parameters: {
    layout: 'centered', // コンポーネントを中央に配置
  },
  tags: ['autodocs'], // 自動でドキュメントを生成
  argTypes: {
    // プロパティのコントロールを定義
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'outline', 'ghost', 'link'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なストーリー
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
};

// 複数のストーリーを定義して、コンポーネントのさまざまな状態を表示
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
};
```

### プロパティのドキュメント

コンポーネントのプロパティは、JSDocコメントを使用してドキュメント化します。

```typescript
// Button.tsx
interface ButtonProps {
  /** ボタンの種類 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  /** ボタンのサイズ */
  size?: 'sm' | 'md' | 'lg';
  /** ボタンの内容 */
  children: React.ReactNode;
  /** ボタンがローディング中かどうか */
  loading?: boolean;
  /** ボタンが無効かどうか */
  disabled?: boolean;
  /** ボタンが全幅かどうか */
  fullWidth?: boolean;
  /** ボタンクリック時のコールバック関数 */
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  ...props
}) => {
  // コンポーネントの実装
};
```

## ベストプラクティス

- **すべての主要なコンポーネントにStoriesを作成する**: 新しいコンポーネントを作成するたびに、対応するStoriesファイルを作成します。
- **重要な状態やバリエーションをカバーする**: デフォルト状態、ローディング状態、エラー状態、異なるプロパティの組み合わせなど、コンポーネントのすべての重要な状態をStoriesとして作成します。
- **クリアで説明的なストーリー名を使用する**: ストーリー名は、コンポーネントの状態やバリエーションを明確に示すものにします。
- **プロパティのドキュメントを維持する**: コンポーネントのプロパティが変更された場合は、StoriesファイルとJSDocコメントも同時に更新します。
- **アクセシビリティを考慮する**: Storiesを作成する際は、アクセシビリティのチェックも行い、問題がないことを確認します。