// @ts-check
const { resolve } = require('path');

const DartSass = require('dart-sass');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const rootPath = __dirname;
const srcPath = resolve(rootPath, 'src');
const outPath = resolve(rootPath, 'out');

/**
 * @typedef {{
 *   publicPath?: string
 * }} Arguments
 */

/**
 * @param {'development' | 'production'} env
 * @param {Arguments} args
 * @returns {import('webpack').Configuration}
 */
module.exports = (env, { publicPath = '/static' }) => {
  /** @type {import('webpack').RuleSetUse} */
  const jsUse = [
    {
      loader: 'babel-loader',
      options: {
        cwd: rootPath,
        envName: env,
        configFile: resolve(rootPath, 'babel.config.js')
      }
    }
  ];

  /** @type {import('webpack').RuleSetUse} */
  const tsUse = [
    ...jsUse,
    {
      loader: 'ts-loader',
      options: {
        configFile: resolve(rootPath, 'tsconfig.json')
      }
    }
  ];

  /** @type {import('webpack').RuleSetUse} */
  const scssUse = [
    ...jsUse,
    {
      loader: require.resolve('./loaders/lit-css-loader')
    },
    {
      loader: require.resolve('./loaders/convert-css-locals')
    },
    {
      loader: 'css-loader',
      options: {
        modules: {
          localIdentName: `${env === 'development' ? '[local]__' : ''}[sha1:hash:base64:5]`
        },
        esModule: true
      }
    },
    {
      loader: 'resolve-url-loader',
      options: {
        sourceMap: true
      }
    },
    {
      loader: 'sass-loader',
      options: {
        implementation: DartSass,
        sourceMap: true,
        sassOptions: {
          outputStyle: env === 'development' ? 'expanded' : 'compressed'
        }
      }
    }
  ];

  return {
    // Entry and Context
    context: rootPath,
    entry: {
      index: resolve(srcPath, 'index.ts')
    },

    // Mode
    mode: env,

    // Output
    output: {
      filename: '[name].js',
      path: outPath,
      publicPath
    },

    // Module
    module: {
      rules: [
        {
          include: [
            srcPath,
            resolve(rootPath, 'node_modules', 'tsyringe') // polyfill reflect metadata
          ],
          test: /\.js$/i,
          use: jsUse
        },
        {
          include: srcPath,
          test: /\.ts$/i,
          use: tsUse
        },
        {
          include: srcPath,
          test: /\.scss$/i,
          use: scssUse
        }
      ]
    },

    // Resolve
    resolve: {
      extensions: ['.js', '.ts']
    },

    // Plugins
    plugins: [
      new HtmlWebpackPlugin({
        filename: resolve(outPath, 'index.html'),
        template: resolve(srcPath, 'index.ejs'),
        inject: false,
        minify: {
          caseSensitive: true,
          collapseBooleanAttributes: true,
          collapseInlineTagWhitespace: true,
          collapseWhitespace: true,
          decodeEntities: true,
          html5: true,
          quoteCharacter: '"',
          removeComments: true
        }
      })
    ],

    // Devtool
    devtool: env === 'development' ? 'eval-source-map' : false,

    // Target
    target: 'web'
  };
};
