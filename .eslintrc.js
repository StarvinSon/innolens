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
    'linebreak-style': 'off',
    'comma-dangle': ['error', 'never'],
    'import/order': ['error', {
      'newlines-between': 'always'
    }],
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
