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
    eqeqeq: 'warn',
    curly: ['warn', 'all'],
    'prefer-arrow-callback': ['off'],
    'no-console': ['warn'], // use the provided Homebridge log method instead
    'comma-spacing': ['error'],

    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        // not available yet?
        // destructuredArrayIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-this-alias': ['error', { allowedNames: ['self'] }],
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
