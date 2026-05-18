import React from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  details?: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  isWarning?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  details,
  onConfirm,
  onCancel,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isWarning = false,
}) => {
  if (!isOpen) return null

  return (
    <div className='z-50 fixed inset-0 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in'>
      <div className='bg-sasak-dark shadow-2xl p-6 border border-white/10 rounded-2xl w-full max-w-md scale-100 transition-all transform'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <div
            className={`p-4 rounded-full ${isWarning ? 'bg-orange-900/30 text-orange-400' : 'bg-sasak-gold/20 text-sasak-gold'}`}
          >
            {isWarning ? <AlertTriangle size={40} /> : <Clock size={40} />}
          </div>

          <h3 className='font-bold text-white text-xl'>{title}</h3>

          <div className='space-y-2'>
            <p className='text-gray-300'>{message}</p>
            {details && (
              <p className='bg-black/30 p-2 rounded-lg text-gray-500 text-sm'>
                {details}
              </p>
            )}
          </div>

          <div className='flex gap-3 mt-4 w-full'>
            <button
              onClick={onCancel}
              className='flex-1 bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl font-medium text-white transition-colors'
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-transform active:scale-95 ${
                isWarning
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-sasak-gold hover:bg-yellow-600 text-sasak-dark'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
