// @ts-check
const { join } = require('path');
const { createExtendRule } = require('@innolens/eslint-config/utils');

const extendRule = createExtendRule(require('@innolens/eslint-config/node'));

module.exports = {
  extends: '@innolens/eslint-config/node',
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    'import/no-extraneous-dependencies': extendRule('import/no-extraneous-dependencies', ([severity, opts]) => [
      severity,
      {
        ...opts,
        devDependencies: [
          ...opts.devDependencies,
          join(__dirname, 'tools-src/**')
        ]
      }
    ])
  }
};
