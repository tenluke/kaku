import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';
import packageJson from './package.json' with { type: 'json' };

// Two builds from the same code (see README.md):
// - `npm run build`        → dist/        the website (kanji strokes load per JLPT level)
// - `npm run build:single` → dist-single/ one self-contained index.html that works offline,
//   opened straight from disk: every script, style and all character data inlined.
export default defineConfig(({ mode }) => {
  const singleFile = mode === 'single';
  return {
    // Relative paths, so the build works both on GitHub Pages (under /kaku/)
    // and when opened from disk.
    base: './',
    plugins: singleFile ? [viteSingleFile()] : [],
    // The version in package.json is the only place the app's version is written. Vite puts it
    // into the code wherever __APP_VERSION__ appears (see src/ui/version.ts).
    define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
    build: {
      outDir: singleFile ? 'dist-single' : 'dist',
      // The N1 kanji stroke data alone is about 1.2 MB. On the website it is loaded only when
      // N1 is practised; in the single file everything is inside by design.
      chunkSizeWarningLimit: singleFile ? 4000 : 1300,
      // In the single file even images (the logo, the home-screen icon) must be inside it.
      // (Only images imported from code are inlined; see src/ui/icons.ts.)
      ...(singleFile ? { assetsInlineLimit: () => true } : {}),
    },
    test: {
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  };
});
