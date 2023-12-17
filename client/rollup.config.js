import babel from 'rollup-plugin-babel';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import {terser} from 'rollup-plugin-terser';
import autoprefixer from 'autoprefixer';
import postcss from 'rollup-plugin-postcss';
import external from 'rollup-plugin-peer-deps-external';
// so JS can be rolled with TS
// remove when JS files have been removed
import nodeResolve from '@rollup/plugin-node-resolve'

import commonjs from '@rollup/plugin-commonjs'

const extensions = ['.js', '.jsx', '.ts', '.tsx']

export default [
    {
        preserveModules: true,
        input: './src/exports.ts',
        output: [
            {
                dir: 'dist/cjs',
                format: 'cjs',
                preserveModules: true,
                preserveModulesRoot: 'src',
                exports: 'named',
            },
            {
                dir: 'dist/esm',
                format: 'es',
                preserveModules: true,
                preserveModulesRoot: 'src',
                exports: 'named',
            },
        ],
        external: [
            ...Object.keys(pkg.dependencies || {}),
            './src',
        ],
        plugins: [
            external(),
            typescript({
                typescript: require('typescript'),
                tsconfig: "./tsconfig_lib.json",
            }),
            // so JS can be rolled with TS
            // remove when JS files have been removed
            nodeResolve({
              ignoreGlobal: false,
              modulesOnly: true, // <<-- maybe this will help
              include: ['node_modules/**'],
              extensions,
              // skip: keys(EXTERNALS), // <<-- skip: ['react', 'react-dom']
            }),
            commonjs({
              ignoreGlobal: false,
              include: 'node_modules/**',
            }),
            // postcss({
            //     plugins: [
            //         require('postcss-import'),
            //         require('autoprefixer'),
            //     ],
            //     // modules: true,
            //     minimize: true,
            //     sourceMap: false,
            //     // extract: false,
            //     minimize: true,
            //     modules: true,
            //     use: {
            //         sass: null,
            //         stylus: null,
            //         less: null,
            //     }, 
            //     extract: true
            // }),
            babel({
                exclude: 'node_modules/**',
                extensions,
            }),
            postcss({
                plugins: [autoprefixer()],
                sourceMap: true,
                extract: true,
                minimize: true
            }),
            // terser() // minifies generated bundles
        ]
    }
];