import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

const ignores = { ignores: ["node_modules/**", ".next/**", "out/**", "coverage/**", "next-env.d.ts"] };
const reactConfig = {
  files: ["src/**/*.{jsx,tsx}"],
  plugins: { react, "jsx-a11y": jsxA11y, "react-hooks": reactHooks },
  settings: { react: { version: "detect" } },
  rules: {
    ...react.configs.recommended.rules,
    ...jsxA11y.configs.recommended.rules,
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
  },
};

const eslintConfig = [ignores, ...tseslint.configs.recommended, reactConfig];
export default eslintConfig;
