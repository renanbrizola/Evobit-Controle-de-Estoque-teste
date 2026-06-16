import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist_electron']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // varsIgnorePattern/argsIgnorePattern: identificadores em MAIÚSCULA ou com _
      // (componentes React usados em JSX, ex.: `icon: Icon`) são intencionalmente ignorados,
      // já que o config não inclui eslint-plugin-react (jsx-uses-vars).
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Node / CommonJS files (processo principal do Electron, integração fiscal)
  {
    files: ['electron/**/*.{js,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
      parserOptions: {
        sourceType: 'commonjs',
      },
    },
  },
])
