/// <reference types="vite/client" />

interface ImportMetaEnv {
  // All API keys have been moved to server-side environment variables
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
