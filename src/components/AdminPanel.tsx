import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  X,
  Camera,
  Trash2,
  Calendar,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  LogOut,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import {
  getSessionDurationMinutes,
  setSessionDurationMinutes,
  getSessionPriceThousands,
  setSessionPriceThousands,
  getSelectedCameraId,
  setSelectedCameraId,
  getFlipHorizontal,
  setFlipHorizontal,
  getFlipVertical,
  setFlipVertical,
  getIsPortrait,
  setIsPortrait,
  getDebugMode,
  setDebugMode,
  getAllSessions,
  clearAllSessions,
  exportToGoogleSheet,
} from '../services/databaseService'

interface CameraDevice {
  id: string
  label: string
}

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

// Default PIN - should be changed in production
const ADMIN_PIN = '1234'

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Session duration in minutes (default 10)
  const [sessionDuration, setSessionDuration] = useState<number>(() => {
    const saved = localStorage.getItem('sessionDurationMinutes')
    return saved ? parseInt(saved, 10) : 10
  })

  // Session price in thousands (default 25 = Rp 25.000)
  const [sessionPrice, setSessionPrice] = useState<number>(() => {
    const saved = localStorage.getItem('sessionPriceThousands')
    return saved ? parseInt(saved, 10) : 25
  })

  // PIN visibility toggle
  const [showPin, setShowPin] = useState(false)

  // Debug mode (shows dev buttons like payment simulation)
  const [debugMode, setDebugModeState] = useState(false)

  // Camera preview
  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)

  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Google Script URL (Hardcoded)
  const SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbz38rxLSBPPrxYKcHBH2G7sL30wKqtrkYqASTBXx7MzqATsvFZkDB_hNSgIEqi_2jQFXQ/exec'

  // Timer scope (which steps the timer runs in)
  const [timerScope, setTimerScope] = useState<string>(() => {
    return localStorage.getItem('sessionTimerScope') || 'STEP_03_ONLY'
  })

  // Camera flip & orientation states
  const [flipHorizontal, setFlipHorizontalState] = useState<boolean>(() => {
    return localStorage.getItem('flipHorizontal') === 'true'
  })
  const [flipVertical, setFlipVerticalState] = useState<boolean>(() => {
    return localStorage.getItem('flipVertical') === 'true'
  })
  const [isPortrait, setIsPortraitState] = useState<boolean>(() => {
    return localStorage.getItem('isPortrait') === 'true'
  })



  // Load settings on mount (immediately when panel opens)
  useEffect(() => {
    loadCameras()
    loadSelectedCamera()
    loadSessionDuration()
    loadSessionPrice()
    loadDebugMode()
    loadTimerScope()
    loadCameraSettings()
  }, [])

  const loadCameraSettings = async () => {
    const flipH = await getFlipHorizontal()
    const flipV = await getFlipVertical()
    const portrait = await getIsPortrait()
    setFlipHorizontalState(flipH)
    setFlipVerticalState(flipV)
    setIsPortraitState(portrait)
  }

  const loadTimerScope = async () => {
    const { getSessionTimerScope } = await import('../services/databaseService')
    const saved = await getSessionTimerScope()
    setTimerScope(saved)
  }

  const handleTimerScopeChange = async (scope: string) => {
    const { setSessionTimerScope } = await import('../services/databaseService')
    setTimerScope(scope)
    await setSessionTimerScope(scope)
    localStorage.setItem('sessionTimerScope', scope)
    showMessage('success', `Jangkauan timer diubah`)
  }

  const loadSessionDuration = async () => {
    const saved = await getSessionDurationMinutes()
    setSessionDuration(saved)
  }

  const handleDurationChange = async (minutes: number) => {
    setSessionDuration(minutes)
    await setSessionDurationMinutes(minutes)
    // Also keep localStorage for backward compatibility
    localStorage.setItem('sessionDurationMinutes', minutes.toString())
    showMessage('success', `Durasi sesi diubah ke ${minutes} menit`)
  }

  const loadSessionPrice = async () => {
    const saved = await getSessionPriceThousands()
    setSessionPrice(saved)
  }

  const handlePriceChange = async (priceInThousands: number) => {
    setSessionPrice(priceInThousands)
    await setSessionPriceThousands(priceInThousands)
    // Also keep localStorage for backward compatibility
    localStorage.setItem('sessionPriceThousands', priceInThousands.toString())
    showMessage('success', `Harga sesi diubah ke Rp ${priceInThousands}.000`)
  }

  const loadDebugMode = async () => {
    const saved = await getDebugMode()
    setDebugModeState(saved)
    // Also sync to localStorage for StepPayment to read
    localStorage.setItem('debugMode', saved.toString())
  }

  const handleDebugModeChange = async (enabled: boolean) => {
    setDebugModeState(enabled)
    await setDebugMode(enabled)
    // Also keep localStorage for other components to read
    localStorage.setItem('debugMode', enabled.toString())
    showMessage(
      'success',
      `Debug Mode ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
    )
  }



  const loadCameras = async () => {
    try {
      // Minta permission dulu agar label/nama kamera terbaca
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        })
        stream.getTracks().forEach((track) => track.stop())
      } catch (err) {
        console.warn('Could not get initial camera permission:', err)
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          id: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
        }))
      setCameras(videoDevices)
    } catch (error) {
      console.error('Failed to load cameras:', error)
    }
  }

  const loadSelectedCamera = async () => {
    const saved = await getSelectedCameraId()
    if (saved) {
      setSelectedCamera(saved)
    }
  }

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true)
      setPinError(false)
      setPinInput('')
    } else {
      setPinError(true)
      setPinInput('')
    }
  }

  // Start camera preview
  const startPreview = async (cameraId?: string) => {
    // Stop existing preview first
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop())
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: cameraId
          ? { deviceId: { exact: cameraId }, width: 320, height: 240 }
          : { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setPreviewStream(stream)
    } catch (error) {
      console.error('Failed to start preview:', error)
      showMessage('error', 'Gagal memulai preview kamera')
    }
  }

  // Stop camera preview
  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop())
      setPreviewStream(null)
    }
  }

  // Connect stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  // Stop preview when panel closes
  useEffect(() => {
    if (!isOpen) {
      stopPreview()
    }
  }, [isOpen])

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId)
    await setSelectedCameraId(cameraId)
    // Also keep localStorage for backward compatibility
    localStorage.setItem('selectedCameraId', cameraId)
    window.dispatchEvent(new Event('camera-settings-changed'))
    showMessage('success', 'Kamera berhasil dipilih')
    // Start preview with new camera
    startPreview(cameraId || undefined)
  }

  const handleFlipHorizontalChange = async (enabled: boolean) => {
    setFlipHorizontalState(enabled)
    await setFlipHorizontal(enabled)
    localStorage.setItem('flipHorizontal', enabled.toString())
    window.dispatchEvent(new Event('camera-settings-changed'))
    showMessage(
      'success',
      `Flip Horizontal ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
    )
  }

  const handleFlipVerticalChange = async (enabled: boolean) => {
    setFlipVerticalState(enabled)
    await setFlipVertical(enabled)
    localStorage.setItem('flipVertical', enabled.toString())
    window.dispatchEvent(new Event('camera-settings-changed'))
    showMessage(
      'success',
      `Flip Vertical ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
    )
  }

  const handleIsPortraitChange = async (enabled: boolean) => {
    setIsPortraitState(enabled)
    await setIsPortrait(enabled)
    localStorage.setItem('isPortrait', enabled.toString())
    window.dispatchEvent(new Event('camera-settings-changed'))
    showMessage(
      'success',
      `Mode Portrait ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
    )
  }

  const handleDeleteTodayPhotos = async () => {
    if (
      !confirm(
        'Hapus SEMUA foto hari ini? Tindakan ini tidak dapat dibatalkan!',
      )
    ) {
      return
    }
    setIsLoading(true)
    try {
      const result = await invoke<string>('delete_photos_by_date', {
        daysAgo: 0,
      })
      showMessage('success', result)
    } catch (error) {
      showMessage('error', `Gagal menghapus: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteYesterdayPhotos = async () => {
    if (!confirm('Hapus SEMUA foto kemarin?')) {
      return
    }
    setIsLoading(true)
    try {
      const result = await invoke<string>('delete_photos_by_date', {
        daysAgo: 1,
      })
      showMessage('success', result)
    } catch (error) {
      showMessage('error', `Gagal menghapus: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteOldPhotos = async () => {
    if (!confirm('Hapus foto yang lebih dari 1 hari?')) {
      return
    }
    setIsLoading(true)
    try {
      const result = await invoke<string>('cleanup_old_photos_cmd', {})
      showMessage('success', result)
    } catch (error) {
      showMessage('error', `Gagal menghapus: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    if (!SCRIPT_URL) {
      showMessage('error', 'URL Google Script belum diisi!')
      return
    }
    setIsLoading(true)
    try {
      const allData = await getAllSessions()
      if (allData.length === 0) {
        showMessage('error', 'Database kosong, tidak ada data untuk diexport.')
        return
      }

      // Check last exported ID to prevent duplicates
      const lastExportId = parseInt(
        localStorage.getItem('last_export_id') || '0',
        10,
      )

      const newData = allData.filter((s) => s.id > lastExportId)
      let dataToExport = newData
      if (newData.length === 0) {
        if (
          !confirm(
            'Semua data baru sudah diexport sebelumnya.\n\nApakah Anda ingin meng-export ulang SEMUA data? (Ini akan membuat duplikat jika data di Spreadsheet belum dihapus)',
          )
        ) {
          setIsLoading(false)
          return
        }
        dataToExport = allData
      }

      showMessage('success', `Mengirim ${dataToExport.length} baris data...`)

      const result = await exportToGoogleSheet(SCRIPT_URL, dataToExport)
      if (result.includes('Berhasil')) {
        showMessage('success', result)

        // Update last export ID
        const maxId = Math.max(...dataToExport.map((s) => s.id))
        localStorage.setItem('last_export_id', maxId.toString())
      } else {
        showMessage('error', result)
      }
    } catch (error: any) {
      showMessage('error', `Gagal export: ${error.message || error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearDatabase = async () => {
    if (
      !confirm(
        'PERINGATAN: Ini akan MENGHAPUS SEMUA DATA SESI dari database local.\n\nData yang dihapus TIDAK BISA KEMBALI.\n\nLanjutkan?',
      )
    ) {
      return
    }
    // Double confirmation for safety
    if (!confirm('YAKIN? Ketik OK untuk konfirmasi.')) {
      return
    }

    setIsLoading(true)
    try {
      const success = await clearAllSessions()
      if (success) {
        showMessage('success', 'Database berhasil dikosongkan.')
      } else {
        showMessage('error', 'Gagal mengosongkan database.')
      }
    } catch (error: any) {
      showMessage('error', `Error: ${error.message || error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshApp = () => {
    window.location.reload()
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleClose = () => {
    setIsAuthenticated(false)
    setPinInput('')
    setPinError(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='z-100 fixed inset-0 flex justify-center items-center bg-studio-text/40 backdrop-blur-xl animate-fade-in'>
      <div className='relative bg-white shadow-[-60px_60px_120px_rgba(0,0,0,0.15)] m-4 p-10 border border-studio-border rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] overflow-y-auto no-scrollbar animate-scale-in'>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className='top-6 right-6 absolute flex justify-center items-center bg-studio-bg hover:bg-studio-primary/10 rounded-full w-12 h-12 text-studio-textLight hover:text-studio-primary transition-all duration-300'
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className='flex items-center gap-4 mb-10'>
          <div className='bg-studio-primary/10 p-4 rounded-2xl'>
            <Settings className='text-studio-primary' size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className='font-display font-medium text-studio-text text-3xl italic tracking-tight'>Admin Panel</h2>
            <p className='font-bold text-studio-textLight text-[0.65rem] uppercase tracking-[0.3em] italic'>Konfigurasi Sistem Utama</p>
          </div>
        </div>

        {/* PIN Authentication */}
        {!isAuthenticated ? (
          <div className='mx-auto max-w-md space-y-8 animate-fade-in'>
            <div className='text-center'>
               <p className='font-bold text-studio-textLight text-sm uppercase tracking-widest italic'>
                Keamanan Diperlukan
              </p>
              <h3 className='font-display font-black text-studio-text text-xl italic'>Masukkan PIN Akses</h3>
            </div>
            
            <div className='flex flex-col gap-6'>
              <div className='relative'>
                <input
                  type='text'
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  placeholder='······'
                  maxLength={6}
                  autoComplete='off'
                  className={`w-full bg-studio-bg px-4 py-5 pr-14 border-2 rounded-2xl text-studio-text text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:ring-4 transition-all ${
                    pinError
                      ? 'border-red-400 focus:ring-red-100'
                      : 'border-studio-border focus:border-studio-primary focus:ring-studio-primary/10'
                  }`}
                  style={
                    {
                      WebkitTextSecurity: showPin ? 'none' : 'disc',
                    } as React.CSSProperties
                  }
                />
                <button
                  type='button'
                  onClick={() => setShowPin(!showPin)}
                  className='top-1/2 right-4 absolute p-2 text-studio-textLight hover:text-studio-primary transition-colors -translate-y-1/2'
                >
                  {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
              <button
                onClick={handlePinSubmit}
                className='bg-studio-primary shadow-lg shadow-studio-primary/20 py-5 rounded-2xl font-display font-black text-white text-xl uppercase tracking-widest italic hover:scale-[1.02] active:scale-95 transition-all'
              >
                Unlock Dashboard
              </button>
            </div>

            {/* Number Pad for Touchscreen - Elegant Light Style */}
            <div className='gap-3 grid grid-cols-3'>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'C') {
                      setPinInput('')
                    } else if (key === '⌫') {
                      setPinInput(pinInput.slice(0, -1))
                    } else if (pinInput.length < 6) {
                      setPinInput(pinInput + key)
                    }
                  }}
                  className={`py-5 rounded-2xl text-2xl font-display font-black italic transition-all ${
                    key === 'C'
                      ? 'bg-red-50 text-red-500 hover:bg-red-100'
                      : key === '⌫'
                        ? 'bg-orange-50 text-orange-500 hover:bg-orange-100'
                        : 'bg-studio-bg text-studio-text hover:bg-studio-primary hover:text-white'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Exit Application Button */}
            <button
              onClick={() => setShowExitConfirm(true)}
              className='flex justify-center items-center gap-2 bg-red-50 hover:bg-red-100 py-4 border border-red-200 rounded-2xl w-full font-bold text-red-500 transition-all uppercase tracking-widest text-xs italic'
            >
              <LogOut size={16} />
              Tutup Aplikasi (Shutdown)
            </button>

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
              <div className='z-100 fixed inset-0 flex justify-center items-center bg-studio-text/40 backdrop-blur-xl'>
                <div className='bg-white shadow-[0_40px_100px_rgba(0,0,0,0.3)] mx-4 p-10 border border-studio-border rounded-3xl w-full max-w-sm text-center animate-scale-in'>
                  <div className='bg-red-50 mx-auto mb-6 rounded-full w-20 h-20 flex items-center justify-center text-red-500'>
                    <LogOut size={40} />
                  </div>
                  <h3 className='mb-2 font-display font-black text-studio-text text-2xl italic'>
                    Keluar Aplikasi?
                  </h3>
                  <p className='mb-8 font-bold text-studio-textLight text-sm leading-relaxed'>
                    Aplikasi akan ditutup sepenuhnya. Yakin ingin keluar?
                  </p>
                  <div className='flex gap-4'>
                    <button
                      onClick={() => setShowExitConfirm(false)}
                      className='flex-1 bg-studio-bg hover:bg-studio-border py-4 rounded-xl font-bold text-studio-text transition-all'
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => invoke('exit_app')}
                      className='flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-xl font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:scale-105'
                    >
                      Ya, Keluar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pinError && (
              <p className='bg-red-50 py-3 rounded-lg text-red-500 text-sm font-bold text-center animate-shake'>
                ⚠️ PIN yang Anda masukkan salah!
              </p>
            )}
          </div>
        ) : (
          <div className='gap-6 grid grid-cols-2 animate-fade-in'>
            {/* Camera Selection */}
            <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-4 shadow-sm'>
              <div className='flex items-center gap-3 text-studio-primary'>
                <Camera size={20} strokeWidth={2.5} />
                <span className='font-display font-black italic tracking-widest uppercase text-xs'>Pilih Kamera</span>
              </div>
              <select
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary focus:ring-4 focus:ring-studio-primary/5 transition-all'
              >
                <option value=''>-- Otomatis --</option>
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>

              {/* Camera Orientation and Flips */}
              <div className='grid grid-cols-3 gap-2 pt-2'>
                <label className='flex flex-col items-center justify-center bg-white p-3 border border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group text-center'>
                  <input
                    type='checkbox'
                    checked={flipHorizontal}
                    onChange={(e) => handleFlipHorizontalChange(e.target.checked)}
                    className='mb-1.5 w-5 h-5 accent-studio-primary cursor-pointer'
                  />
                  <span className='font-display font-bold text-studio-text text-[10px] uppercase tracking-wider'>
                    Flip H
                  </span>
                </label>

                <label className='flex flex-col items-center justify-center bg-white p-3 border border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group text-center'>
                  <input
                    type='checkbox'
                    checked={flipVertical}
                    onChange={(e) => handleFlipVerticalChange(e.target.checked)}
                    className='mb-1.5 w-5 h-5 accent-studio-primary cursor-pointer'
                  />
                  <span className='font-display font-bold text-studio-text text-[10px] uppercase tracking-wider'>
                    Flip V
                  </span>
                </label>

                <label className='flex flex-col items-center justify-center bg-white p-3 border border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group text-center'>
                  <input
                    type='checkbox'
                    checked={isPortrait}
                    onChange={(e) => handleIsPortraitChange(e.target.checked)}
                    className='mb-1.5 w-5 h-5 accent-studio-primary cursor-pointer'
                  />
                  <span className='font-display font-bold text-studio-text text-[10px] uppercase tracking-wider'>
                    Portrait
                  </span>
                </label>
              </div>

              {/* Camera Preview */}
              <div className='mt-2'>
                {previewStream ? (
                  <div className='relative group'>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className='border-4 border-white shadow-lg rounded-xl w-full aspect-video object-cover transition-transform duration-500'
                      style={{
                        transform: isPortrait
                          ? `rotate(-90deg) scale(1.3) scaleX(${
                              flipVertical ? -1 : 1
                            }) scaleY(${flipHorizontal ? 1 : -1})`
                          : `scaleX(${flipHorizontal ? 1 : -1}) scaleY(${
                              flipVertical ? -1 : 1
                            })`,
                      }}
                    />
                    <button
                      onClick={stopPreview}
                      className='top-3 right-3 absolute bg-red-600 shadow-lg p-2 rounded-lg text-white hover:scale-110 active:scale-95 transition-all'
                      title='Tutup Preview'
                    >
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startPreview(selectedCamera || undefined)}
                    className='group flex items-center justify-center gap-2 bg-white hover:bg-studio-primary hover:text-white py-4 rounded-xl border-2 border-studio-border w-full text-studio-text font-bold text-sm transition-all shadow-sm'
                  >
                    <Eye size={18} />
                    Preview Kamera
                  </button>
                )}
              </div>

              <button
                onClick={loadCameras}
                className='flex items-center gap-2 font-bold text-studio-textLight hover:text-studio-primary text-[0.65rem] uppercase tracking-widest italic transition-colors'
              >
                <RefreshCw size={12} strokeWidth={3} /> Refresh daftar kamera
              </button>
            </div>

            {/* Session Settings Group */}
            <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-6 shadow-sm'>
              {/* Duration */}
              <div className='space-y-3'>
                <div className='flex items-center gap-3 text-studio-primary'>
                  <Settings size={20} strokeWidth={2.5} />
                  <span className='font-display font-black italic tracking-widest uppercase text-xs'>Durasi Sesi</span>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <select
                    value={sessionDuration}
                    onChange={(e) =>
                      handleDurationChange(parseInt(e.target.value, 10))
                    }
                    className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary transition-all'
                  >
                    {[1, 3, 5, 7, 10, 12, 15, 20, 30].map(min => (
                      <option key={min} value={min}>{min} Menit</option>
                    ))}
                  </select>
                  
                  <select
                    value={timerScope}
                    onChange={(e) => handleTimerScopeChange(e.target.value)}
                    className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary transition-all'
                  >
                    <option value='STEP_03_ONLY'>Step 03 Saja</option>
                    <option value='STEP_03_04'>Step 03 - 04</option>
                    <option value='STEP_03_05'>Step 03 - 05</option>
                  </select>
                </div>
                <div className='flex justify-between items-center text-studio-textLight text-[0.6rem] font-bold italic opacity-60'>
                   <span>Waktu Sesi (Menit)</span>
                   <span>Jangkauan Timer</span>
                </div>
              </div>

              {/* Price */}
              <div className='space-y-3 pt-6 border-t border-studio-border'>
                <div className='flex items-center gap-3 text-studio-primary'>
                  <span className='text-xl'>💰</span>
                  <span className='font-display font-black italic tracking-widest uppercase text-xs'>Harga Sesi (Rp)</span>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='relative flex-1'>
                    <span className='absolute left-4 top-1/2 -translate-y-1/2 text-studio-textLight font-mono text-sm opacity-50'>Rp</span>
                    <input
                      type='number'
                      value={sessionPrice}
                      onChange={(e) =>
                        handlePriceChange(parseInt(e.target.value, 10) || 0)
                      }
                      className='w-full bg-white pl-10 pr-4 py-3 border-2 border-studio-border rounded-xl font-display font-black text-studio-text text-xl italic focus:outline-none focus:border-studio-primary transition-all'
                      placeholder='25'
                    />
                  </div>
                  <span className='font-display font-black text-studio-primary text-2xl italic'>.000</span>
                </div>
              </div>
            </div>

            {/* Photos & Assets Management */}
            <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-4 shadow-sm'>
              <div className='flex items-center gap-3 text-studio-primary'>
                <Trash2 size={20} strokeWidth={2.5} />
                <span className='font-display font-black italic tracking-widest uppercase text-xs'>Kelola Data Foto</span>
              </div>
              <div className='space-y-2'>
                <button
                  onClick={handleDeleteTodayPhotos}
                  disabled={isLoading}
                  className='group flex items-center justify-between bg-white hover:bg-red-50 hover:text-red-600 disabled:opacity-50 px-5 py-4 border-2 border-studio-border rounded-xl w-full text-studio-text font-bold text-xs transition-all'
                >
                  <div className='flex items-center gap-3 uppercase tracking-widest italic'>
                    <Calendar size={16} />
                    <span>Hapus Foto Hari Ini</span>
                  </div>
                  <ChevronRight size={14} className='opacity-0 group-hover:opacity-100 transform translate-x-1 transition-all' />
                </button>
                <button
                  onClick={handleDeleteYesterdayPhotos}
                  disabled={isLoading}
                   className='group flex items-center justify-between bg-white hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50 px-5 py-4 border-2 border-studio-border rounded-xl w-full text-studio-text font-bold text-xs transition-all'
                >
                  <div className='flex items-center gap-3 uppercase tracking-widest italic'>
                     <Calendar size={16} />
                    <span>Hapus Foto Kemarin</span>
                  </div>
                  <ChevronRight size={14} className='opacity-0 group-hover:opacity-100 transform translate-x-1 transition-all' />
                </button>
                <button
                  onClick={handleDeleteOldPhotos}
                  disabled={isLoading}
                  className='group flex items-center justify-between bg-white hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 px-5 py-4 border-2 border-studio-border rounded-xl w-full text-studio-text font-bold text-xs transition-all'
                >
                  <div className='flex items-center gap-3 uppercase tracking-widest italic'>
                    <Trash2 size={16} />
                    <span>Hapus Foto Lama</span>
                  </div>
                  <ChevronRight size={14} className='opacity-0 group-hover:opacity-100 transform translate-x-1 transition-all' />
                </button>
              </div>
            </div>

            {/* App Logic & Controls */}
            <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-4 shadow-sm'>
              <div className='flex items-center gap-3 text-studio-primary'>
                <RefreshCw size={20} strokeWidth={2.5} />
                <span className='font-display font-black italic tracking-widest uppercase text-xs'>Kontrol Aplikasi</span>
              </div>
              <div className='space-y-4'>
                <button
                  onClick={handleRefreshApp}
                  className='flex items-center justify-center gap-3 bg-studio-primary shadow-lg shadow-studio-primary/20 text-white py-4 rounded-xl w-full font-display font-black uppercase tracking-widest text-xs italic hover:scale-[1.02] active:scale-95 transition-all'
                >
                  <RefreshCw size={16} strokeWidth={3} />
                  Refresh Aplikasi
                </button>

                {/* Debug Mode Toggle - Elegant Style */}
                <label className='flex items-center gap-4 bg-white px-5 py-4 border-2 border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group'>
                  <input
                    type='checkbox'
                    checked={debugMode}
                    onChange={(e) => handleDebugModeChange(e.target.checked)}
                    className='w-6 h-6 accent-studio-primary cursor-pointer'
                  />
                  <div className='flex-1'>
                    <span className='block font-display font-black text-studio-text text-sm italic uppercase tracking-widest'>
                      Debug Mode
                    </span>
                  </div>
                </label>
              </div>
            </div>



            {/* Database & Export Section - Full Width */}
            <div className='col-span-2 bg-studio-text/5 p-6 border-2 border-dashed border-studio-border rounded-3xl space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3 text-studio-text'>
                  <span className='text-xl'>🗄️</span>
                  <span className='font-display font-black italic tracking-widest uppercase text-xs'>Manajemen Data Utama</span>
                </div>
                <div className='px-4 py-1.5 bg-studio-primary/10 rounded-full border border-studio-primary/20'>
                   <p className='text-[0.6rem] text-studio-primary font-black uppercase tracking-widest italic'>
                     Secured Database
                   </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <button
                  onClick={handleExport}
                  disabled={isLoading}
                  className='flex flex-col items-center justify-center gap-2 bg-white hover:bg-studio-primary hover:text-white disabled:opacity-50 p-6 border-2 border-studio-border rounded-2xl w-full text-studio-text transition-all group shadow-sm'
                >
                  <span className='text-3xl group-hover:scale-110 transition-transform'>📊</span>
                  <span className='font-display font-black text-sm uppercase tracking-widest italic'>Export Sesi (Excel)</span>
                  <p className='text-[0.55rem] font-bold opacity-40 uppercase tracking-widest'>Google Sheets API</p>
                </button>

                <button
                  onClick={handleClearDatabase}
                  disabled={isLoading}
                  className='flex flex-col items-center justify-center gap-2 bg-white hover:bg-red-600 hover:text-white disabled:opacity-50 p-6 border-2 border-studio-border rounded-2xl w-full text-studio-text transition-all group shadow-sm'
                >
                  <Trash2 size={32} className='group-hover:scale-110 transition-transform' />
                  <span className='font-display font-black text-sm uppercase tracking-widest italic'>Reset Semua Data</span>
                  <p className='text-[0.55rem] font-bold opacity-40 uppercase tracking-widest'>Clear Database History</p>
                </button>
              </div>
            </div>

            {/* System Info - spans 2 columns */}
            <div className='col-span-2 pt-6 opacity-40 text-studio-textLight text-[0.6rem] font-mono text-center space-y-1 uppercase tracking-widest'>
              <p>Storage: ~/RuaRasaBooth/photos/</p>
              <p>Tunnel Status: <span className={import.meta.env.VITE_TUNNEL_URL ? 'text-green-600' : 'text-red-500'}>{import.meta.env.VITE_TUNNEL_URL ? 'ACTIVE' : 'INACTIVE'}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification - Premium Studio Style */}
      {message && (
        <div
          className={`fixed bottom-12 left-1/2 -translate-x-1/2 px-10 py-5 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] backdrop-blur-md flex items-center gap-4 animate-slide-up z-110 border-2 ${
            message.type === 'success'
              ? 'bg-studio-primary/95 text-white border-white/20'
              : 'bg-red-600/95 text-white border-white/20'
          }`}
        >
          <div className='bg-white/20 p-2 rounded-lg'>
             {message.type === 'success' ? <CheckCircle2 size={24} /> : <X size={24} />}
          </div>
          <span className='font-display font-black text-lg uppercase tracking-widest italic'>{message.text}</span>
        </div>
      )}
    </div>
  )
}
