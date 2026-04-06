import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['@stripe/stripe-js', '@stripe/react-stripe-js']
  },
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    open: true,
    port: 5173,
    host: true
  }
})
