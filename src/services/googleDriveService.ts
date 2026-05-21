import { invoke } from '@tauri-apps/api/core'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_DRIVE_REFRESH_TOKEN
const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID

export interface UploadProgressInfo {
  status: 'idle' | 'authenticating' | 'creating_folder' | 'uploading' | 'success' | 'error'
  overallPercent: number
  completedCount: number
  totalCount: number
  message: string
}

/**
 * Convert base64 data URL to binary Blob
 */
export const dataURLtoBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Get new Google API Access Token using refresh token via Tauri Rust command to avoid CORS
 */
export const refreshAccessToken = async (): Promise<string> => {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('Google Drive configuration missing in env variables')
  }

  // URL-decoded refresh token is safer
  const decodedRefreshToken = decodeURIComponent(REFRESH_TOKEN)

  try {
    const accessToken = await invoke<string>('gdrive_get_access_token', {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: decodedRefreshToken,
    })
    return accessToken
  } catch (error) {
    console.error('Failed to get access token from Google:', error)
    throw new Error(`Auth failed: ${error}`)
  }
}

/**
 * Find a folder by name inside a parent folder, or create it if not exists.
 * Returns the folder ID.
 */
const findOrCreateFolder = async (
  accessToken: string,
  parentId: string,
  folderName: string
): Promise<string> => {
  // 1. Search for existing folder
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`

  const searchRes = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!searchRes.ok) {
    const errText = await searchRes.text()
    throw new Error(`Failed to search folder '${folderName}': ${errText}`)
  }

  const searchData = await searchRes.json()
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }

  // 2. Create folder if not found
  const createUrl = 'https://www.googleapis.com/drive/v3/files'
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Failed to create folder '${folderName}': ${errText}`)
  }

  const createData = await createRes.json()
  return createData.id
}

/**
 * Creates/retrieves the full folder hierarchy: [Root] -> [Month Year] -> [Day Month] -> [Ticket Code]
 * Returns the created session folder ID and public Google Drive folder link.
 */
export const createSessionFolderStructure = async (
  accessToken: string,
  ticketCode: string
): Promise<{ folderId: string; folderUrl: string }> => {
  if (!ROOT_FOLDER_ID) {
    throw new Error('VITE_GOOGLE_DRIVE_FOLDER_ID not set')
  }

  const now = new Date()

  // 1. Month-Year folder (e.g., "Mei 2026")
  const monthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  }).format(now)

  const monthYearFolderId = await findOrCreateFolder(
    accessToken,
    ROOT_FOLDER_ID,
    monthYear
  )

  // 2. Day-Month folder (e.g., "20 Mei")
  const dayMonth = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Makassar',
  }).format(now)

  const dayMonthFolderId = await findOrCreateFolder(
    accessToken,
    monthYearFolderId,
    dayMonth
  )

  // 3. Session Folder with Ticket Code (e.g., "XYZ789")
  const sessionFolderId = await findOrCreateFolder(
    accessToken,
    dayMonthFolderId,
    ticketCode
  )

  const folderUrl = `https://drive.google.com/drive/folders/${sessionFolderId}`
  return { folderId: sessionFolderId, folderUrl }
}

/**
 * Initiates resumable session and uploads a file to Google Drive using XMLHttpRequest to track progress.
 */
