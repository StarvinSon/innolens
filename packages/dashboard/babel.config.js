// @ts-check

/**
 * @type {import('@babel/core').ConfigFunction}
 */
module.exports = (api) => {
  api.cache.forever();

  return {
    plugins: [
      ['@babel/plugin-proposal-optional-chaining'],
      ['@babel/plugin-proposal-class-properties', {
        loose: true // Not compatible with TypeScript decorator
      }],
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
        modules: {
          'lit-html': ['html', 'svg'],
          'lit-element': ['html', 'svg']
        },
        htmlMinifier: {
          caseSensitive: true,
          collapseWhitespace: true,
          decodeEntities: true,
          html5: true,
          quoteCharacter: '"'
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
