import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use /ctb/ base so assets resolve at /ctb/<student> on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: '/ctb/',
});
