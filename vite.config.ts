import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // 生产模式：保留 sourcemap 方便调试，但仍然压缩代码
      build: {
        minify: 'terser',
        sourcemap: 'inline',  // 生成内联 sourcemap
        terserOptions: {
          compress: {
            drop_console: false,
            drop_debugger: true
          }
        }
      }
    };
});
