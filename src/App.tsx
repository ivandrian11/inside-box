import React, { useEffect, useState } from 'react'
import { BoothProvider, useBooth } from '@/hooks/useBooth'
import { Layout } from '@/components/layout/Layout'
import { StepPayment } from '@/features/payment'
import { StepSelection } from '@/features/selection'
import { StepCamera } from '@/features/camera'
import { StepReview } from '@/features/review'
import { StepConfirmation } from '@/features/confirmation'
import { StepArrange } from '@/features/arrange'
import { Home } from '@/features/home'
import { AppStep } from '@/types'
import { Clock } from 'lucide-react'
import { setSetting, SettingKeys } from '@/services/databaseService'
import './App.css'

const BoothContent: React.FC = () => {
  const {
    step,
    isTimeout,
    ackTimeout,
    showTimeoutModal,
  } = useBooth()

  const [isExiting, setIsExiting] = useState(false)

  // Auto-export on window close request
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupCloseListener = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const { exportNewSessions, GOOGLE_SCRIPT_URL } = await import('@/services/databaseService')
        const { invoke } = await import('@tauri-apps/api/core')

        const appWindow = getCurrentWindow()
        
        const removeListener = await appWindow.onCloseRequested(async (event) => {
          // Prevent immediate close
          event.preventDefault()
          
          setIsExiting(true)
          
          try {
            if (GOOGLE_SCRIPT_URL) {
              console.log(`📤 [Auto-Export] Checking and exporting new sessions before exit...`)
              const result = await exportNewSessions(GOOGLE_SCRIPT_URL)
              console.log(`[Auto-Export Result]: ${result}`)
            }
          } catch (err) {
            console.error('Failed to auto-export sessions on window close:', err)
          } finally {
            // Close the application process
            await invoke('exit_app')
          }
        })
        
        unlisten = removeListener
      } catch (error) {
        console.log('Not running in Tauri environment, window close handler skipped')
      }
    }

    setupCloseListener()

    return () => {
      if (unlisten) unlisten()
    }
  }, [])

  // Sync environment variables to database on startup
  useEffect(() => {
    const syncEnvSettings = async () => {
      // Sync Xendit Secret Key
      const xenditKey = import.meta.env.VITE_XENDIT_SECRET_KEY
      if (xenditKey) {
        await setSetting(SettingKeys.XENDIT_SECRET_KEY, xenditKey)
        console.log('✅ Synced Xendit Secret Key from ENV')
      }
    }

    syncEnvSettings()
  }, [])

  // Handle keyboard shortcuts for fullscreen toggle (Ctrl+Escape to exit)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl + Escape to exit fullscreen (for maintenance)
      if (e.ctrlKey && e.key === 'Escape') {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          const appWindow = getCurrentWindow()
          const isFullscreen = await appWindow.isFullscreen()
          await appWindow.setFullscreen(!isFullscreen)
        } catch (error) {
          console.log('Not running in Tauri environment')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Determine if we need back button functionality
  const showBack =
    !isTimeout &&
    step !== AppStep.HOME &&
    step !== AppStep.RESULT &&
    step !== AppStep.PAYMENT &&
    step !== AppStep.TEMPLATE_SELECT &&
    step !== AppStep.CAMERA // Hide back button on Camera

  // Define titles for header based on step
  const getStepTitle = () => {
    switch (step) {
      case AppStep.TEMPLATE_SELECT:
        return { main: 'Choose Template', sub: 'Step 01' }
      case AppStep.CONFIRMATION:
        return { main: 'Summary', sub: 'Step 02' }
      case AppStep.CAMERA:
        return { main: 'Capture', sub: 'Step 03' }
      case AppStep.REVIEW:
        return { main: 'Edit & Review', sub: 'Step 04' }
      case AppStep.ARRANGE:
        return { main: 'Atur Posisi', sub: 'Step 05' }
      default:
        return undefined
    }
  }

  const renderStep = () => {
    switch (step) {
      case AppStep.HOME:
        return <Home />
      case AppStep.PAYMENT:
        return <StepPayment />
      case AppStep.TEMPLATE_SELECT:
      case AppStep.FEATURE_SELECT:
        return <StepSelection />
      case AppStep.CONFIRMATION:
        return <StepConfirmation />
      case AppStep.CAMERA:
        return <StepCamera />
      case AppStep.REVIEW:
      case AppStep.RESULT:
        return <StepReview />
      case AppStep.ARRANGE:
        return <StepArrange />
      default:
        return null
    }
  }

  return (
    <>
      <Layout
        title={undefined}
        showBack={showBack}
        stepTitle={getStepTitle()}
      >
        {renderStep()}
  
        {/* Timeout Modal */}
        {showTimeoutModal && (
          <div className='z-999 fixed inset-0 flex justify-center items-center bg-studio-text/40 backdrop-blur-sm p-8 animate-fade-in'>
            <div className='relative bg-white shadow-2xl p-10 border border-studio-border rounded-3xl w-full max-w-lg overflow-hidden text-center'>
              <div className='z-10 relative flex flex-col items-center gap-6'>
                <div className='flex justify-center items-center bg-studio-bg mb-2 rounded-full w-20 h-20'>
                  <Clock size={40} className='text-studio-primary' />
                </div>
  
                <h2 className='font-display text-studio-text text-4xl italic'>
                  Waktu Habis!
                </h2>
  
                <p className='text-studio-textLight'>
                  Jangan khawatir! Kami telah menyimpan progress Anda. Silakan
                  lanjutkan proses editing.
                </p>
  
                <button
                  onClick={ackTimeout}
                  className='bg-studio-primary shadow-lg shadow-studio-primary/20 px-10 py-4 rounded-full font-bold text-white text-lg hover:scale-105 transition-all'
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
  
      {/* Premium Exiting Loader Overlay */}
      {isExiting && (
        <div className='z-[9999] fixed inset-0 flex flex-col justify-center items-center bg-slate-950/90 backdrop-blur-2xl text-white animate-fade-in'>
          <div className='flex flex-col items-center gap-6 p-10 max-w-md text-center animate-scale-in'>
            <div className='relative w-24 h-24 flex items-center justify-center'>
              <div className='absolute inset-0 rounded-full border-4 border-white/10 border-t-studio-primary animate-spin'></div>
              <span className='text-4xl animate-pulse'>📊</span>
            </div>
            <div>
              <h2 className='font-display font-black text-3xl italic tracking-tight uppercase mb-2'>Auto-Export Sesi</h2>
              <p className='text-white/60 font-semibold text-sm leading-relaxed'>
                Mengirim semua data transaksi hari ini ke Google Sheets sebelum menutup aplikasi secara aman...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const App: React.FC = () => {
  return (
    <BoothProvider>
      <BoothContent />
    </BoothProvider>
  )
}

export default App
