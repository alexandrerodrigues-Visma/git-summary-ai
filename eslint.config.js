import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript recommended rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // Code quality
      'no-console': 'off', // CLI tool needs console output
      'no-debugger': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'multi-line'], // Require braces for multi-line only
      'no-throw-literal': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'releases/**', 'coverage/**', 'tests/**', '*.config.js', '*.config.ts', '**/*.test.ts', '**/*.spec.ts'],
  },
];
