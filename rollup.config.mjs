import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';

const input = 'src/index.ts';

const plugins = [
  resolve(),
  esbuild({
    target: 'es2018',
    sourceMap: true,
  }),
];

export default [
  // ESM
  {
    input,
    output: {
      file: 'dist/esm/index.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins,
    external: ['rrweb'],
  },
  // CJS
  {
    input,
    output: {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    plugins,
    external: ['rrweb'],
  },
  // UMD
  {
    input,
    output: {
      file: 'dist/umd/landing-analytics.js',
      format: 'umd',
      name: 'LandingAnalytics',
      sourcemap: true,
      exports: 'named',
      globals: {
        rrweb: 'rrweb',
      },
    },
    plugins,
    external: ['rrweb'],
  },
];
