import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'migrations/**', 'node_modules/**', 'public/**', 'uploads/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['src/scripts/**/*.ts', 'src/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['database.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', process: 'readonly', require: 'readonly' },
    },
  },
  prettier,
);
