/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
