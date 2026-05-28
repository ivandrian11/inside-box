/**
 * Local Photo Storage Service
 *
 * Saves photos locally and serves via Cloudflare Tunnel for public access
 * No cloud storage - all photos stored on local device
 */
import { invoke } from '@tauri-apps/api/core'

export interface SessionSaveResult {
  ticketCode: string
  galleryUrl: string
  photoUrls: string[]
  templateUrl?: string
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
    const port = import.meta.env.VITE_BACKEND_PORT || '3847'
    return `http://localhost:${port}/gallery/${ticketCode}`
  }
}

/**
 * Save all session photos to local storage
 */
export const saveSessionPhotos = async (
  ticketCode: string,
  photos: (string | null)[],
  templateResult: string | null,
): Promise<SessionSaveResult> => {
  console.log(`\n🚀 Saving photos for ticket: ${ticketCode}`)
  console.log(`📷 Photos: ${photos.filter((p) => p).length}`)

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
  const galleryUrl = await getLocalGalleryUrl(ticketCode)
  console.log(`\n📶 Local gallery URL: ${galleryUrl}`)
  console.log(`⚠️ Only accessible from same WiFi`)

  return {
    ticketCode,
    galleryUrl,
    photoUrls,
    templateUrl,
  }
}
