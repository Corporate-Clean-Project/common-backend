/**
 * Custom esbuild configuration for Cloudflare Workers.
 *
 * Uses platform:'node' for correct CJS→ESM interop (fixes mongoose, iconv-lite).
 * Injects a `require` shim via banner so that dynamic require() calls for
 * Node.js built-ins (path, fs, etc.) resolve through the Workers runtime
 * instead of throwing "Dynamic require of X is not supported".
 */
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['src/worker.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/worker.mjs',
  platform: 'node',
  target: 'esnext',
  minify: false,
  // Swap packages that use forbidden APIs or unsupported Node.js modules
  alias: {
    'depd': './src/shims/depd.js',   // uses new Function() — forbidden in Workers
    'tty': './src/shims/tty.js',     // node:tty not supported in Workers
  },
  banner: {
    js: [
      // Provide a real require() function so esbuild's __require shim delegates to it
      // instead of throwing "Dynamic require of X is not supported"
      `import { createRequire as __workerCreateRequire } from 'node:module';`,
      `var require = __workerCreateRequire(import.meta.url || 'file:///worker.js');`,
    ].join('\n'),
  },
});

console.log('✅ Build complete → dist/worker.mjs');
