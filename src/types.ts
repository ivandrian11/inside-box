export enum AppStep {
  HOME = 'HOME',
  PAYMENT = 'PAYMENT',
  TEMPLATE_SELECT = 'TEMPLATE_SELECT',
  FEATURE_SELECT = 'FEATURE_SELECT',
  CONFIRMATION = 'CONFIRMATION',
  CAMERA = 'CAMERA',
  REVIEW = 'REVIEW',
  ARRANGE = 'ARRANGE', // New: drag photos to position in template
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
}

export interface PhotoData {
  original: string // Base64 foto original
  processed?: string // Base64 (AI background removal atau filter)
  activeFlipIndex?: number // -1 or 0 for original, 1 for processed if exists
  filename?: string // REMOTE SYNC: The physical filename on disk (e.g. "photo_1.jpg")
}

export enum FeatureType {
  STANDARD = 'STANDARD',
}

export enum BackgroundType {
  RAW = 'RAW',
}

// Photo slot position within a template (percentages)
export interface PhotoSlot {
  x: number // X position (percentage from left)
  y: number // Y position (percentage from top)
  width: number // Width (percentage)
  height: number // Height (percentage)
}

// Template configuration
export interface Template {
  id: string // e.g., "01a", "06a"
  photoCount: number // Number of photos needed (1, 6, etc.)
  variant: string // Variant letter (a, b, c, etc.)
  name: string // Display name
  description: string // Short description
  previewUrl: string // Path to template preview image
  frameUrl: string // Path to template frame for compositing
  slots: PhotoSlot[] // Photo slot positions
  outputWidth: number // Output image width in pixels
  outputHeight: number // Output image height in pixels
}

export interface BoothState {
  step: AppStep
  timeLeft: number // in seconds
  isSessionActive: boolean
  selectedTemplate: Template | null
  selectedFeature: FeatureType
  selectedBackground: BackgroundType
  selectedEffect: string // 'none', 'sepia', 'bw'
  photos: (PhotoData | null)[]
  currentPhotoIndex: number // Which photo slot we are currently taking
  selectedSequence: number[] // Indices of photos in their assigned order for the template
  compositeResult?: string // Final composited image (base64)
  ticketCode?: string // Payment ticket code, also used as Cloudinary folder
  autoPrintSuccess: boolean // Jika true, sembunyikan button Download & Cetak
  isTimerPaused: boolean // Pause timer
  isTimeout: boolean // Flag jika sesi berakhir karena waktu habis
  showTimeoutModal: boolean // Flag untuk menampilkan modal timeout
  totalShots: number // Total capture attempts (including history/retakes)
}
