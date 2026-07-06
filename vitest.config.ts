import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        // Force vitest to transform these ESM-only packages
        inline: ["tailwind-merge", "clsx", "lucide-react"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/utils.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
