// @ts-check
const { resolve } = require('path');

const DartSass = require('dart-sass');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');

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
module.exports = (env, { publicPath = '/static/' }) => {

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
        configFile: resolve(rootPath, 'tsconfig-dashboard.json'),
        projectReferences: true
      }
    }
  ];

  /** @type {import('webpack').RuleSetUse} */
  const scssUse = [
    ...jsUse,
    {
      loader: require.resolve('./tools/lit-css-loader')
    },
    {
      loader: require.resolve('./tools/convert-css-locals-loader')
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

  /** @type {import('webpack').RuleSetUse} */
  const imageUse = [
    {
      loader: 'file-loader'
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
            resolve(rootPath, '../api'),
            resolve(rootPath, '../resolver')
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
        },
        {
          include: srcPath,
          test: /\.(png|svg|jpg|gif)$/i,
          use: imageUse
        }
      ]
    },

    // Resolve
    resolve: {
      extensions: ['.js', '.ts']
    },

    // Plugins
    plugins: [
      // @ts-ignore
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
        },
        favicon: resolve(srcPath, 'images/favicon.ico')
      }),
      new DefinePlugin({
        ...process.env.TIME === undefined ? {} : {
          'process.env.TIME': JSON.stringify(process.env.TIME)
        }
      })
    ],

    // Devtool
    devtool: env === 'development' ? 'eval-source-map' : false,

    // Target
    target: 'web'
  };
};
