import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@frontend': resolve(__dirname, './frontend/src'),
      '@mobile': resolve(__dirname, './mobile/src'),
      '@components': resolve(__dirname, './src/components'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@assets': resolve(__dirname, './assets'),
      '@storybook': resolve(__dirname, './.storybook'),
      'react-native$': 'react-native-web',
      'react-native-vector-icons': 'react-native-vector-icons/dist',
      'react-native-paper': 'react-native-paper/lib',
    },
  },
  
  define: {
    global: 'globalThis',
    'process.env': process.env,
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'react-native-web',
      'react-native-paper',
      '@reduxjs/toolkit',
      'react-redux',
    ],
  },
  
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  
  server: {
    fs: {
      allow: ['..'],
    },
  },
});