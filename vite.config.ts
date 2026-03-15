
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
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY || ''),
      'process.env.AI_API_KEY': JSON.stringify(env.AI_API_KEY || ''),
      'process.env.POLZA_API_KEY': JSON.stringify(env.POLZA_API_KEY || ''),
    }
  }
})
