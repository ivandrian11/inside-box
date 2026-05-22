/**
 * Tunnel Service
 *
 * Manages tunnel URL for public access to local gallery
 *
 * SETUP:
 * 1. Install cloudflared: `pnpm add -D cloudflared`
 * 2. Run in separate terminal: `npx cloudflared tunnel --url http://localhost:3847`
 * 3. Copy the URL (e.g., https://xxx-xxx.trycloudflare.com)
 * 4. Set environment variable: VITE_TUNNEL_URL=https://xxx-xxx.trycloudflare.com
 *
 * OR for production:
 * - Use a permanent Cloudflare tunnel with a custom domain
 */

// Get tunnel URL from environment or manual input
let tunnelUrl: string | null = import.meta.env.VITE_TUNNEL_URL || null

/**
 * Set tunnel URL manually
 */
export const setTunnelUrl = (url: string): void => {
  tunnelUrl = url.endsWith('/') ? url.slice(0, -1) : url
  console.log('🌐 Tunnel URL set:', tunnelUrl)
}

/**
 * Get current tunnel URL
 */
export const getTunnelUrl = (): string | null => {
  return tunnelUrl
}

/**
 * Check if tunnel is configured
 */
export const isTunnelRunning = (): boolean => {
  return tunnelUrl !== null && tunnelUrl !== ''
}

/**
 * Get gallery URL via tunnel
 */
export const getPublicGalleryUrl = (ticketCode: string): string | null => {
  if (!tunnelUrl) return null
  return `${tunnelUrl}/gallery/${ticketCode}`
}


