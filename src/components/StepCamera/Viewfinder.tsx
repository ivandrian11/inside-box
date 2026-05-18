import React from 'react'
import { AlertCircle } from 'lucide-react'
import { PhotoData, Template as TemplateData } from '../../types'

interface ViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  timerAudioRef: React.RefObject<HTMLAudioElement | null>
  isPortrait: boolean
  flipHorizontal: boolean
  flipVertical: boolean
  debugMode: boolean
  handleDevFill: () => void
  currentPhotoIndex: number
  selectedTemplate: TemplateData | null
  photos: (PhotoData | null)[]
  countdown: number | null
}

export const Viewfinder: React.FC<ViewfinderProps> = ({
  videoRef,
  canvasRef,
  timerAudioRef,
  isPortrait,
  flipHorizontal,
  flipVertical,
  debugMode,
  handleDevFill,
  currentPhotoIndex,
  photos,
  countdown,
}) => {
  return (
    <>
      <div
        className={`group relative bg-studio-bg shadow-2xl rounded-[2.5rem] ring-8 ring-white/50 overflow-hidden transition-all duration-700 ${
          isPortrait
            ? 'aspect-9/16 h-[82vh] w-auto'
            : 'aspect-video w-full max-w-5xl mb-12'
        }`}
      >
        {/* Live Video Viewport */}
        <div className='absolute inset-0 bg-black overflow-hidden'>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className='absolute inset-0 w-full h-full object-contain transition-transform duration-500'
            style={{
              transform: isPortrait
                ? `rotate(-90deg) scale(1.7778) scaleX(${
                    flipVertical ? -1 : 1
                  }) scaleY(${flipHorizontal ? 1 : -1})`
                : `scaleX(${flipHorizontal ? 1 : -1}) scaleY(${
                    flipVertical ? -1 : 1
                  })`,
            }}
          />
        </div>

        <canvas ref={canvasRef} className='hidden' />
        <audio ref={timerAudioRef} src='/sfx/timer-final.mp3' preload='auto' />

        {/* Viewfinder Information HUD - Removed internal overlays per user request to avoid obscuring camera view */}
        <div className='z-10 absolute inset-0 pointer-events-none'>
          {/* DEV Skip Control */}
          {debugMode && (
            <div className='top-6 left-6 absolute pointer-events-auto'>
              <button
                onClick={handleDevFill}
                className='bg-red-600/80 hover:bg-red-600 shadow-lg backdrop-blur-md px-4 py-2 rounded-xl font-bold text-[0.6rem] text-white transition-all'
              >
                DEV: FILL ALL
              </button>
            </div>
          )}
        </div>

        {/* Countdown Flash Effect Layer */}
        {countdown === 0 && (
          <div className='z-50 absolute inset-0 bg-white animate-flash-fast' />
        )}

        {/* Retake Status Warning Banner (Floating Overlay) */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-studio-primary/90 shadow-2xl backdrop-blur-xl px-8 py-3 border border-white/20 rounded-full transition-all duration-500 ${
            photos[currentPhotoIndex] && countdown === null
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }`}
        >
          <AlertCircle size={20} className='text-white' />
          <span className='font-display font-bold text-white text-sm italic uppercase tracking-widest whitespace-nowrap'>
            Slot {currentPhotoIndex + 1} akan ditimpa foto baru
          </span>
        </div>
      </div>
    </>
  )
}