const uploadSingleFile = async (
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  folderId: string,
  onProgress: (loaded: number, total: number) => void
): Promise<string> => {
  // 1. Initiate Resumable Upload Session
  const initiateUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true'
  const metadata = {
    name: fileName,
    parents: [folderId],
  }

  const initiateRes = await fetch(initiateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': fileBlob.type || 'image/jpeg',
    },
    body: JSON.stringify(metadata),
  })

  if (!initiateRes.ok) {
    const errText = await initiateRes.text()
    throw new Error(`Failed to initiate upload session for '${fileName}': ${errText}`)
  }

  const sessionUrl = initiateRes.headers.get('Location')
  if (!sessionUrl) {
    throw new Error(`No Location header returned for upload session: '${fileName}'`)
  }

  // 2. Upload file content via PUT
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', sessionUrl)
    xhr.setRequestHeader('Content-Type', fileBlob.type || 'image/jpeg')

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        onProgress(evt.loaded, evt.total)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resJson = JSON.parse(xhr.responseText)
          resolve(resJson.id)
        } catch {
          resolve('')
        }
      } else {
        reject(new Error(`Google upload failed for ${fileName} with status ${xhr.status}: ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error(`Network error during Google upload of ${fileName}`))
    xhr.send(fileBlob)
  })
}

/**
 * Orchestrator to upload all session photos to Google Drive.
 * Files are uploaded with concurrency limit of 3.
 */
export const uploadSessionToDrive = async (
  ticketCode: string,
  photosData: (string | null)[],
  compositeResultData: string | null,
  onProgressUpdate: (progress: UploadProgressInfo) => void
): Promise<string> => {
  const progress: UploadProgressInfo = {
    status: 'authenticating',
    overallPercent: 0,
    completedCount: 0,
    totalCount: 0,
    message: 'Menghubungkan ke Google Drive...',
  }
  onProgressUpdate({ ...progress })

  try {
    // 1. Refresh Access Token
    const accessToken = await refreshAccessToken()

    // 2. Prepare files to upload
    const filesToUpload: { name: string; blob: Blob }[] = []

    for (let i = 0; i < photosData.length; i++) {
      const photo = photosData[i]
      if (photo) {
        let ext = 'jpg'
        if (photo.startsWith('data:image/png')) ext = 'png'
        else if (photo.startsWith('data:image/webp')) ext = 'webp'
        
        filesToUpload.push({
          name: `photo_${i + 1}.${ext}`,
          blob: dataURLtoBlob(photo),
        })
      }
    }

    if (compositeResultData) {
      filesToUpload.push({
        name: 'hasil_template.png',
        blob: dataURLtoBlob(compositeResultData),
      })
    }

    const totalCount = filesToUpload.length
    progress.totalCount = totalCount

    if (totalCount === 0) {
      progress.status = 'success'
      progress.message = 'Tidak ada file untuk diunggah.'
      onProgressUpdate({ ...progress })
      return ''
    }

    // 3. Create Session Folder
    progress.status = 'creating_folder'
    progress.message = 'Membuat folder sesi di Drive...'
    onProgressUpdate({ ...progress })

    const { folderId, folderUrl } = await createSessionFolderStructure(
      accessToken,
      ticketCode
    )

    // 4. Upload Files with Concurrency Limit = 3
    progress.status = 'uploading'
    progress.message = `Mengunggah foto... 0/${totalCount} (0%)`
    onProgressUpdate({ ...progress })

    const CONCURRENCY = 3
    const fileProgress = filesToUpload.map((f) => ({
      loaded: 0,
      total: f.blob.size,
    }))
    let completedCount = 0

    const updateOverallProgress = () => {
      const totalBytes = fileProgress.reduce((s, p) => s + p.total, 0)
      const loadedBytes = fileProgress.reduce((s, p) => s + p.loaded, 0)
      const pct = totalBytes > 0 ? Math.floor((loadedBytes / totalBytes) * 100) : 0

      progress.overallPercent = pct
      progress.completedCount = completedCount
      progress.message = `Mengunggah foto... ${completedCount}/${totalCount} (${pct}%)`
      onProgressUpdate({ ...progress })
    }

    // Queue worker structure
    const queue = [...filesToUpload.map((file, index) => ({ file, index }))]
    const workers: Promise<void>[] = []

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (!item) break

        await uploadSingleFile(
          accessToken,
          item.file.blob,
          item.file.name,
          folderId,
          (loaded, total) => {
            fileProgress[item.index].loaded = loaded
            fileProgress[item.index].total = total
            updateOverallProgress()
          }
        )

        completedCount++
        updateOverallProgress()
      }
    }

    for (let w = 0; w < Math.min(CONCURRENCY, totalCount); w++) {
      workers.push(worker())
    }

    await Promise.all(workers)

    // 5. Success
    progress.status = 'success'
    progress.message = 'Upload selesai.'
    progress.overallPercent = 100
    onProgressUpdate({ ...progress })

    return folderUrl
  } catch (error: any) {
    console.error('Google Drive Upload Process failed:', error)
    progress.status = 'error'
    progress.message = `Upload gagal: ${error.message || error}`
    onProgressUpdate({ ...progress })
    throw error
  }
}
