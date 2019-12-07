module.exports = {
  extends: [
    'airbnb-typescript/base'
  ],
  parserOptions: {
    ecmaVersion: '2020',
    sourceType: 'module'
  },
  env: {
    node: true,
    es2020: true
  },
  reportUnusedDisableDirectives: true,
  root: true,
  rules: {
    'comma-dangle': ['error', 'never'],
    'func-names': ['error', 'as-needed'],
    'generator-star-spacing': [
      'error',
      {
        before: false,
        after: true,
        method: {
          before: true,
          after: false
        }
      }
    ],
    'implicit-arrow-linebreak': 'off',
    'linebreak-style': 'off',
    'no-restricted-syntax': ['error',
      // Override eslint-config-airbnb-base to enable ForOfStatement
      // https://github.com/airbnb/javascript/blob/master/packages/eslint-config-airbnb-base/rules/style.js#L332
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.'
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.'
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.'
      }
    ],
    'no-underscore-dangle': 'off',
    'import/no-default-export': 'error',
    'import/order': ['error', {
      'newlines-between': 'always'
    }],
    'import/prefer-default-export': 'off',
    '@typescript-eslint/array-type': ['error', {
      default: 'generic'
    }],
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
    }]
  }
};
