import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { validateBuildEnv } from './scripts/build-env';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') validateBuildEnv(loadEnv(mode, process.cwd()));
  return {
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 800 }
  };
});
