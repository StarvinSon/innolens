// @ts-check
const { join } = require('path');

const { rules: baseTypeScriptRules } = require('eslint-config-airbnb-typescript/lib/shared');

module.exports = {
  extends: [
    '@innolens'
  ],
  env: {
    browser: true
  },
  rules: {
    'import/no-extraneous-dependencies': [
      baseTypeScriptRules['import/no-extraneous-dependencies'][0],
      {
        ...baseTypeScriptRules['import/no-extraneous-dependencies'][1],
        devDependencies: [
          ...baseTypeScriptRules['import/no-extraneous-dependencies'][1].devDependencies,
          join(__dirname, 'loaders/**')
        ]
      }
    ],
  }
};
