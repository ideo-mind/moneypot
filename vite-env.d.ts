/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MONEY_AUTH_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
