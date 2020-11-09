import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

export default {
	input: 'src/index.ts',
	output: [
		{
			format: 'esm',
			dir: 'dist/esm',
			entryFileNames: '[name].js',
			chunkFileNames: '[name].js',
			preserveModules: true,
			sourcemap: false,
		},
		{
			format: 'cjs',
			dir: 'dist/cjs',
			entryFileNames: '[name].js',
			chunkFileNames: '[name].js',
			preserveModules: true,
			sourcemap: false,
		},
	],
	external: [
		...require('module').builtinModules,
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.peerDependencies || {}),
	],
	plugins: [
		resolve(),
		typescript({
			useTsconfigDeclarationDir: true,
		}),
	],
};
