import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
  globalIgnores(["node_modules/**"]),
  {
    files: ["api/**/*.mjs", "server/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "no-control-regex": "off",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-useless-assignment": "warn"
    }
  }
]);
