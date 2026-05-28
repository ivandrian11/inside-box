import React from 'react'
import { RefreshCw, Eye, Camera, Check } from 'lucide-react'
import { PhotoData, Template as TemplateData } from '@/types'

interface BottomBarProps {
  isPortrait: boolean
  selectedTemplate: TemplateData | null
  currentPhotoIndex: number
  photos: (PhotoData | null)[]
  handleThumbnailClick: (index: number) => void
  countdown: number | null
  startCountdown: () => void
  setPreviewPhoto: (photo: string | null) => void
}

export const BottomBar: React.FC<BottomBarProps> = ({
  isPortrait,
  selectedTemplate,
  currentPhotoIndex,
  photos,
  handleThumbnailClick,
  countdown,
  startCountdown,
  setPreviewPhoto,
}) => {
  const totalSlots = selectedTemplate?.photoCount ?? 0

  return (
    <div
      className={`items-center gap-12 grid grid-cols-[1fr_auto_1fr] w-full max-w-7xl transition-all ${
        isPortrait ? 'absolute bottom-16 z-50 px-12' : 'px-6'
      }`}
    >
      {/* Left: Interactive Thumbnails (Slots) */}
      <div
        id='tour-camera-slots'
        className={`p-4 rounded-3xl w-fit transition-all bg-white/40 backdrop-blur-md border border-studio-border shadow-xl ${
          totalSlots >= 8
            ? 'grid grid-cols-4 gap-3'
            : totalSlots > 3
              ? 'grid grid-cols-3 gap-3'
              : 'flex gap-3'
        }`}
      >
        {Array.from({ length: totalSlots }).map((_, idx) => {
          const isCurrent = idx === currentPhotoIndex
          const hasPhoto = !!photos[idx]

          return (
            <button
              key={idx}
              onClick={() => handleThumbnailClick(idx)}
              disabled={countdown !== null}
              className={`relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-500 group ${
                isCurrent
                  ? 'border-studio-primary ring-4 ring-studio-primary/20 scale-110 shadow-2xl z-20'
                  : 'border-studio-border bg-white/70 hover:border-studio-primary/50'
              }`}
            >
              {hasPhoto ? (
                <>
                  <img
                    src={photos[idx]?.original}
                    className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                    alt={`Slot ${idx + 1}`}
                  />
                  {/* Status Overlay */}
                  <div className='absolute inset-0 bg-studio-primary/5' />
                  <div className='right-2 bottom-2 absolute flex justify-center items-center bg-studio-primary shadow-lg border border-white rounded-full w-6 h-6'>
                    <Check size={12} className='text-white' />
                  </div>

                  {/* Hover Retake Action */}
                  {!isCurrent && (
                    <div className='absolute inset-0 flex flex-col justify-center items-center bg-studio-text/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-opacity'>
                      <RefreshCw
                        size={18}
                        className='mb-1 text-white animate-spin-slow'
                      />
                      <span className='font-display font-bold text-[0.55rem] text-white italic uppercase tracking-widest'>
                        Retake
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div
                  className={`flex flex-col justify-center items-center gap-1 w-full h-full transition-colors ${isCurrent ? 'bg-studio-primary/5' : 'bg-studio-bg'}`}
                >
                  <span
                    className={`font-display font-bold text-2xl italic ${isCurrent ? 'text-studio-primary' : 'text-studio-textLight/40'}`}
                  >
                    {idx + 1}
                  </span>
                  <span className='font-bold text-[0.45rem] text-studio-textLight/30 uppercase tracking-[0.2em]'>
                    Empty
                  </span>
                </div>
              )}

              {/* Active Indicator Bar */}
              {isCurrent && (
                <div className='bottom-0 absolute bg-studio-primary w-full h-1'></div>
              )}

              {/* Preview Action (Floats) */}
              {hasPhoto && (
                <div
                  className='top-2 left-2 z-30 absolute'
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewPhoto(photos[idx]?.original || null)
                  }}
                >
                  <div className='group/preview flex justify-center items-center bg-white/90 hover:bg-studio-primary shadow-md backdrop-blur-md p-1.5 rounded-xl text-studio-primary hover:text-white transition-all cursor-pointer'>
                    <Eye size={12} className='group-hover/preview:scale-110' />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Center: Shutter Button (Luxo Style) */}
      <div className='flex justify-center'>
        <button
          id='tour-camera-capture'
          onClick={startCountdown}
          disabled={countdown !== null}
          className='group relative flex justify-center items-center disabled:opacity-80 shadow-2xl rounded-full w-28 h-28 hover:scale-105 active:scale-90 transition-all'
        >
          {/* Outer Pulsing Glow */}
          <div
            className={`absolute -inset-1 rounded-full opacity-30 blur-md transition-all ${
              countdown !== null
                ? 'bg-studio-primary animate-pulse'
                : 'bg-studio-primary/20'
            }`}
          />

          {/* Shutter Ring */}
          <div
            className={`absolute inset-0 border-[3px] rounded-full transition-all duration-500 ${
              countdown !== null
                ? 'border-studio-primary'
                : 'border-studio-border group-hover:border-studio-primary group-hover:border-4'
            }`}
          />

          {/* Solid Inner Core */}
          <div
            className={`flex justify-center items-center shadow-xl rounded-full w-22 h-22 transition-all duration-500 ${
              countdown !== null
                ? 'bg-studio-primary scale-90'
                : !!photos[currentPhotoIndex]
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-studio-primary hover:bg-studio-primary/90'
            }`}
          >
            {countdown !== null && countdown > 0 ? (
              <span className='drop-shadow-sm font-display font-bold text-white text-6xl italic animate-scale-in'>
                {countdown}
              </span>
            ) : photos[currentPhotoIndex] ? (
              <RefreshCw
                className='text-white group-hover:rotate-180 transition-transform duration-700'
                size={40}
              />
            ) : (
              <Camera
                className='text-white group-hover:scale-110 transition-transform'
                size={40}
              />
            )}
          </div>
        </button>
      </div>

      {/* Right: Modern Status Indicator */}
      <div className='flex flex-col items-end gap-3 text-right'>
        <div className='flex items-center gap-3 bg-white/60 shadow-sm backdrop-blur-md px-5 py-2.5 border border-studio-border rounded-full'>
          <div className='bg-studio-primary/10 p-1.5 rounded-full'>
            <Camera size={14} className='text-studio-primary' />
          </div>
          <p className='font-display font-bold text-[0.65rem] text-studio-text italic uppercase tracking-widest'>
            Slot {currentPhotoIndex + 1} of {totalSlots}
          </p>
        </div>

        <p className='opacity-80 max-w-48 font-medium text-studio-textLight text-xs italic leading-relaxed'>
          {photos[currentPhotoIndex]
            ? 'Klik shutter untuk mengambil ulang (Retake) foto di slot ini.'
            : 'Klik foto di sebelah kiri untuk berpindah antrian foto.'}
        </p>
      </div>
    </div>
  )
}
