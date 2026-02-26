import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // Этот плагин автоматически добавляет поддержку Buffer и stream для Web3
    nodePolyfills(),
  ],
  define: {
    // Жестко указываем Vite, что серверная переменная global - это объект window в браузере
    global: 'window',
  }
})