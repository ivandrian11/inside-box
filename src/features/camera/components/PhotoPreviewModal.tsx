import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface PhotoPreviewModalProps {
  previewPhoto: string | null
  setPreviewPhoto: (photo: string | null) => void
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  previewPhoto,
  setPreviewPhoto,
}) => {
  if (!previewPhoto) return null

  return createPortal(
    <div
      className='z-9999 fixed inset-0 flex justify-center items-center bg-studio-text/98 backdrop-blur-2xl p-16 animate-fade-in'
      onClick={() => setPreviewPhoto(null)}
    >
      <div 
        className='relative max-w-5xl max-h-full flex flex-col items-center'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='relative group'>
          <img
            src={previewPhoto}
            className='max-h-[82vh] w-auto border-16 border-white/10 rounded-4xl shadow-[-60px_60px_120px_rgba(0,0,0,0.6)] animate-scale-in transition-transform duration-700'
            alt='Preview'
          />
          
          <button
            onClick={() => setPreviewPhoto(null)}
            className='-top-12 -right-12 absolute flex justify-center items-center bg-studio-primary shadow-2xl border-4 border-white rounded-4xl w-24 h-24 text-white hover:scale-110 active:scale-90 transition-all z-50 group/close'
          >
            <X size={44} strokeWidth={3.5} className='group-hover/close:rotate-90 transition-transform duration-500' />
          </button>
        </div>

        <div className='mt-8 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 opacity-30 animate-pulse'>
           <p className='font-display font-medium text-white text-[0.6rem] uppercase tracking-[0.4em] italic leading-none'>
             Klik di mana saja untuk menutup
           </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
