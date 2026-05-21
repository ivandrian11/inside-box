/**
 * Local Photo Storage Service
 *
 * Saves photos locally and serves via Cloudflare Tunnel for public access
 * No cloud storage - all photos stored on local device
 */

import { invoke } from '@tauri-apps/api/core'
import { getPublicGalleryUrl, isTunnelRunning } from './tunnelService'

export interface SessionSaveResult {
  ticketCode: string
  galleryUrl: string
  photoUrls: string[]
  templateUrl?: string
  isPublic: boolean // true if accessible via tunnel
  driveUrl?: string // Google Drive folder link
}

/**
 * Save photo locally via Tauri
 */
const savePhotoLocal = async (
  ticketCode: string,
  photoData: string,
  filename: string,
): Promise<string | null> => {
  try {
    const url = await invoke<string>('save_photo', {
      ticketCode,
      photoData,
      filename,
    })
    console.log(`💾 Saved: ${filename}`)
    return url
  } catch (error) {
    console.error('Save failed:', error)
    return null
  }
}

/**
 * Get local gallery URL
 */
const getLocalGalleryUrl = async (ticketCode: string): Promise<string> => {
  try {
    return await invoke<string>('get_gallery_url', { ticketCode })
  } catch {
    return `http://localhost:3847/gallery/${ticketCode}`
  }
}

/**
 * Save all session photos to local storage
 * Returns public URL via tunnel if configured
 */
export const saveSessionPhotos = async (
  ticketCode: string,
  photos: (string | null)[],
  templateResult: string | null,
): Promise<SessionSaveResult> => {
  console.log(`\n🚀 Saving photos for ticket: ${ticketCode}`)
  console.log(`📷 Photos: ${photos.filter((p) => p).length}`)
  console.log(`🌐 Tunnel configured: ${isTunnelRunning()}`)

  const photoUrls: string[] = []
  let templateUrl: string | undefined

  // Save individual photos
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    if (photo) {
      let ext = 'jpg'
      if (photo.startsWith('data:image/png')) ext = 'png'
      else if (photo.startsWith('data:image/webp')) ext = 'webp'
      const url = await savePhotoLocal(
        ticketCode,
        photo,
        `photo_${i + 1}.${ext}`,
      )
      if (url) {
        photoUrls.push(url)
      }
    }
  }

  // Save template result
  if (templateResult) {
    const url = await savePhotoLocal(
      ticketCode,
      templateResult,
      'hasil_template.png',
    )
    if (url) {
      templateUrl = url
    }
  }

  // Determine gallery URL
  let galleryUrl: string
  let isPublic = false

  // Try to get public URL via tunnel
  const tunnelGalleryUrl = getPublicGalleryUrl(ticketCode)

  if (tunnelGalleryUrl) {
    galleryUrl = tunnelGalleryUrl
    isPublic = true
    console.log(`\n✅ Public gallery URL: ${galleryUrl}`)
  } else {
    // Fallback to local URL
    galleryUrl = await getLocalGalleryUrl(ticketCode)
    console.log(`\n📶 Local gallery URL: ${galleryUrl}`)
    console.log(`⚠️ Only accessible from same WiFi`)
  }

  return {
    ticketCode,
    galleryUrl,
    photoUrls,
    templateUrl,
    isPublic,
  }
}
