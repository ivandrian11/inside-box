import React, { useState } from 'react'
import { useBooth } from '../hooks/usePhotoBooth'
import { Timer, ArrowLeft, X, AlertTriangle } from 'lucide-react'
import { AppStep } from '../types'
import { AdminPanel } from './AdminPanel'
interface LayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  stepTitle?: { main: string; sub: string }
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  showBack = false,
  stepTitle,
}) => {
  const {
    timeLeft,
    isSessionActive,
    step,
    setStep,
    resetSession,
  } = useBooth()
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminClickCount, setAdminClickCount] = useState(0)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleBack = () => {
    switch (step) {
      case AppStep.PAYMENT:
        resetSession()
        break
      // TEMPLATE_SELECT back is handled by showBack prop (hidden)
      case AppStep.FEATURE_SELECT:
        setStep(AppStep.TEMPLATE_SELECT)
        break

      // NEW: Back from Confirmation goes to Template Selection since Background Selection is removed
      case AppStep.CONFIRMATION:
        setStep(AppStep.TEMPLATE_SELECT)
        break

      // NEW: Camera no longer has a back button visible, but in case logic is triggered:
      // It shouldn't go anywhere if we want to enforce "no return",
      // but traditionally it would go to Confirmation.
      // We will hide the button in App.tsx instead.

      case AppStep.REVIEW:
        setStep(AppStep.CAMERA)
        break

      // ARRANGE step goes back to REVIEW
      case AppStep.ARRANGE:
        setStep(AppStep.REVIEW)
        break

      default:
        break
    }
  }

  const handleExitClick = () => {
    if (step === AppStep.PAYMENT) {
      // If haven't paid yet, just exit without confirmation
      resetSession()
    } else {
      // If session active/paid, show confirmation
      setShowExitConfirm(true)
    }
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    resetSession()
  }

  // Hidden admin access - triple click on top-left corner
  const handleAdminClick = () => {
    const newCount = adminClickCount + 1
    setAdminClickCount(newCount)

    if (newCount >= 5) {
      setShowAdmin(true)
      setAdminClickCount(0)
    }

    // Reset count after 2 seconds of inactivity
    setTimeout(() => setAdminClickCount(0), 2000)
  }

  return (
    <div className='relative flex flex-col bg-studio-bg w-full h-screen overflow-hidden font-body'>
      {/* Ambient Orbs Background */}
      <div className='top-[-20%] left-[-10%] absolute bg-studio-primary/10 opacity-60 blur-[120px] rounded-full w-200 h-200 animate-float pointer-events-none' />
      <div className='right-[-10%] bottom-[-20%] absolute bg-studio-secondary/20 opacity-60 blur-[100px] rounded-full w-150 h-150 animate-pulse-slow pointer-events-none' />
      <div className='top-[40%] left-[30%] absolute bg-studio-primary/10 opacity-40 blur-[80px] rounded-full w-100 h-100 animate-pulse pointer-events-none' />

      {/* Studio Pattern Overlay (Subtle) */}
      <div
        className='absolute inset-0 opacity-[0.03] pointer-events-none'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238B9AC7' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Floating HUD Header - Updated to Grid for centering */}
      <div className='top-0 left-0 z-40 absolute items-start grid grid-cols-[1fr_auto_1fr] p-6 w-full pointer-events-none'>
        {/* Left: Hidden Admin Button + Back Button + Active Tasks */}
        <div className='flex flex-col items-start gap-3 pointer-events-auto'>
          <div className='flex justify-start items-center h-12'>
            {/* Hidden Admin / Secret Key Trigger - 5 clicks to open. Only on HOME and RESULT steps so it doesn't block the BACK button */}
            {(step === AppStep.HOME || step === AppStep.RESULT) && (
              <button
                onClick={() => {
                  if (step === AppStep.RESULT) {
                    // Bubble the event globally or let it be handled directly in ResultView if we wanted to
                    // However, ResultView needs onSecretUnlock. The easiest way is to dispatch a global event or simply rely on it since it's global layout
                    const event = new CustomEvent('global-secret-unlock')
                    window.dispatchEvent(event)
                  } else {
                    handleAdminClick()
                  }
                }}
                className='top-0 left-0 z-50 fixed opacity-0 w-32 h-32 cursor-pointer'
                aria-hidden='true'
              />
            )}
            {showBack && (
              <button
                onClick={handleBack}
                className='flex items-center gap-3 bg-studio-primary text-white px-6 py-2.5 rounded-full shadow-lg shadow-studio-primary/20 hover:scale-105 active:scale-95 transition-all'
              >
                <ArrowLeft size={20} strokeWidth={3} />
                <span className='font-display font-bold text-sm tracking-widest italic'>BACK</span>
              </button>
            )}
          </div>


        </div>

        {/* Center: Step Title */}
        <div className='flex flex-col justify-start items-center pt-1'>
          {stepTitle && (
            <div className='text-center animate-fade-in'>
              <p className='mb-1 font-bold text-[0.65rem] text-studio-primary uppercase tracking-[0.3em]'>
                {stepTitle.sub}
              </p>
              <h2 className='font-display text-studio-text text-3xl leading-none tracking-wide'>
                {stepTitle.main}
              </h2>
            </div>
          )}
        </div>

        {/* Right: Brand & Controls */}
        <div className='flex flex-col items-end gap-4 pointer-events-none'>
          {/* Logo */}
          <div className='text-right'>
            <h1 className='font-display font-bold text-studio-text text-2xl tracking-widest'>
              INSIDE STUDIO
            </h1>
            <p className='text-[0.6rem] text-studio-text/50 uppercase tracking-[0.3em]'>
              Digital Creative Booth
            </p>
          </div>

          {/* Timer - Hidden on Review, Arrange, and Result steps */}
          {isSessionActive && step !== AppStep.REVIEW && step !== AppStep.ARRANGE && step !== AppStep.RESULT && (
            <div
              id='tour-camera-timer'
              className={`flex items-center gap-3 px-5 py-2 rounded-full glass-card border border-studio-border pointer-events-auto shadow-sm ${
                timeLeft < 60 ? 'text-red-500 bg-red-50' : 'text-studio-primary'
              }`}
            >
              <Timer size={16} />
              <span className='font-mono font-bold text-lg'>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* Cancel Session / Exit - Visible during active session or payment, but Hidden on Review, Arrange, and Result */}
          {(step === AppStep.PAYMENT || isSessionActive) &&
            step !== AppStep.REVIEW &&
            step !== AppStep.ARRANGE &&
            step !== AppStep.RESULT && (
              <button
                onClick={handleExitClick}
                className='flex items-center gap-3 bg-red-50 text-red-600 px-6 py-2.5 border-2 border-red-200 rounded-full shadow-lg shadow-red-900/5 hover:bg-red-600 hover:text-white transition-all active:scale-95 pointer-events-auto'
              >
                <span className='font-display font-bold text-sm tracking-widest italic'>EXIT</span>
                <X size={20} strokeWidth={3} />
              </button>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className='z-10 relative flex flex-col justify-center items-center p-6 md:p-12 w-full h-full overflow-hidden'>
        {title && (
          <div className='top-8 left-1/2 z-0 absolute opacity-10 whitespace-nowrap -translate-x-1/2 pointer-events-none'>
            <h2
              className='stroke-white font-display text-[12rem] text-transparent'
              style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}
            >
              {title}
            </h2>
          </div>
        )}

        {/* Dynamic Content Container */}
        <div className='z-10 relative flex flex-col justify-center items-center w-full h-full'>
          {children}
        </div>
      </main>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className='z-50 absolute inset-0 flex justify-center items-center bg-black/80 backdrop-blur-sm animate-fade-in'>
          <div className='bg-[#1A1614] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 border border-sasak-gold/30 rounded-2xl w-full max-w-md text-center scale-100 transform'>
            <div className='flex justify-center items-center bg-red-900/20 mx-auto mb-4 border border-red-500/30 rounded-full w-16 h-16 text-red-500'>
              <AlertTriangle size={32} />
            </div>
            <h3 className='mb-2 font-display text-white text-2xl'>
              Akhiri Sesi?
            </h3>
            <p className='mb-8 font-body text-white/60'>
              Foto yang belum disimpan akan hilang dan Anda harus melakukan
              pembayaran ulang untuk memulai sesi baru.
            </p>
            <div className='flex gap-4'>
              <button
                onClick={() => setShowExitConfirm(false)}
                className='flex-1 hover:bg-white/10 py-3 border border-white/20 rounded-full text-white transition-colors'
              >
                Batal
              </button>
              <button
                onClick={confirmExit}
                className='flex-1 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20 py-3 rounded-full font-bold text-white transition-colors'
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
      />

      {/* Bottom Status Bar (Decor) */}
      <div className='bottom-0 absolute bg-linear-to-r from-studio-bg via-studio-primary to-studio-bg opacity-30 w-full h-1'></div>
    </div>
  )
}
