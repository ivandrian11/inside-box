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

/**
 * Get remote capture URL via tunnel
 */
export const getPublicRemoteUrl = (ticketCode: string): string | null => {
  if (!tunnelUrl) return null
  return `${tunnelUrl}/remote/${ticketCode}`
}

/**
 * Sync session step to backend for remote redirect
 */
export const syncRemoteStep = async (
  ticketCode: string,
  step: string,
  photoCount: number,
  sortedFilenames?: string[],
): Promise<void> => {
  try {
    const baseUrl = tunnelUrl || `http://${window.location.hostname}:3847`
    const body: any = {
      ticket_code: ticketCode,
      step,
      photo_count: photoCount,
    }

    // Only add if defined to avoid breaking backend if it's strict
    if (sortedFilenames) {
      body.sorted_filenames = sortedFilenames
    }

    await fetch(`${baseUrl}/booth/step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1', // Skip ngrok warning page
        'User-Agent': 'BoothApp/1.0', // Custom user agent
      },
      body: JSON.stringify(body),
    })
    console.log(`📍 Synced step: ${step} for ticket: ${ticketCode}`)
  } catch (error) {
    console.error('Failed to sync step:', error)
  }
}
