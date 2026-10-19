import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "API Pulse",
  version: "0.1.0",
  description: "Monitor API failures and page load performance.",
  permissions: [
    "webRequest",
    "storage",
    "sidePanel"
  ],
  host_permissions: [
    "http://*/*",
    "https://*/*"
  ],
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module"
  },
  action: {
    default_title: "Open API Pulse"
  },
  side_panel: {
    default_path: "index.html"
  },
  content_scripts: [
    {
      matches: [
        "http://*/*",
        "https://*/*"
      ],
      js: ["src/content/page-metrics.ts"],
      run_at: "document_idle"
    }
  ]
});