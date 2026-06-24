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
  ]),
  // ─── Project-local rule overrides ─────────────────────────────────────────
  //
  // @typescript-eslint/no-unused-vars 临时 off
  //
  // 原因：typescript-eslint v8 rule schema 跟 ESLint 9 flat config 校验不兼容
  // （详细 options 全部报"Value should NOT have additional properties"），
  // 详见 https://typescript-eslint.io/rules/no-unused-vars/ 跟 ESLint 9 schema 对接。
  //
  // 替代方案：
  // 1. 本 PR 删了 250 个未使用 import（脚本批量）
  // 2. 函数参数 / 局部变量暂不修（354 → 104）
  // 3. typescript-eslint 修复 schema 对接后开回
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
