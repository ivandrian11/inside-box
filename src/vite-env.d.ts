/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TUNNEL_URL: string
  readonly VITE_XENDIT_SECRET_KEY: string
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID: string
  readonly VITE_GOOGLE_OAUTH_CLIENT_SECRET: string
  readonly VITE_GOOGLE_DRIVE_FOLDER_ID: string
  readonly VITE_GOOGLE_DRIVE_REFRESH_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
