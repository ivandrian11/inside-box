import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useBooth } from '@/hooks/useBooth'
import { AppStep } from '@/types'
import { downloadImage } from '@/services/templateService'
import {
  saveSessionPhotos,
  SessionSaveResult,
} from '@/services/localStorageService'
import {
  uploadSessionToDrive,
  UploadProgressInfo,
} from '@/services/googleDriveService'
import {
  logSession,
  getPlace,
  getSessionDurationMinutes,
  getSessionPriceThousands,
  updateSessionDriveUrl,
} from '@/services/databaseService'
import { startTourReview, startTourDone } from '@/services/tourService'
import { EFFECT_CLASSES } from '@/constants'

// Sub-components
import { ResultView } from './components/ResultView'
import { ReviewView } from './components/ReviewView'
import { ErrorModal } from '@/components/modals/ErrorModal'
import { ConfirmationModal } from '@/components/modals/ConfirmationModal'

export const StepReview: React.FC = () => {
  const {
    photos,
    setPhotoIndex,
    setStep,
    selectedFeature,
    selectedTemplate,
    selectedBackground,
    step,
    selectedEffect,
    compositeResult,
    ticketCode,
    autoPrintSuccess,
    setAutoPrintSuccess,
    togglePhotoFlip,
    isTimeout,
    timeLeft,
    setPhotos,
    selectedSequence,
    setSelectedSequence,
    totalShots,
  } = useBooth()

  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<SessionSaveResult | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [uploadProgressInfo, setUploadProgressInfo] = useState<UploadProgressInfo | null>(null)
  
  // Track if saving has been initiated to prevent race conditions / duplicate runs
  const saveInitiatedRef = useRef(false)

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    details: string
  }>({ isOpen: false, title: '', message: '', details: '' })

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    details: string
    onConfirm: () => void
    isWarning?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: '',
    onConfirm: () => {},
  })


  // Check debug mode from admin settings
  const [isDebugMode, setIsDebugMode] = useState(false)
  useEffect(() => {
    const debug = localStorage.getItem('debugMode') === 'true'
    setIsDebugMode(debug)
  }, [])



  // Trigger Tour when Review Step is active
  useEffect(() => {
    let t_tour: number
    if (step === AppStep.REVIEW) {
      t_tour = window.setTimeout(startTourReview, 1000)
    }
    return () => {
      clearTimeout(t_tour)
    }
  }, [step])

  // Check printed status from localStorage
  useEffect(() => {
    if (ticketCode) {
      const isPrinted = localStorage.getItem(`printed_${ticketCode}`) === 'true'
      if (isPrinted) {
        setAutoPrintSuccess(true)
      }
    }
  }, [ticketCode, setAutoPrintSuccess])

  // State untuk kontrol visibilitas menu cetak (Hidden by default)
  const [printMenuUnlocked, setPrintMenuUnlocked] = useState(false)

  // Secret unlock for print button (5x click)
  const [enableClickCount, setEnableClickCount] = useState(0)
  const handleSecretUnlock = () => {
    const newCount = enableClickCount + 1
    setEnableClickCount(newCount)
    if (newCount >= 5) {
      setPrintMenuUnlocked(true)
      setAutoPrintSuccess(false) // Reset status print juga jika ingin re-print
      if (ticketCode) {
        localStorage.removeItem(`printed_${ticketCode}`)
      }
      setEnableClickCount(0)
      alert('Menu Cetak ditampilkan!')
    }
  }

  // Listen to Global Secret Unlock event
  useEffect(() => {
    const handleGlobalSecretUnlock = () => {
      if (step === AppStep.RESULT) {
        handleSecretUnlock()
      }
    }
    window.addEventListener('global-secret-unlock', handleGlobalSecretUnlock)
    return () =>
      window.removeEventListener(
        'global-secret-unlock',
        handleGlobalSecretUnlock,
      )
  }, [step, handleSecretUnlock])

  // Track if session has been logged to database (use ref to prevent re-renders causing duplicates)
  const sessionLoggedRef = useRef(false)

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Auto print when step becomes RESULT
  useEffect(() => {
    if (step === AppStep.RESULT && ticketCode) {
      // Delay slightly to ensure file is saved
      const timer = setTimeout(async () => {
        try {
          console.log('🖨️ Auto printing ticket:', ticketCode)
          setIsPrinting(true)
          await invoke('print_ticket_result', { ticketCode })
        } catch (error) {
          console.error('Auto print failed:', error)
          alert('Gagal mencetak otomatis. Silakan lapor petugas.')
        } finally {
          setIsPrinting(false)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step, ticketCode])


  const handleFinish = () => {
    setStep(AppStep.ARRANGE)
  }

  // Auto-save when entering RESULT step
  useEffect(() => {
    if (step !== AppStep.RESULT) {
      saveInitiatedRef.current = false
      return
    }

    if (
      step === AppStep.RESULT &&
      compositeResult &&
      !saveResult &&
      !isSaving &&
      ticketCode &&
      !saveInitiatedRef.current
    ) {
      saveInitiatedRef.current = true
      handleSavePhotos()
    }
  }, [step, compositeResult, ticketCode, saveResult, isSaving])

  // Log session to database when entering RESULT step
  useEffect(() => {
    const logSessionToDb = async () => {
      // Use ref to prevent duplicate logging (React Strict Mode or re-renders)
      if (step === AppStep.RESULT && ticketCode && !sessionLoggedRef.current) {
        // Set immediately to prevent race conditions
        sessionLoggedRef.current = true

        try {
          const settingDurationMinutes = await getSessionDurationMinutes()
          const settingDurationSeconds = settingDurationMinutes * 60

          // Calculate actual duration used in SECONDS
          let actualDurationSeconds = settingDurationSeconds
          if (timeLeft !== undefined) {
            actualDurationSeconds = Math.max(
              1,
              settingDurationSeconds - timeLeft,
            )
          }

          const sessionPrice = await getSessionPriceThousands()

          // Get template name
          const templateName = selectedTemplate?.name || null

          // Get booth place setting
          const placeSetting = await getPlace()

          await logSession(
            ticketCode,
            templateName,
            selectedEffect || null, // filterUsed
            totalShots,
            placeSetting || null,
            sessionPrice,
            settingDurationSeconds, // Saved in Seconds
            actualDurationSeconds, // Saved in Seconds
          )

          console.log('📊 Session logged to database:', ticketCode)
        } catch (error) {
          console.error('Failed to log session:', error)
          // Reset ref on error so it can retry
          sessionLoggedRef.current = false
        }
      }
    }

    logSessionToDb()
  }, [step, ticketCode, photos, selectedTemplate, selectedBackground])

  const handleSavePhotos = async () => {
    if (!compositeResult || !ticketCode) return

    setIsSaving(true)
    try {
      // Get original photos
      const originalPhotos = photos
        .filter((p) => p !== null)
        .map((p) => p!.original)

      // Save locally first
      const localResult = await saveSessionPhotos(
        ticketCode,
        originalPhotos,
        compositeResult,
      )

      // Upload to Google Drive in parallel
      let driveUrl: string | undefined
      try {
        driveUrl = await uploadSessionToDrive(
          ticketCode,
          originalPhotos,
          compositeResult,
          (progress) => {
            setUploadProgressInfo(progress)
          }
        )
        if (driveUrl) {
          await updateSessionDriveUrl(ticketCode, driveUrl)
          console.log('✅ Google Drive URL successfully saved to database:', driveUrl)
        }
      } catch (uploadError) {
        console.error('Google Drive upload failed:', uploadError)
        setUploadProgressInfo(prev => prev ? {
          ...prev,
          status: 'error',
          message: `Gagal mengunggah ke Drive: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`
        } : null)
      }

      // Combine local and drive result
      const finalResult: SessionSaveResult = {
        ...localResult,
        driveUrl,
      }

      setSaveResult(finalResult)
      console.log('Save complete with Drive:', finalResult)
    } catch (error) {
      console.error('Save failed:', error)
      alert('Gagal menyimpan foto. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    if (compositeResult) {
      const filename = `ruarasa-booth-${new Date()
        .toISOString()
        .slice(0, 10)}.png`
      downloadImage(compositeResult, filename)
      // Show success notification
      setToast({ message: 'Foto berhasil diunduh!', type: 'success' })
    }
  }

  const handlePrint = async () => {
    if (ticketCode) {
      try {
        setIsPrinting(true)
        await invoke('print_ticket_result', { ticketCode })
        console.log('🖨️ Session printed:', ticketCode)

        // Set auto print success to disable buttons
        setAutoPrintSuccess(true)
        // Persist to localStorage
        localStorage.setItem(`printed_${ticketCode}`, 'true')
      } catch (error) {
        console.error('Print failed:', error)
        setToast({
          message: 'Gagal mencetak. Silakan coba lagi.',
          type: 'error',
        })
      } finally {
        setIsPrinting(false)
      }
    }
  }

  const handleNewSession = () => {
    window.location.reload()
  }

  // Effect to trigger Done Tour when ready
  useEffect(() => {
    let t_tour: number
    if (step === AppStep.RESULT && saveResult && !isSaving) {
      t_tour = window.setTimeout(() => {
        startTourDone()
      }, 1000)
    }
    return () => clearTimeout(t_tour)
  }, [step, saveResult, isSaving])

  // Effect class mapping
  const currentEffectClass = EFFECT_CLASSES[selectedEffect] || ''

  // RESULT VIEW - Show composited image with QR code
  if (step === AppStep.RESULT) {
    return (
      <ResultView
        compositeResult={compositeResult || null}
        saveResult={saveResult}
        isSaving={isSaving}
        isPrinting={isPrinting}
        printMenuUnlocked={printMenuUnlocked}
        autoPrintSuccess={autoPrintSuccess}
        ticketCode={ticketCode || null}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onNewSession={handleNewSession}
        onSecretUnlock={handleSecretUnlock}
        uploadProgressInfo={uploadProgressInfo}
        debugModeInfo={{
          isDebugMode,
          clickCount: enableClickCount,
        }}
      />
    )
  }

  // REVIEW VIEW - Edit individual photos
  return (
    <>
      <ReviewView
        photos={photos}
        setPhotos={setPhotos as any}
        handleRetake={(index: number) => setPhotoIndex(index)}
        toggleFlip={togglePhotoFlip}
        handleFinish={handleFinish}
        isTimeout={isTimeout}
        isDebugMode={isDebugMode}
        selectedFeature={selectedFeature}
        currentEffectClass={currentEffectClass}
        selectedTemplate={selectedTemplate}
        selectedSequence={selectedSequence}
        setSelectedSequence={setSelectedSequence}
        setToast={setToast}
      />
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in z-100 ${
            toast.type === 'success'
              ? 'bg-green-600/90 text-white'
              : 'bg-red-600/90 text-white'
          }`}
        >
          <span className='text-2xl'>
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <span className='font-medium'>{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        isWarning={confirmModal.isWarning}
        onConfirm={() => {
          confirmModal.onConfirm()
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Error Modal */}
      <ErrorModal
        data={errorModal}
        onClose={() =>
          setErrorModal({
            isOpen: false,
            title: '',
            message: '',
            details: '',
          })
        }
      />
    </>
  )
}
