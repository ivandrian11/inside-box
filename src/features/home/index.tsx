import React, { useState } from 'react'
import { useBooth } from '@/hooks/useBooth'
import { AppStep } from '@/types'
import { ArrowUpRight } from 'lucide-react'
import { SessionRecoveryModal } from './components/SessionRecoveryModal'

export const Home: React.FC = () => {
  const {
    startSession,
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
        const port = import.meta.env.VITE_BACKEND_PORT || '3847'
        const url = `http://127.0.0.1:${port}/photos/${session.ticket_code}/${filename}`
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

  return (
    <>
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
          <span onClick={handleRecoveryClick} className='cursor-pointer select-none'>
            Est. 2026
          </span>
          <span>Professional Studio Experience</span>
          <span>Touch Screen to Begin</span>
        </div>
      </div>

      {/* Session Recovery Modal */}
      <SessionRecoveryModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        onRecover={handleRecover}
      />
    </>
  )
}
