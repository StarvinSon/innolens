// @ts-check

module.exports = {
  extends: [
    '@innolens/eslint-config/node'
  ],
  parserOptions: {
    project: './tsconfig.json'
  },
  overrides: [{
    files: ['./legacy-src/**/*.ts'],
    rules: {
      'import/export': 'off'
    }
  }]
};
