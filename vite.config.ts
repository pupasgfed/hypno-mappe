import { defineConfig } from 'vite';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

function copyStaticDirs() {
  return {
    name: 'copy-static-dirs',
    writeBundle() {
      const outDir = join(process.cwd(), 'dist');
      const dirs = ['data', 'admin'];
      for (const dir of dirs) {
        const src = join(process.cwd(), dir);
        const dest = join(outDir, dir);
        if (existsSync(src)) {
          mkdirSync(outDir, { recursive: true });
          cpSync(src, dest, { recursive: true });
        }
      }
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    copyPublicDir: true,
  },
  plugins: [copyStaticDirs()],
});
