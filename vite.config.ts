import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "offline-asset-list",
      generateBundle(_options, bundle) {
        const files = Object.keys(bundle).filter((name) =>
          /\.(js|css|html)$/.test(name),
        );
        this.emitFile({
          type: "asset",
          fileName: "offline-assets.json",
          source: JSON.stringify(files),
        });
        const version = createHash("sha256")
          .update(files.join("|"))
          .digest("hex")
          .slice(0, 12);
        const worker = readFileSync(
          new URL("./public/sw.js", import.meta.url),
          "utf8",
        ).replace("izin-dok-v3-dispensing", `izin-dok-v3-${version}`);
        this.emitFile({ type: "asset", fileName: "sw.js", source: worker });
      },
    },
  ],
});
