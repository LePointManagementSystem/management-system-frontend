import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// TanStack Router Vite plugin removed.
// The generated route tree is already in src/routeTree.gen.ts,
// so the plugin is not required for the app to run.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
