import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Pastas geradas/externas que não devem ser lintadas.
  // (worktrees aninhados, build Android/iOS do Capacitor, saídas de build)
  globalIgnores(['dist', 'dist_electron', 'dev-dist', 'android', 'ios', '.claude']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['electron/**'],
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
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none' }],
    },
  },
  // Electron main/preload/fiscal helpers run in Node (CommonJS)
  {
    files: ['electron/**/*.{js,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none' }],
    },
  },
  // TypeScript module (src/modules/ficha-tecnica and other .ts/.tsx)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none' }],
      // The ficha-tecnica module is mid-migration and uses `any` deliberately in
      // a few adapter/API boundaries; typing those properly is a separate effort.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Reconhece uso de identificadores em JSX (ex.: <motion.div>). Sem isto, o
  // core no-unused-vars marca como "não usado" um import usado só no JSX e
  // alguém acaba removendo (quebra em runtime).
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { react: reactPlugin },
    rules: { 'react/jsx-uses-vars': 'error' },
  },
  // Regras de qualidade React reativadas (faxina 02/07/2026). Padrões
  // intencionais (fetch-on-mount com deps vazias, init síncrono de estado em
  // effect de bootstrap) são anotados caso a caso com eslint-disable-next-line
  // + justificativa, em vez de desligar a regra globalmente.
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['electron/**'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-refresh/only-export-components': 'off', // nicety de HMR; contextos exportam hook+provider por design
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'error',
    },
  },
])
