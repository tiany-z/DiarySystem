import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "#core": path.resolve(__dirname, "./src/core/index.ts"),
      "@core": path.resolve(__dirname, "./src/core/index.ts"),
      "@core/*": path.resolve(__dirname, "./src/core/*"),
    },
  },
});
