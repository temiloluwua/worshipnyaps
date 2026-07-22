module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'ios',
    'android',
    'node_modules',
    'supabase',
    'scripts',
    'patches',
    'public',
    '.eslintrc.cjs',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // This codebase intentionally uses `any` for Supabase embedded-relation
    // results and third-party globals. Enforcing it would be noise, not safety.
    '@typescript-eslint/no-explicit-any': 'off',
    // Pre-existing dead code/imports are surfaced as warnings for future
    // cleanup rather than hard failures. `_`-prefixed args/vars are ignored.
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
  },
};
