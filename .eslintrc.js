module.exports = {
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: '2019',
    sourceType: 'module'
  },
  env: {
    node: true,
    es2017: true
  },
  reportUnusedDisableDirectives: true,
  root: true,
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts']
      }
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts']
    }
  },
  rules: {
    'comma-dangle': ['error', 'never'],
    'linebreak-style': 'off',
    'no-restricted-syntax': ['error',
      // Override eslint-config-airbnb-base to enable ForOfStatement
      // https://github.com/airbnb/javascript/blob/master/packages/eslint-config-airbnb-base/rules/style.js#L332
      {
        "selector": "ForInStatement",
        "message": "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array."
      },
      {
        "selector": "LabeledStatement",
        "message": "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand."
      },
      {
        "selector": "WithStatement",
        "message": "`with` is disallowed in strict mode because it makes code impossible to predict and optimize."
      }
    ],
    'import/order': ['error', {
      'newlines-between': 'always'
    }],
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
