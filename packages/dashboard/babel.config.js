// @ts-check

/**
 * @type {import('@babel/core').ConfigFunction}
 */
module.exports = (api) => {
  api.cache.forever();

  return {
    plugins: [
      ['@babel/plugin-proposal-optional-chaining'],
      ['@babel/plugin-proposal-class-properties'],
      ['@babel/plugin-transform-runtime', {
        corejs: {
          version: 3,
          proposals: true
        },
        helpers: true,
        regenerator: true,
        useESModules: true
      }],
      ['babel-plugin-template-html-minifier', {
        htmlMinifier: {
          caseSensitive: true,
          collapseWhitespace: true,
          decodeEntities: true,
          html5: true,
          quoteCharacter: '"'
        },
        modules: {
          'lit-html': ['html'],
          'lit-element': ['html']
        }
      }]
    ],
    presets: [
      ['@babel/preset-env', {
        modules: false,
        useBuiltIns: 'usage',
        corejs: {
          version: 3,
          proposals: true
        },
        configPath: __dirname
      }]
    ],
    sourceMaps: true
  };
};
