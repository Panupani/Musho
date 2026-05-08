import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3'))
            return 'recharts-vendor';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router'))
            return 'react-vendor';
          if (id.includes('node_modules/date-fns'))
            return 'date-vendor';
          if (id.includes('node_modules/@supabase'))
            return 'supabase-vendor';
        },
      },
    },
  },
})
