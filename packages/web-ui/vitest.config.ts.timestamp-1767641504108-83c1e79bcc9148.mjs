// vitest.config.ts
import { defineConfig } from "file:///Users/julien/Desktop/UniversalPWA/node_modules/.pnpm/vitest@2.1.9_@types+node@24.10.4_jsdom@25.0.1_lightningcss@1.30.2_terser@5.44.1/node_modules/vitest/dist/config.js";
import react from "file:///Users/julien/Desktop/UniversalPWA/node_modules/.pnpm/@vitejs+plugin-react@5.1.2_vite@7.3.0_@types+node@24.10.4_jiti@2.6.1_lightningcss@1.30.2_terser@5.44.1_tsx@4.21.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///Users/julien/Desktop/UniversalPWA/node_modules/.pnpm/@tailwindcss+vite@4.1.18_vite@7.3.0_@types+node@24.10.4_jiti@2.6.1_lightningcss@1.30.2_terser@5.44.1_tsx@4.21.0_/node_modules/@tailwindcss/vite/dist/index.mjs";
var vitest_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Relaxed coverage requirements for showcase website
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.config.ts", "dist/**", "vite.config.ts", "src/main.tsx"],
      // No coverage thresholds for showcase website
      thresholds: void 0
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9qdWxpZW4vRGVza3RvcC9Vbml2ZXJzYWxQV0EvcGFja2FnZXMvd2ViLXVpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvanVsaWVuL0Rlc2t0b3AvVW5pdmVyc2FsUFdBL3BhY2thZ2VzL3dlYi11aS92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qdWxpZW4vRGVza3RvcC9Vbml2ZXJzYWxQV0EvcGFja2FnZXMvd2ViLXVpL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gIHRlc3Q6IHtcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIHNldHVwRmlsZXM6IFsnLi92aXRlc3Quc2V0dXAudHMnXSxcbiAgICAvLyBSZWxheGVkIGNvdmVyYWdlIHJlcXVpcmVtZW50cyBmb3Igc2hvd2Nhc2Ugd2Vic2l0ZVxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JyxcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICBleGNsdWRlOiBbJyoqLyoudGVzdC57dHMsdHN4fScsICcqKi8qLmNvbmZpZy50cycsICdkaXN0LyoqJywgJ3ZpdGUuY29uZmlnLnRzJywgJ3NyYy9tYWluLnRzeCddLFxuICAgICAgLy8gTm8gY292ZXJhZ2UgdGhyZXNob2xkcyBmb3Igc2hvd2Nhc2Ugd2Vic2l0ZVxuICAgICAgdGhyZXNob2xkczogdW5kZWZpbmVkLFxuICAgIH0sXG4gIH0sXG59KVxuXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRVLFNBQVMsb0JBQW9CO0FBQ3pXLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUV4QixJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLEVBQ2hDLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxtQkFBbUI7QUFBQTtBQUFBLElBRWhDLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVMsQ0FBQyxzQkFBc0Isa0JBQWtCLFdBQVcsa0JBQWtCLGNBQWM7QUFBQTtBQUFBLE1BRTdGLFlBQVk7QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
