import React from 'react'
import { Template } from '../../types'
import { Camera, Check } from 'lucide-react'

export interface TemplateImageProps {
  template: Template
  selected: boolean
  onClick: () => void
  id?: string
}

export const TemplateImage: React.FC<TemplateImageProps> = ({
  template,
  selected,
  onClick,
  id,
}) => (
  <button
    id={id}
    onClick={onClick}
    className={`snap-center group relative shrink-0 transition-all duration-500 ease-out
      ${
        selected
          ? 'scale-100 opacity-100 z-10'
          : 'scale-90 opacity-60 hover:opacity-100 hover:scale-95'
      }`}
    style={{ maxHeight: '70vh' }}
  >
    {/* Template Image - Pure display */}
    <div className='relative h-full flex flex-col items-center'>
      <img
        src={template.previewUrl}
        alt={template.name}
        className={`h-[58vh] md:h-[62vh] w-auto object-contain drop-shadow-2xl transition-all duration-500
          ${
            selected
              ? 'ring-4 ring-studio-primary ring-offset-4 ring-offset-white rounded-xl'
              : 'rounded-xl border border-studio-border/30'
          }
        `}
      />

      {/* Selection Indicator (Checkmark) */}
      {selected && (
        <div className='-top-4 -right-4 absolute flex justify-center items-center bg-studio-primary shadow-xl shadow-studio-primary/30 rounded-full w-12 h-12 animate-bounce border-4 border-white'>
          <Check size={24} className='text-white' />
        </div>
      )}

      {/* Photo Count Badge - Redesigned for High Contrast */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-xs font-display font-bold flex items-center gap-2 backdrop-blur-xl transition-all border italic tracking-widest
        ${
          selected
            ? 'bg-studio-primary text-white border-studio-primary shadow-xl shadow-studio-primary/20 scale-110'
            : 'bg-white/80 text-studio-text border-studio-border shadow-md'
        }`}
      >
        <Camera size={14} />
        {template.photoCount} FOTO
      </div>
    </div>

    {/* Template Name - Below image */}
    <div className='mt-6 text-center animate-fade-in'>
      <h3
        className={`text-xl font-display font-bold italic tracking-wide transition-all duration-300 ${
          selected ? 'text-studio-primary drop-shadow-sm' : 'text-studio-textLight'
        }`}
      >
        {template.name}
      </h3>
    </div>
  </button>
)
