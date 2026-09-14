import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
  allowedHosts: ["reasonable-sparkle-production.up.railway.app"]
}
});
