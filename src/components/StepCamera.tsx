import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useBooth } from '../hooks/usePhotoBooth'
import { listen } from '@tauri-apps/api/event'
import { getPublicRemoteUrl, syncRemoteStep } from '../services/tunnelService'
import { startTourCamera } from '../services/tourService'

// Sub-components
import { CameraControls } from './StepCamera/CameraControls'
import { RemoteQRModal } from './StepCamera/RemoteQRModal'
import { Viewfinder } from './StepCamera/Viewfinder'
import { BottomBar } from './StepCamera/BottomBar'
import { PhotoPreviewModal } from './StepCamera/PhotoPreviewModal'

export const StepCamera: React.FC = () => {
  const {
    currentPhotoIndex,
    photos,
    savePhoto,
    selectedTemplate,
    setPhotoIndex,
    ticketCode,
    timeLeft,
    setTimerPaused,
  } = useBooth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null) // For cleanup
  const timerAudioRef = useRef<HTMLAudioElement | null>(null) // Timer sound
  const [countdown, setCountdown] = useState<number | null>(null)

  // Camera Selection State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [showDeviceMenu, setShowDeviceMenu] = useState(false)
  const [activeCameraId, setActiveCameraId] = useState<string | null>(() => {
    return localStorage.getItem('selectedCameraId')
  })

  // Enumerate Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices()
        setVideoDevices(devs.filter((d) => d.kind === 'videoinput'))
      } catch (err) {
        console.error('Error listing devices:', err)
      }
    }
    getDevices()

    // Listen for device changes (plug/unplug)
    navigator.mediaDevices.addEventListener('devicechange', getDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices)
    }
  }, [])

  // QR Code remote control - prefer tunnel URL, fallback to local
  const [showQR, setShowQR] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)
  const remoteUrl = ticketCode
    ? getPublicRemoteUrl(ticketCode) ||
      `http://${window.location.hostname}:3847/remote/${ticketCode}`
    : ''

  // Camera flip options
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(() => {
    return localStorage.getItem('flipHorizontal') === 'true'
  })
  const [flipVertical, setFlipVertical] = useState<boolean>(() => {
    return localStorage.getItem('flipVertical') === 'true'
  })

  // Portrait mode state
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    return localStorage.getItem('isPortrait') === 'true'
  })

  // Debug mode (read from localStorage)
  const debugMode = localStorage.getItem('debugMode') === 'true'

  // Sync states to localStorage
  useEffect(() => {
    localStorage.setItem('flipHorizontal', flipHorizontal.toString())
  }, [flipHorizontal])

  useEffect(() => {
    localStorage.setItem('flipVertical', flipVertical.toString())
  }, [flipVertical])

  useEffect(() => {
    localStorage.setItem('isPortrait', isPortrait.toString())
  }, [isPortrait])

  // Sync state to backend (Mirroring state for Remote)
  useEffect(() => {
    if (!ticketCode) return

    fetch(`http://127.0.0.1:3847/booth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_code: ticketCode,
        action: 'sync',
        state: {
          flip_h: flipHorizontal,
          flip_v: flipVertical,
          is_portrait: isPortrait,
        },
      }),
    }).catch((err) => console.error('State sync error:', err))
  }, [ticketCode, flipHorizontal, flipVertical, isPortrait])

  // Toggle flip horizontal (Using functional update to avoid stale closures)
  const toggleFlipH = useCallback(() => {
    setFlipHorizontal((prev) => !prev)
  }, [])

  // Toggle flip vertical
  const toggleFlipV = useCallback(() => {
    setFlipVertical((prev) => !prev)
  }, [])

  // Toggle portrait orientation
  const togglePortrait = useCallback(() => {
    setIsPortrait((prev) => !prev)
  }, [])

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      // Cleanup previous stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }

      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        }

        // Use specific camera if configured, otherwise use front-facing camera
        if (activeCameraId) {
          videoConstraints.deviceId = { exact: activeCameraId }
        } else {
          videoConstraints.facingMode = 'user'
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })

        streamRef.current = mediaStream // Store in ref for cleanup
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error('Error accessing camera:', err)
        // If specific camera fails, try with default
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: 'user',
            },
            audio: false,
          })
          streamRef.current = mediaStream
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
          }
        } catch (fallbackErr) {
          console.error('Fallback camera also failed:', fallbackErr)
          alert('Gagal mengakses kamera.')
        }
      }
    }
    startCamera()

    // Start tour
    const t_tour = setTimeout(() => {
      setTimerPaused(true)
      startTourCamera(() => {
        setTimerPaused(false)
      })
    }, 1000)

    // Cleanup: Stop camera when component unmounts
    return () => {
      clearTimeout(t_tour)
      console.log('🎥 Stopping camera stream...')
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
        streamRef.current = null
      }
    }
  }, [activeCameraId])

  // Sync step to backend for remote
  useEffect(() => {
    if (ticketCode && selectedTemplate) {
      syncRemoteStep(ticketCode, 'capture', selectedTemplate.photoCount)
    }
  }, [ticketCode, selectedTemplate])

  // Listen for remote capture events from phone
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      try {
        unlisten = await listen<{
          ticket_code: string
          action: string
          state?: { flip_h: boolean; flip_v: boolean; is_portrait: boolean }
        }>('remote-capture', (event) => {
          console.log('📱 Remote command received:', event.payload)
          const { action, state } = event.payload

          // If state is provided (server is source of truth), sync absolutely
          if (state) {
            setFlipHorizontal(state.flip_h)
            setFlipVertical(state.flip_v)
            setIsPortrait(state.is_portrait)
          } else {
            // Fallback to local toggle if no state provided
            switch (action) {
              case 'flip_h':
                toggleFlipH()
                break
              case 'flip_v':
                toggleFlipV()
                break
              case 'toggle_portrait':
                togglePortrait()
                break
            }
          }

          // Handle capture trigger independently of state sync
          if (action === 'capture') {
            if (countdown === null) {
              // Play timer sound (same as local capture)
              if (timerAudioRef.current) {
                timerAudioRef.current.currentTime = 0
                timerAudioRef.current.play().catch(() => {})
              }
              setCountdown(3)
            }
          }
        })
        console.log('📱 Remote listener ready')
      } catch (error) {
        console.error('Failed to setup remote listener:', error)
      }
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [countdown, toggleFlipH, toggleFlipV, togglePortrait])

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (context) {
        const vw = video.videoWidth
        const vh = video.videoHeight

        if (isPortrait) {
          // Portrait Mode: Rotated 90 degrees (Full Sensor / No Crop)
          // Swap dimensions
          canvas.width = vh
          canvas.height = vw

          context.save()

          // Move origin to center of canvas for rotation
          context.translate(canvas.width / 2, canvas.height / 2)

          // Rotate -90 degrees (counter-clockwise)
          context.rotate(-Math.PI / 2)

          // Apply flips relative to the rotated coordinate system
          // Note: After -90deg rotation:
          // - Local X axis is now Vertical on screen
          // - Local Y axis is now Horizontal on screen

          // Flip Horizontal (affects screen Horizontal / local Y)
          const scaleY = flipHorizontal ? 1 : -1
          // Flip Vertical (affects screen Vertical / local X)
          const scaleX = flipVertical ? -1 : 1

          context.scale(scaleX, scaleY)

          // Draw image centered
          context.drawImage(video, -vw / 2, -vh / 2, vw, vh)
        } else {
          // Landscape Mode: 16:9 (Native)
          canvas.width = vw
          canvas.height = vh

          context.save()

          const scaleX = flipHorizontal ? 1 : -1
          const scaleY = flipVertical ? -1 : 1

          if (scaleX === -1) context.translate(canvas.width, 0)
          if (scaleY === -1) context.translate(0, canvas.height)
          context.scale(scaleX, scaleY)

          context.drawImage(video, 0, 0, vw, vh)
        }

        context.restore()

        // Use maximum quality (1.0) instead of 0.9 for HD results
        savePhoto(canvas.toDataURL('image/jpeg', 1.0))
      }
    }
  }, [savePhoto, flipHorizontal, flipVertical, isPortrait])
  const startCountdown = () => {
    // Play timer sound once at start
    if (timerAudioRef.current) {
      timerAudioRef.current.currentTime = 0
      timerAudioRef.current.play().catch(() => {})
    }
    setCountdown(3)
  }

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      capture()
      setCountdown(null)
    }
  }, [countdown, capture])

  const capturedAt0 = useRef(false)

  // Reset capturedAt0 when timer resets (e.g. > 0)
  useEffect(() => {
    if (timeLeft > 0) capturedAt0.current = false
  }, [timeLeft])

  // Auto-capture when session timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !capturedAt0.current) {
      capturedAt0.current = true // Mark as handled for this session end

      // Logic:
      // 1. If slot is empty -> Force Capture
      // 2. If slot has photo (Retake) -> Do NOTHING
      if (!photos[currentPhotoIndex]) {
        console.log('⏰ Session time up! Forcing capture on empty slot...')
        capture()
      } else {
        console.log('⏰ Session time up! Retake skipped, keeping original.')
      }
      setCountdown(null)
    }
  }, [timeLeft, capture, photos, currentPhotoIndex])
  const handleThumbnailClick = (index: number) => {
    // Only allow clicking if we are not currently counting down
    if (countdown === null) {
      setPhotoIndex(index)
    }
  }

  // DEVELOPMENT TOOL: Skip/Auto-fill photos
  const handleDevFill = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return

    // Capture current frame
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5)

    // Calculate how many needed
    const total = selectedTemplate?.photoCount || 0
    let needed = total - photos.filter(Boolean).length

    // Also count the current slot if it's empty/being retaken (logic approximate)
    // Safer: just fire N times where N is remaining slots from current index
    // Using a reliable interval loop

    let count = 0
    const interval = setInterval(() => {
      if (count >= needed) {
        clearInterval(interval)
      } else {
        savePhoto(dataUrl)
        count++
      }
    }, 150) // Fast interval
  }

  return (
    <div className='relative flex flex-col justify-center items-center pt-14 pb-6 px-6 w-full h-full'>
      {/* Sidebar Controls - Unified Container */}
      <CameraControls
        showDeviceMenu={showDeviceMenu}
        setShowDeviceMenu={setShowDeviceMenu}
        videoDevices={videoDevices}
        activeCameraId={activeCameraId}
        setActiveCameraId={setActiveCameraId}
        flipHorizontal={flipHorizontal}
        toggleFlipH={toggleFlipH}
        flipVertical={flipVertical}
        toggleFlipV={toggleFlipV}
        showQR={showQR}
        setShowQR={setShowQR}
        isPortrait={isPortrait}
        togglePortrait={togglePortrait}
      />

      {/* QR Code Modal (Click outside to close) */}
      <RemoteQRModal
        showQR={showQR}
        setShowQR={setShowQR}
        remoteUrl={remoteUrl}
      />

      {/* Viewfinder Container */}
      <Viewfinder
        videoRef={videoRef}
        canvasRef={canvasRef}
        timerAudioRef={timerAudioRef}
        isPortrait={isPortrait}
        flipHorizontal={flipHorizontal}
        flipVertical={flipVertical}
        debugMode={debugMode}
        handleDevFill={handleDevFill}
        currentPhotoIndex={currentPhotoIndex}
        selectedTemplate={selectedTemplate}
        photos={photos}
        countdown={countdown}
      />

      {/* Bottom Controls Bar */}
      <BottomBar
        isPortrait={isPortrait}
        selectedTemplate={selectedTemplate}
        currentPhotoIndex={currentPhotoIndex}
        photos={photos}
        handleThumbnailClick={handleThumbnailClick}
        countdown={countdown}
        startCountdown={startCountdown}
        setPreviewPhoto={setPreviewPhoto}
      />

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        previewPhoto={previewPhoto}
        setPreviewPhoto={setPreviewPhoto}
      />
    </div>
  )
}
