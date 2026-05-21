import React, { useEffect, useState } from 'react'
import { BoothProvider, useBooth } from './hooks/usePhotoBooth'
import { Layout } from './components/Layout'
import { StepPayment } from './components/StepPayment'
import { StepSelection } from './components/StepSelection'
import { StepCamera } from './components/StepCamera'
import { StepReview } from './components/StepReview'
import { StepConfirmation } from './components/StepConfirmation'
import { StepArrange } from './components/StepArrange'
import { SessionRecoveryModal } from './components/modals/SessionRecoveryModal'
import { AppStep } from './types'
import { ArrowUpRight, Clock } from 'lucide-react'
import { isTunnelRunning, getTunnelUrl } from './services/tunnelService'
import { setSetting, SettingKeys } from './services/databaseService'
import './App.css'

// Log tunnel status on startup
if (isTunnelRunning()) {
  console.log('🌐 Tunnel configured:', getTunnelUrl())
} else {
  console.log('📶 Tunnel not configured - gallery only accessible on same WiFi')
  console.log('💡 To enable public access, set VITE_TUNNEL_URL in .env')
}

const BoothContent: React.FC = () => {
  const {
    step,
    startSession,
    isTimeout,
    ackTimeout,
    showTimeoutModal,
    setTicketCode,
    selectTemplate,
    setStep,
  } = useBooth()

  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [recoveryClickCount, setRecoveryClickCount] = useState(0)

  const handleRecoveryClick = () => {
    const newCount = recoveryClickCount + 1
    if (newCount >= 5) {
      setShowRecoveryModal(true)
      setRecoveryClickCount(0)
    } else {
      setRecoveryClickCount(newCount)
    }
  }

  const handleRecover = (session: any, template: any) => {
    setTicketCode(session.ticket_code)

    // Construct PhotoData objects from absolute URL provided by local server
    const recoveredPhotos = [...session.photos]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((filename: string) => {
        const url = `http://127.0.0.1:3847/photos/${session.ticket_code}/${filename}`
        return {
          original: url,
          activeFlipIndex: 0,
          filename: filename,
        }
      })

    selectTemplate(template, recoveredPhotos)
    setShowRecoveryModal(false)
    setStep(AppStep.REVIEW)
  }

  // Sync environment variables to database on startup
  useEffect(() => {
    const syncEnvSettings = async () => {
      // Sync Xendit Secret Key
      const xenditKey = import.meta.env.VITE_XENDIT_SECRET_KEY
      if (xenditKey) {
        await setSetting(SettingKeys.XENDIT_SECRET_KEY, xenditKey)
        console.log('✅ Synced Xendit Secret Key from ENV')
      }

      // Sync Tunnel URL if present in ENV
      const envTunnelUrl = import.meta.env.VITE_TUNNEL_URL
      if (envTunnelUrl) {
        await setSetting(SettingKeys.TUNNEL_URL, envTunnelUrl)
        console.log('✅ Synced Tunnel URL from ENV')
      }

      // Load active Tunnel URL from DB and set it in memory
      const { getTunnelUrlSetting } = await import('./services/databaseService')
      const { setTunnelUrl } = await import('./services/tunnelService')
      const activeTunnelUrl = await getTunnelUrlSetting()
      if (activeTunnelUrl) {
        setTunnelUrl(activeTunnelUrl)
        console.log('🌐 Initialized Tunnel URL from DB:', activeTunnelUrl)
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
        return (
          <div className='relative flex flex-col justify-center items-center w-full h-full'>
            {/* Center Editorial Typography */}
            <div className='z-20 relative text-center mix-blend-normal'>
              <h1 className='font-display font-medium text-[8vw] text-studio-text italic leading-[0.8] tracking-tight'>
                <span className='block relative'>
                  Inside Studio
                  <span className='-top-4 -right-10 absolute font-mono font-bold text-studio-text text-[0.6rem] tracking-[0.3em] rotate-6 bg-white/80 px-2 py-1 rounded border border-studio-primary/30 shadow-sm backdrop-blur-md'>
                    2026
                    <br />
                    EDITION
                  </span>
                </span>
                <span className='block bg-clip-text bg-linear-to-b from-studio-text via-studio-primary to-studio-primary stroke-text text-transparent transform translate-y-3 drop-shadow-sm'>
                  PHOTOBOX
                </span>
              </h1>
            </div>

            {/* Interactive Call to Action */}
            <div className='group z-30 relative mt-20'>
              <button
                onClick={startSession}
                className='group relative bg-studio-primary hover:bg-studio-accent shadow-lg shadow-studio-primary/20 px-14 py-7 rounded-full overflow-hidden hover:scale-105 transition-all duration-500'
              >
                <span className='z-10 relative flex items-center gap-4 font-body font-bold text-white text-xl uppercase tracking-wide'>
                  Start Session{' '}
                  <ArrowUpRight
                    className='transition-transform group-hover:-translate-y-1 group-hover:translate-x-1'
                    size={24}
                  />
                </span>

                {/* Subtle Shine Effect */}
                <div className='absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent w-full h-full transition-transform -translate-x-full group-hover:translate-x-full duration-1000'></div>
              </button>
            </div>

            {/* Footer decor */}
            <div className='bottom-8 left-0 absolute flex justify-between px-12 w-full font-body text-studio-text/40 text-xs uppercase tracking-widest'>
              <span onClick={handleRecoveryClick} className='cursor-pointer'>
                Est. 2026
              </span>
              <span>Professional Studio Experience</span>
              <span>Touch Screen to Begin</span>
            </div>
          </div>
        )
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

      {/* Session Recovery Modal */}
      <SessionRecoveryModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        onRecover={handleRecover}
      />
    </Layout>
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
