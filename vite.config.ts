// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Use node-server preset on Replit so the build produces a runnable Node.js HTTP server
  // instead of the Cloudflare Workers module format (which is the Lovable sandbox default).
  // The production port is supplied by NITRO_PORT in the run command.
  nitro: { preset: "node-server" },
  vite: {
    server: {
      port: 5000,
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: true,
    },
  },
});
