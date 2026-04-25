import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "types/**",
  ]),
  {
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["app/**", "components/**", "hooks/**", "lib/**"],
      "boundaries/elements": [
        { type: "app",        pattern: "app/**" },
        { type: "components", pattern: "components/**" },
        { type: "hooks",      pattern: "hooks/**" },
        { type: "lib",        pattern: "lib/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", {
        default: "disallow",
        rules: [
          { from: { type: "lib" },        allow: { to: { type: ["lib"] } } },
          { from: { type: "hooks" },      allow: { to: { type: ["lib", "hooks"] } } },
          { from: { type: "components" }, allow: { to: { type: ["lib", "hooks", "components"] } } },
          { from: { type: "app" },        allow: { to: { type: ["lib", "hooks", "components", "app"] } } },
        ],
      }],
    },
  },
]);

export default eslintConfig;
