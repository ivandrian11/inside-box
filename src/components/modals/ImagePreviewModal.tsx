import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface ImagePreviewModalData {
  isOpen: boolean
  imageUrl: string
  label: string
}

export interface ImagePreviewModalProps {
  data: ImagePreviewModalData
  onClose: () => void
  effectClass?: string
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  data,
  onClose,
  effectClass = '',
}) => {
  if (!data.isOpen) return null

  return createPortal(
    <div
      className='z-9999 fixed inset-0 flex justify-center items-center bg-studio-text/98 backdrop-blur-2xl p-16 animate-fade-in pointer-events-auto'
      onClick={onClose}
    >
      <div
        className='relative max-w-5xl max-h-full flex flex-col items-center'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='relative group'>
          <img
            src={data.imageUrl}
            alt={data.label || 'Preview'}
            className={`max-h-[82vh] w-auto border-16 border-white/10 rounded-4xl shadow-[-60px_60px_120px_rgba(0,0,0,0.6)] ${effectClass} animate-scale-in transition-transform duration-700`}
          />
          
          {/* Close Button - Premium Studio Style */}
          <button
            className='-top-12 -right-12 absolute flex justify-center items-center bg-studio-primary shadow-2xl border-4 border-white rounded-4xl w-24 h-24 text-white hover:scale-110 active:scale-90 transition-all z-50 group/close'
            onClick={onClose}
          >
            <X size={44} strokeWidth={3.5} className='group-hover/close:rotate-90 transition-transform duration-500' />
          </button>
        </div>

        {data.label && (
          <div className='mt-8 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 opacity-40'>
             <p className='font-display font-medium text-white text-xs uppercase tracking-[0.4em] italic leading-none'>
               {data.label}
             </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
