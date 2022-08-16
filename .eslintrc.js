// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier', 'import'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
  },
  ignorePatterns: ['dist'],
  rules: {
    quotes: ['warn', 'single'],
    indent: ['warn', 2, { SwitchCase: 1 }],
    semi: ['off'],
    'comma-dangle': ['warn', 'always-multiline'],
    'dot-notation': 'off',
    eqeqeq: 'warn',
    curly: ['warn', 'all'],
    'brace-style': ['warn'],
    'prefer-arrow-callback': ['warn'],
    'no-console': ['warn'], // use the provided Homebridge log method instead
    'no-non-null-assertion': ['off'],
    'comma-spacing': ['error'],
    'no-multi-spaces': ['warn', { ignoreEOLComments: true }],
    'no-trailing-spaces': ['warn'],
    'lines-between-class-members': [
      'warn',
      'always',
      { exceptAfterSingleLine: true },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/semi': ['warn'],
    '@typescript-eslint/member-delimiter-style': ['warn'],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx', '.mjs'],
    },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json'],
      },
    },
  },
};

module.exports = config;
