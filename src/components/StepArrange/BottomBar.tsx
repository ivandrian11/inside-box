import React from 'react'
import { Loader2, CheckCircle2, Move, ZoomIn } from 'lucide-react'

interface BottomBarProps {
  handleGenerate: () => void
  isGenerating: boolean
}

export const BottomBar: React.FC<BottomBarProps> = ({
  handleGenerate,
  isGenerating,
}) => {
  return (
    <div className='right-0 bottom-0 left-0 z-40 fixed bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.15)] border-studio-border border-t h-[120px] animate-slide-up'>
      <div className='flex justify-between items-center w-full h-full'>
        {/* Left: Instructions (Flush to left padding) */}
        <div className='flex items-center gap-24 pl-24'>
          <div className='group flex items-center gap-6'>
            <div className='flex justify-center items-center bg-studio-bg shadow-inner border border-studio-border rounded-2xl w-14 h-14 group-hover:scale-110 transition-transform duration-500'>
              <Move size={24} className='text-studio-primary' />
            </div>
            <div className='flex flex-col'>
              <span className='opacity-60 mb-2 font-black text-[0.7rem] text-studio-primary italic uppercase leading-none tracking-[0.3em]'>
                Movement
              </span>
              <span className='font-display font-black text-studio-text text-2xl italic tracking-wider'>
                Drag untuk geser
              </span>
            </div>
          </div>

          <div className='group flex items-center gap-6'>
            <div className='flex justify-center items-center bg-studio-bg shadow-inner border border-studio-border rounded-2xl w-14 h-14 group-hover:scale-110 transition-transform duration-500'>
              <ZoomIn size={24} className='text-studio-primary' />
            </div>
            <div className='flex flex-col'>
              <span className='opacity-60 mb-2 font-black text-[0.7rem] text-studio-primary italic uppercase leading-none tracking-[0.3em]'>
                Scale
              </span>
              <span className='font-display font-black text-studio-text text-2xl italic tracking-wider'>
                Pinch untuk zoom
              </span>
            </div>
          </div>
        </div>

        {/* Right: Primary Action Button (Truly FLUSH to right and bottom) */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className='group relative flex justify-center items-center gap-6 bg-studio-primary disabled:opacity-50 hover:brightness-110 active:brightness-90 min-w-[480px] h-full overflow-hidden italic transition-all duration-300'
        >
          {/* Subtle Shine Effect for Premium Feel */}
          <div className='absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent w-full h-full -translate-x-full group-hover:animate-shine' />

          {isGenerating ? (
            <>
              <Loader2 className='text-white animate-spin' size={36} />
              <span className='font-display font-black text-white text-4xl'>
                MEMPROSES...
              </span>
            </>
          ) : (
            <>
              <CheckCircle2
                size={36}
                strokeWidth={3}
                className='text-white group-hover:scale-110 transition-transform'
              />
              <span className='font-display font-black text-white text-4xl tracking-tight'>
                SELESAI & CETAK
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
