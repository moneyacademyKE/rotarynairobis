import { defineConfig } from "vitest/config";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [qwikCity(), qwikVite(), tsconfigPaths()],
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
  },
});
