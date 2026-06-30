import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
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
  // Regras desligadas de forma deliberada (aplicam-se a todos os arquivos):
  // - only-export-components: nicety de HMR (Fast Refresh), sem valor em produção.
  // - exhaustive-deps / set-state-in-effect: o código usa de propósito o padrão
  //   "buscar no mount" (deps vazias) e init de flags de montagem; reativar e
  //   ajustar deps caso a caso é um esforço separado. `no-unused-vars` segue
  //   estrito, que é o que pega código morto de verdade.
  {
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
