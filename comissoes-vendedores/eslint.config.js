/**
 * ESLint 9 (flat config) para o monorepo inteiro.
 * O projeto não tinha linter: erros como variável não usada, dependência
 * faltando em `useEffect` e `import` quebrado só apareciam em produção.
 */

import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
  },

  js.configs.recommended,

  // ---------- Backend (Node) ----------
  {
    files: ["backend/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off", // a API se comunica pelo terminal de propósito
      "no-unused-vars": ["error", { argsIgnorePattern: "^_|^next$", caughtErrors: "none" }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // ---------- Frontend (React) ----------
  {
    files: ["frontend/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/prop-types": "off", // o projeto não usa PropTypes
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // ---------- Configuração do Vite (roda no Node) ----------
  {
    files: ["frontend/vite.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },

  // ---------- Testes ----------
  {
    files: ["backend/tests/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["frontend/src/tests/**/*.{js,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // desliga as regras de estilo que brigam com o Prettier — sempre por último
  prettier,
];
