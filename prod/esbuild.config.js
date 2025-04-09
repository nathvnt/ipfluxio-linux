// esbuild.config.js
import { build } from 'esbuild';

build({
  entryPoints: ['frontend/renderer/index.js'],
  bundle: true,
  minify: true,
  sourcemap: false,
  outdir: 'frontend/dist',
  format: 'esm',
  target: ['chrome110'], 
  loader: {
    '.js': 'js',
  }
}).catch(() => process.exit(1));
