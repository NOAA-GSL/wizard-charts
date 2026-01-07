import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    mode: 'development',
    plugins: [react()],
    resolve: {
        alias: {
            'desi-charts': path.resolve('./src'),
        },
    },
    build: {
        // Disables minification of the output files
        minify: false,
        // Rebuilds the project when files change
        watch: {},
        // Specifies that the output of the build will be a library.
        lib: {
            // Defines the entry point for the library build. It resolves
            // to src/index.ts,indicating that the library starts from this file.
            entry: path.resolve(__dirname, 'src/index.js'),
            name: 'desi-charts',
            // A function that generates the output file
            // name for different formats during the build
            fileName: (format) => `desi-charts.${format}.js`,
        },
        rollupOptions: {
            // put all peer dependencies here
            external: ['react', 'react-dom', 'react/jsx-runtime', 'd3', 'lodash'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'react/jsx-runtime': 'ReactJsxRuntime',
                },
            },
        },
        // Generates sourcemaps for the built files,
        // aiding in debugging.
        sourcemap: 'inline',
        // Clears the output directory before building.
        emptyOutDir: true,
    },
});
