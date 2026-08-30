import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Código conciso: sin líneas en blanco (ni entre bloques, ni al inicio/fin de archivo).
    rules: {
      "no-multiple-empty-lines": ["error", { max: 0, maxBOF: 0, maxEOF: 0 }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Mockup de referencia standalone (Babel-en-navegador, sin build step): no es código del proyecto.
    "references/**",
  ]),
]);
export default eslintConfig;
