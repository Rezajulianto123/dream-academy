import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Auto-load .env if available
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
  try {
    (process as any).loadEnvFile(envPath);
  } catch (e) {
    // ignore
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

