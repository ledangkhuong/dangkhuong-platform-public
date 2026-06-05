// NOTE: This file is NOT active in Tailwind v4. Tailwind v4 is configured via
// globals.css (CSS-first config). This JS config is ignored unless globals.css
// contains an @config directive pointing here, which it does not. The "content"
// array below has no effect at runtime.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};
export default config;
