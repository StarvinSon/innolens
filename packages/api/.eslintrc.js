// @ts-check

module.exports = {
  extends: [
    '@innolens/eslint-config/node'
  ],
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    'import/export': 'off'
  }
};
