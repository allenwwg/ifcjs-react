import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/ifcjs-react/",
  root: "./src",
  publicDir: "../public",
  server: {
  	port: 6500,
	host: '0,0,0,0',
  	open: true,
  },
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  define: {
    "process.env.API_HOST": JSON.stringify(process.env.API_HOST),
  },
});
