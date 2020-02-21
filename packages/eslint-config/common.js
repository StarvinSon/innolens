// @ts-check
const { createExtendRule } = require('./utils');

const extendRule = createExtendRule(require('eslint-config-airbnb-typescript/base'));


module.exports = {
  extends: [
    'eslint-config-airbnb-typescript/base'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    es2020: true
  },
  rules: {
    'class-methods-use-this': 'off',
    'comma-dangle': ['error', 'never'],
    'func-names': ['warn', 'as-needed'],
    'generator-star-spacing': ['error', {
      before: false,
      after: true,
      method: {
        before: true,
        after: false
      }
    }],
    'implicit-arrow-linebreak': 'off',
    'linebreak-style': 'off',
    'lines-between-class-members': ['error', 'always', {
      exceptAfterSingleLine: true
    }],
    'max-classes-per-file': 'off',
    'no-cond-assign': ['error', 'except-parens'],
    'no-confusing-arrow': 'off',
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],
    'no-nested-ternary': 'off',
    'no-param-reassign': ['error', {
      props: false
    }],
    'no-restricted-syntax': extendRule('no-restricted-syntax', ([severity, ...opts]) => [
      severity,
      ...opts.filter(({ selector }) => selector !== 'ForOfStatement')
    ]),
    'no-return-assign': ['error', 'except-parens'],
    'no-underscore-dangle': 'off',
    'no-void': 'off',
    'operator-linebreak': [
      'error',
      'before',
      {
        'overrides': {
          '=': 'after'
        }
      }
    ],
    'padded-blocks': 'off',
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always'
    }],
    'spaced-comment': extendRule('spaced-comment', ([severity, enable, opts]) => [
      severity,
      enable,
      {
        ...opts,
        line: {
          ...opts.line,
          markers: [
            ...opts.line.markers,
            '/'
          ]
        }
      }
    ]),
    'import/no-default-export': 'error',
    'import/order': ['error', {
      'newlines-between': 'always',
      'alphabetize': {
        'order': 'asc'
      }
    }],
    'import/prefer-default-export': 'off',
    '@typescript-eslint/array-type': ['error', {
      default: 'generic'
    }],
    '@typescript-eslint/space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always'
    }],
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true
    }]
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off'
      }
    }
  ],
  reportUnusedDisableDirectives: true,
  root: true
};
