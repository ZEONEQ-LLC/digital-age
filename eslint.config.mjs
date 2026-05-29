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
    // Mockup files from Anthropic design handoff — visual reference only, not part of the app build.
    "_design-handoff/**",
    // Tiptap CLI-generated source-as-package UI components (MIT-licensed
    // upstream code). Wir behandeln das wie Vendor-Code — keine Edits, kein
    // Lint-Drift gegenüber Upstream. Sobald wir hier Anpassungen machen,
    // wandern die Files raus aus dem Ignore.
    "src/components/tiptap-icons/**",
    "src/components/tiptap-node/**",
    "src/components/tiptap-templates/**",
    "src/components/tiptap-ui/**",
    "src/components/tiptap-ui-primitive/**",
    "src/components/tiptap-extension/**",
    "src/hooks/**",
    "src/lib/tiptap-utils.ts",
  ]),
]);

export default eslintConfig;
