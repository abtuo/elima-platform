import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules/**", "dist/**", "coverage/**", "public/**"]),
  {
    files: ["src/**/*.{ts,tsx}", "vite*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: "latest", globals: globals.browser },
    rules: {
      "no-control-regex": "off",
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.tsx"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["vite*.ts"],
    languageOptions: { globals: globals.node },
  },
]);
