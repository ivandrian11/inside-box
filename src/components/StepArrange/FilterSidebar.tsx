import React, { useState, useMemo } from 'react'
import { Palette, ChevronDown } from 'lucide-react'
import { EFFECTS } from '../../constants'
import { PhotoData } from '../../types'

interface FilterSidebarProps {
  photos: (PhotoData | null)[]
  selectedSequence: number[]
  selectedEffect: string
  selectEffect: (effectId: string) => void
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  photos,
  selectedSequence,
  selectedEffect,
  selectEffect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get first photo from sequence for filter preview thumbnail
  const previewThumbnail = useMemo(() => {
    const firstIndex = selectedSequence?.[0] ?? 0
    const firstPhoto = photos[firstIndex]
    if (!firstPhoto) return ''
    return firstPhoto.processed || firstPhoto.original
  }, [photos, selectedSequence])

  return (
    <div className='md:top-24 md:right-0 right-0 bottom-[140px] md:bottom-auto z-40 fixed flex flex-col items-center bg-white/95 backdrop-blur-3xl p-6 border-y-2 border-l-2 border-studio-border md:rounded-l-[3rem] w-full md:w-56 shadow-2xl shadow-studio-primary/20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden scale-90 md:scale-100 origin-right'>
      
      {/* Sidebar Header - Side by Side */}
      <div className='flex flex-row items-center justify-center gap-4 bg-transparent mb-6'>
        <div className='bg-studio-primary text-white p-2.5 rounded-xl shadow-lg'>
          <Palette size={20} strokeWidth={2.5} />
        </div>
        <div className='flex flex-col items-start'>
          <span className='font-display font-black text-[0.75rem] text-studio-text uppercase tracking-[0.4em] italic leading-none'>
            Filters
          </span>
          <div className='h-0.5 w-6 bg-studio-primary/20 rounded-full mt-1.5' />
        </div>
      </div>

      {/* Grid Container with Smooth Height Transition */}
      <div 
        className={`grid grid-cols-2 gap-x-4 gap-y-7 items-start px-4 md:px-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isExpanded ? 'max-h-[850px]' : 'max-h-[110px]'
        } overflow-hidden`}
      >
        {EFFECTS.map((ef, index) => (
          <button
            key={ef.id}
            onClick={() => selectEffect(ef.id)}
            className={`group relative flex flex-col items-center gap-2 transition-all duration-500 ${
              !isExpanded && index > 1 ? 'opacity-0 scale-90 pointer-events-none translate-y-4' : 'opacity-100 scale-100 translate-y-0'
            }`}
          >
            {/* Filter Preview */}
            <div
              className={`w-11 h-11 md:w-13 md:h-13 rounded-full overflow-hidden border-2 transition-all duration-300 relative ${
                selectedEffect === ef.id
                  ? 'border-studio-primary'
                  : 'border-studio-border/60 hover:border-studio-primary/30'
              }`}
            >
              {previewThumbnail ? (
                <img 
                  src={previewThumbnail} 
                  alt={ef.label}
                  className={`absolute inset-0 w-full h-full object-cover transform scale-150 transition-all duration-500 ${ef.class}`}
                />
              ) : (
                <div className={`absolute inset-0 w-full h-full bg-studio-bg ${ef.class}`} />
              )}
              
              {/* Selection Indicator */}
              {selectedEffect === ef.id && (
                <div className='absolute inset-0 flex items-center justify-center bg-studio-primary/10 backdrop-blur-[1px]'>
                   <div className='w-4 h-4 bg-white rounded-full shadow-lg ring-2 ring-white/20' />
                </div>
              )}
            </div>

            <span
              className={`text-[0.6rem] font-display font-black uppercase tracking-widest italic transition-all text-center leading-none ${
                selectedEffect === ef.id
                  ? 'text-studio-primary'
                  : 'text-studio-textLight'
              }`}
            >
              {ef.label}
            </span>
          </button>
        ))}
      </div>

      {/* Expand Toggle Button - Moved Higher and Updated Copywriting */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className='flex items-center justify-center gap-2.5 mt-0 w-full py-4 rounded-2xl bg-studio-primary text-white shadow-xl active:scale-95 transition-all duration-300'
        >
          <span className='font-display font-black text-[0.7rem] uppercase tracking-[0.2em] italic'>
            More Filters
          </span>
          <div className='transition-all duration-500'>
             <ChevronDown size={16} strokeWidth={3} />
          </div>
        </button>
      )}
    </div>
  )
}
