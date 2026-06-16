import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // 确保这是根路径
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {

      proxy: {
        // 1. 映射 /student/api → http://127.0.0.1:8000/
        //    /student/api/foo/bar  → http://127.0.0.1:8000/foo/bar
        '/student/api': {
          target: 'http://127.0.0.1:8000/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/student\/api/, ''),
        },

        // 2. 映射 /api → http://127.0.0.1:8000
        //    /api/foo/bar → http://127.0.0.1:8000/foo/bar
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
  }
})
