import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent skills are vendored tooling, not application source.
    ".agents/**",
    ".cursor/**",
    ".opencode/**",
    // shadcn-managed primitives are consumed as generated source.
    "components/ui/**",
    // Legacy seed data is a standalone array literal, not executable source.
    "prisma/ingredients.ts",
  ]),
  {
    rules: {
      // Draft state is intentionally reset from props when dialogs and editors open.
      "react-hooks/set-state-in-effect": "off",
      // React Hook Form's watch API is safe here but intentionally not compiler-memoized.
      "react-hooks/incompatible-library": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "lib/tests/setup.component.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
