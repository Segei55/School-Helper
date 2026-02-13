
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // Гарантируем, что зависимости будут собраны, а не оставлены как внешние ссылки
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react', 'recharts'],
            // ai пакет убран из чанков, так как логика переезжает в main
          }
        }
      }
    },
    define: {
      // Оставляем только публичные ключи (Google Maps/Auth - они публичные по дизайну)
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // УДАЛЕНО: OPENROUTER_API_KEY больше не передается в браузерную часть!
    }
  }
})
