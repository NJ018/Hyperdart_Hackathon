// Test-only config so the template's vite.config.js (sandbox plugin, build) stays untouched.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
});
