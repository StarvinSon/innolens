// @ts-check
const { rules: baseStyleRules } = require('eslint-config-airbnb-base/rules/style');
const { rules: baseTypeScriptRules } = require('eslint-config-airbnb-typescript/lib/shared');

module.exports = {
  extends: [
    'airbnb-typescript/base'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es2020: true
  },
  rules: {
    'class-methods-use-this': ['error', {
      exceptMethods: ['render']
    }],
    'comma-dangle': ['error', 'never'],
    'func-names': ['warn', 'as-needed'],
    'implicit-arrow-linebreak': 'off',
    'linebreak-style': 'off',
    'lines-between-class-members': ["error", "always", {
      exceptAfterSingleLine: true
    }],
    'max-classes-per-file': 'off',
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],
    'no-restricted-syntax': [
      baseStyleRules['no-restricted-syntax'][0],
      ...baseStyleRules['no-restricted-syntax']
        .slice(1)
        // @ts-ignore
        .filter(({ selector }) => selector !== 'ForOfStatement')
    ],
    'no-underscore-dangle': 'off',
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always'
    }],
    'import/no-default-export': 'error',
    'import/no-extraneous-dependencies': [
      baseTypeScriptRules['import/no-extraneous-dependencies'][0],
      {
        ...baseTypeScriptRules['import/no-extraneous-dependencies'][1],
        devDependencies: [
          ...baseTypeScriptRules['import/no-extraneous-dependencies'][1].devDependencies,
          '/loaders/**'
        ]
      }
    ],
    'import/order': ['error', {
      'newlines-between': 'always',
      // Bug: https://github.com/benmosher/eslint-plugin-import/pull/1562
      // 'alphabetize': {
      //   'order': 'asc'
      // }
    }],
    'import/prefer-default-export': 'off'
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        'no-dupe-class-members': 'off',
        '@typescript-eslint/array-type': ['error', {
          default: 'generic'
        }],
        '@typescript-eslint/explicit-function-return-type': ['error', {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        }]
      }
    }
  ],
  reportUnusedDisableDirectives: true,
  root: true
};
