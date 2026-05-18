import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export interface ErrorModalData {
  isOpen: boolean
  title: string
  message: string
  details: string
}

export interface ErrorModalProps {
  data: ErrorModalData
  onClose: () => void
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ data, onClose }) => {
  if (!data.isOpen) return null

  return (
    <div
      className='z-70 fixed inset-0 flex justify-center items-center bg-black/90 backdrop-blur-md p-4 animate-fade-in'
      onClick={onClose}
    >
      <div
        className='relative bg-[#1A1614] shadow-2xl border border-red-500/30 rounded-2xl w-full max-w-lg overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex justify-between items-center bg-linear-to-r from-red-900/50 to-red-800/50 px-6 py-4 border-red-500/30 border-b'>
          <div className='flex items-center gap-3'>
            <AlertTriangle size={24} className='text-red-400' />
            <span className='font-bold text-red-300 text-lg'>{data.title}</span>
          </div>
          <button
            onClick={onClose}
            className='hover:bg-white/10 p-2 rounded-full text-white/60 hover:text-white transition-colors'
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='space-y-4 p-6'>
          {/* Error Message */}
          <div className='bg-red-900/20 p-4 border border-red-500/30 rounded-lg'>
            <p className='text-red-200'>{data.message}</p>
          </div>

          {/* Error Details (collapsible) */}
          {data.details && (
            <details className='bg-black/30 rounded-lg'>
              <summary className='px-4 py-2 text-gray-400 hover:text-white text-sm cursor-pointer'>
                🔍 Detail Teknis (untuk debugging)
              </summary>
              <pre className='p-4 max-h-40 overflow-auto font-mono text-[10px] text-gray-500 whitespace-pre-wrap'>
                {data.details}
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className='flex justify-end gap-3 bg-black/30 px-6 py-4 border-red-500/20 border-t'>
          <button
            onClick={onClose}
            className='bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-medium text-white transition-colors'
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
