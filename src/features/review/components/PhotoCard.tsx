import React from 'react'
import {
  RefreshCcw,
  Eye,
} from 'lucide-react'
import { PhotoData } from '@/types'

interface PhotoCardProps {
  index: number
  photo: PhotoData | null
  selectedSequence: number[]
  handlePhotoCardClick: (index: number) => void
  handleRetake: (index: number) => void
  setPreviewImage: (data: {
    isOpen: boolean
    imageUrl: string
    label: string
  }) => void
  isTimeout: boolean
  currentEffectClass: string
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  index,
  photo,
  selectedSequence,
  handlePhotoCardClick,
  handleRetake,
  setPreviewImage,
  isTimeout,
  currentEffectClass,
}) => {
  const displayImage = photo?.processed || photo?.original
  const sequenceNumber = selectedSequence.indexOf(index) + 1
  const isSelected = sequenceNumber > 0

  return (
    <div
      onClick={() => handlePhotoCardClick(index)}
      className={`group relative aspect-3/4 overflow-hidden rounded-2xl border-2 transition-all duration-500 cursor-pointer ${
        isSelected
          ? 'border-studio-primary shadow-xl shadow-studio-primary/20 scale-[0.98]'
          : 'border-studio-border hover:border-studio-primary/50'
      }`}
    >
      {/* Photo Number / Sequence Badge */}
      <div className={`absolute top-3 left-3 z-20 flex h-8 w-8 items-center justify-center rounded-full shadow-lg border transition-all duration-300 ${
        isSelected ? 'bg-studio-primary text-white border-studio-primary scale-110' : 'bg-white/80 text-studio-textLight border-studio-border'
      }`}>
        <span className='font-display text-sm font-bold italic'>
          {isSelected ? sequenceNumber : index + 1}
        </span>
      </div>

      {/* Main Photo Image */}
      <div className={`relative h-full w-full overflow-hidden ${currentEffectClass}`}>
        {displayImage ? (
          <img
            src={displayImage}
            alt={`Photo ${index + 1}`}
            className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-studio-bg'>
            <span className='text-studio-textLight text-[0.6rem] uppercase tracking-widest font-bold'>No Image</span>
          </div>
        )}

        {/* Selected View Overlay */}
        {isSelected && (
          <div className='absolute inset-0 bg-studio-primary/5 border-4 border-studio-primary/20 rounded-xl m-1' />
        )}
      </div>

      {/* Persistent Quick Actions (Always Visible, no more hover-only) */}
      <div className='absolute bottom-0 left-0 right-0 z-20 p-2'>
        <div className='flex items-center justify-between gap-1 rounded-xl bg-white/90 p-1.5 backdrop-blur-md border border-studio-border shadow-lg'>
          {isTimeout ? (
            /* Full-width Preview Button when time is up */
            displayImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewImage({
                    isOpen: true,
                    imageUrl: displayImage,
                    label: `Photo ${index + 1}`,
                  })
                }}
                className='flex h-10 w-full items-center justify-center gap-3 rounded-xl bg-studio-primary text-white shadow-lg shadow-studio-primary/20 hover:bg-studio-accent active:scale-95 transition-all'
              >
                <Eye size={16} strokeWidth={3} />
                <span className='font-display font-bold text-xs uppercase tracking-widest italic'>Preview</span>
              </button>
            )
          ) : (
            /* Show Retake + Small Preview Button */
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRetake(index)
                }}
                className='flex h-10 items-center justify-center gap-3 rounded-xl bg-red-600 px-5 font-display font-bold text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all'
              >
                <RefreshCcw size={16} strokeWidth={3} />
                <span className='text-xs uppercase tracking-widest italic'>Retake</span>
              </button>

              {displayImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewImage({
                      isOpen: true,
                      imageUrl: displayImage,
                      label: `Photo ${index + 1}`,
                    })
                  }}
                  className='flex h-10 w-10 items-center justify-center rounded-xl bg-studio-bg text-studio-primary hover:bg-studio-primary hover:text-white shadow-md active:scale-95 transition-all'
                  title='Enlarge'
                >
                  <Eye size={18} strokeWidth={3} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
