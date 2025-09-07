/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../frontend/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../mobile/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@storybook/addon-interactions',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-toolbars',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    '@storybook/addon-a11y',
    '@storybook/addon-design-tokens',
    '@storybook/addon-storysource',
    '@chromatic-com/storybook'
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: './vite.config.storybook.js'
      }
    },
  },
  
  core: {
    disableTelemetry: true,
  },
  
  features: {
    buildStoriesJson: true,
    storyStoreV7: true,
  },
  
  docs: {
    autodocs: 'tag',
  },
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  
  // 静的ファイル配信
  staticDirs: ['../public', '../frontend/public', '../mobile/assets'],
  
  // ビルド設定
  viteFinal: async (config) => {
    const { mergeConfig } = await import('vite');
    return mergeConfig(config, {
      define: {
        'process.env': process.env,
      },
      resolve: {
        alias: {
          '@': '/src',
          '@frontend': '/frontend/src',
          '@mobile': '/mobile/src',
          '@components': '/src/components',
          '@utils': '/src/utils',
          '@types': '/src/types',
          '@assets': '/assets',
        },
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'styled-components'],
      },
    });
  },
  
  // WebPack設定（React Native用）
  webpackFinal: async (config) => {
    // React Native向けのalias設定
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
      'react-native-vector-icons': 'react-native-vector-icons/dist',
      'react-native-paper': 'react-native-paper/lib',
    };
    
    // React Native Web用のloader設定
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      include: /node_modules\/react-native/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react'],
          plugins: [
            'react-native-web/babel',
          ],
        },
      },
    });
    
    return config;
  },
};

export default config;