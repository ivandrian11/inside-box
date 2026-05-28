import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, Settings, LogOut, CheckCircle2 } from 'lucide-react'
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
  exportNewSessions,
  getPlace,
  setPlace,
  GOOGLE_SCRIPT_URL,
} from '@/services/databaseService'
import { PinAuth } from './components/PinAuth'
import { AdminDashboard } from './components/AdminDashboard'

interface CameraDevice {
  id: string
  label: string
}

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

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

  const [sessionDuration, setSessionDuration] = useState<number>(() => {
    const saved = localStorage.getItem('sessionDurationMinutes')
    return saved ? parseInt(saved, 10) : 10
  })

  const [sessionPrice, setSessionPrice] = useState<number>(() => {
    const saved = localStorage.getItem('sessionPriceThousands')
    return saved ? parseInt(saved, 10) : 25
  })

  const [showPin, setShowPin] = useState(false)
  const [debugMode, setDebugModeState] = useState(false)
  const [place, setPlaceState] = useState<string>('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const [timerScope, setTimerScope] = useState<string>(() => {
    return localStorage.getItem('sessionTimerScope') || 'STEP_03_ONLY'
  })

  const [flipHorizontal, setFlipHorizontalState] = useState<boolean>(() => {
    return localStorage.getItem('flipHorizontal') === 'true'
  })
  const [flipVertical, setFlipVerticalState] = useState<boolean>(() => {
    return localStorage.getItem('flipVertical') === 'true'
  })
  const [isPortrait, setIsPortraitState] = useState<boolean>(() => {
    return localStorage.getItem('isPortrait') === 'true'
  })

  useEffect(() => {
    if (isOpen) {
      loadCameras()
      loadSelectedCamera()
      loadSessionDuration()
      loadSessionPrice()
      loadPlaceSetting()
      loadDebugMode()
      loadTimerScope()
      loadCameraSettings()
    }
  }, [isOpen])

  const loadCameraSettings = async () => {
    const flipH = await getFlipHorizontal()
    const flipV = await getFlipVertical()
    const portrait = await getIsPortrait()
    setFlipHorizontalState(flipH)
    setFlipVerticalState(flipV)
    setIsPortraitState(portrait)
  }

  const loadTimerScope = async () => {
    const { getSessionTimerScope } = await import('@/services/databaseService')
    const saved = await getSessionTimerScope()
    setTimerScope(saved)
  }

  const handleTimerScopeChange = async (scope: string) => {
    const { setSessionTimerScope } = await import('@/services/databaseService')
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
    localStorage.setItem('sessionPriceThousands', priceInThousands.toString())
    showMessage('success', `Harga sesi diubah ke Rp ${priceInThousands}.000`)
  }

  const loadPlaceSetting = async () => {
    const saved = await getPlace()
    setPlaceState(saved)
  }

  const handlePlaceChange = async (val: string) => {
    setPlaceState(val)
    await setPlace(val)
  }

  const loadDebugMode = async () => {
    const saved = await getDebugMode()
    setDebugModeState(saved)
    localStorage.setItem('debugMode', saved.toString())
  }

  const handleDebugModeChange = async (enabled: boolean) => {
    setDebugModeState(enabled)
    await setDebugMode(enabled)
    localStorage.setItem('debugMode', enabled.toString())
    showMessage(
      'success',
      `Debug Mode ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
    )
  }

  const loadCameras = async () => {
    try {
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

  const startPreview = async (cameraId?: string) => {
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

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop())
      setPreviewStream(null)
    }
  }

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  useEffect(() => {
    if (!isOpen) {
      stopPreview()
    }
  }, [isOpen])

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId)
    await setSelectedCameraId(cameraId)
    localStorage.setItem('selectedCameraId', cameraId)
    window.dispatchEvent(new Event('camera-settings-changed'))
    showMessage('success', 'Kamera berhasil dipilih')
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
    if (!GOOGLE_SCRIPT_URL) {
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

      const result = await exportToGoogleSheet(GOOGLE_SCRIPT_URL, dataToExport)
      if (result.includes('Berhasil')) {
        showMessage('success', result)

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

  const handleExitApp = async () => {
    setIsLoading(true)

    try {
      showMessage('success', '📤 Menyimpan data sesi baru...')
      if (GOOGLE_SCRIPT_URL) {
        console.log(`📤 [Exit] Checking and exporting new sessions before exit...`)
        const result = await exportNewSessions(GOOGLE_SCRIPT_URL)
        console.log(`[Exit Export Result]: ${result}`)
        showMessage('success', `✅ Data sesi berhasil disinkronkan. Menutup aplikasi...`)
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }
    } catch (exportError) {
      console.error('Failed to export before exit:', exportError)
    }

    try {
      await invoke('exit_app')
    } catch (err) {
      console.error('Exit command failed:', err)
      setIsLoading(false)
    }
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
      <div className={`relative bg-white shadow-[-60px_60px_120px_rgba(0,0,0,0.15)] m-4 p-6 md:p-8 border border-studio-border rounded-[2.5rem] w-full transition-all duration-500 animate-scale-in ${
        isAuthenticated ? 'max-w-4xl max-h-[95vh] overflow-y-auto no-scrollbar' : 'max-w-md overflow-hidden'
      }`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className='top-6 right-6 absolute flex justify-center items-center bg-studio-bg hover:bg-studio-primary/10 rounded-full w-12 h-12 text-studio-textLight hover:text-studio-primary transition-all duration-300'
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className='flex items-center gap-4 mb-6'>
          <div className='bg-studio-primary/10 p-4 rounded-2xl'>
            <Settings className='text-studio-primary' size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className='font-display font-medium text-studio-text text-3xl italic tracking-tight'>Admin Panel</h2>
            <p className='font-bold text-studio-textLight text-[0.65rem] uppercase tracking-[0.3em] italic'>Konfigurasi Sistem Utama</p>
          </div>
        </div>

        {/* Dynamic Inner Panel View */}
        {!isAuthenticated ? (
          <PinAuth
            pinInput={pinInput}
            setPinInput={setPinInput}
            pinError={pinError}
            showPin={showPin}
            setShowPin={setShowPin}
            handlePinSubmit={handlePinSubmit}
            setShowExitConfirm={setShowExitConfirm}
          />
        ) : (
          <AdminDashboard
            cameras={cameras}
            selectedCamera={selectedCamera}
            handleCameraChange={handleCameraChange}
            flipHorizontal={flipHorizontal}
            handleFlipHorizontalChange={handleFlipHorizontalChange}
            flipVertical={flipVertical}
            handleFlipVerticalChange={handleFlipVerticalChange}
            isPortrait={isPortrait}
            handleIsPortraitChange={handleIsPortraitChange}
            previewStream={previewStream}
            videoRef={videoRef}
            startPreview={startPreview}
            stopPreview={stopPreview}
            loadCameras={loadCameras}
            sessionDuration={sessionDuration}
            handleDurationChange={handleDurationChange}
            timerScope={timerScope}
            handleTimerScopeChange={handleTimerScopeChange}
            sessionPrice={sessionPrice}
            handlePriceChange={handlePriceChange}
            place={place}
            handlePlaceChange={handlePlaceChange}
            isLoading={isLoading}
            handleDeleteTodayPhotos={handleDeleteTodayPhotos}
            handleDeleteYesterdayPhotos={handleDeleteYesterdayPhotos}
            handleDeleteOldPhotos={handleDeleteOldPhotos}
            handleRefreshApp={handleRefreshApp}
            debugMode={debugMode}
            handleDebugModeChange={handleDebugModeChange}
            handleExport={handleExport}
            handleClearDatabase={handleClearDatabase}
          />
        )}
      </div>

      {/* Shutdown confirmation overlay */}
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
                disabled={isLoading}
                className='flex-1 bg-studio-bg hover:bg-studio-border disabled:opacity-40 py-4 rounded-xl font-bold text-studio-text transition-all'
              >
                Batal
              </button>
              <button
                onClick={handleExitApp}
                disabled={isLoading}
                className='flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:scale-105'
              >
                {isLoading ? '⏳ Menyimpan...' : 'Ya, Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Notifications */}
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
