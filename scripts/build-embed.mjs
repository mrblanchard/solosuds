// Bundles src/embed/embed.ts into public/embed.js — the standalone,
// dependency-free script customers paste into their own website to embed
// the booking widget (see readme-developer.md for the wider context).
//
// Deliberately NOT part of Next's own webpack build: this needs to ship as
// a single small IIFE with no React/Next runtime, since it's loaded by
// arbitrary third-party websites, not served as part of this app's pages.
// Run via `npm run build:embed`, wired into `postinstall` and `build`.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const result = await build({
    entryPoints: [path.join(__dirname, "../src/embed/embed.ts")],
    outfile: path.join(__dirname, "../public/embed.js"),
    bundle: true,
    minify: true,
    sourcemap: false,
    format: "iife",
    target: ["es2019"],
    loader: { ".css": "text" },
    logLevel: "info",
    metafile: true,
  });

  const outputs = result.metafile?.outputs ?? {};
  for (const [file, info] of Object.entries(outputs)) {
    const kb = (info.bytes / 1024).toFixed(1);
    console.log(`[build-embed] ${path.relative(process.cwd(), file)}: ${kb} KB`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
