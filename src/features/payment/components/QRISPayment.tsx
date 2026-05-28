import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, AlertTriangle } from 'lucide-react'

interface QRISPaymentProps {
  isGeneratingQR: boolean
  qrString: string
  qrError: string | null
  getSessionPrice: () => number
  setQrError: (error: string | null) => void
}

export const QRISPayment: React.FC<QRISPaymentProps> = ({
  isGeneratingQR,
  qrString,
  qrError,
  getSessionPrice,
  setQrError,
}) => {
  return (
    <div className='flex flex-col items-center w-full'>
      {/* QRIS Display */}
      <div className='flex flex-col items-center bg-white shadow-2xl mb-6 p-5 rounded-2xl w-fit border border-studio-border'>
        {isGeneratingQR ? (
          <div className='flex justify-center items-center w-40 md:w-45 h-40 object-contain aspect-square'>
            <Loader2 className='text-studio-primary animate-spin' size={32} />
          </div>
        ) : qrString ? (
          <div className='p-2'>
            <QRCodeSVG value={qrString} size={160} level='M' />
          </div>
        ) : (
          <div className='flex flex-col justify-center items-center gap-2 p-4 w-40 md:w-45 h-40 object-contain aspect-square text-center'>
            <AlertTriangle className='text-red-500' />
            <p className='text-[10px] text-red-500 leading-tight'>
              {qrError || 'Gagal generate QR'}
            </p>
            <button
              onClick={() => setQrError(null)}
              className='bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-full text-[10px] text-red-500 transition-colors'
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Nominal terintegrasi di bawah QR */}
        <div className='mt-3 mb-1 text-center'>
          <p className='font-display font-bold text-studio-text text-xl leading-none italic'>
            Rp {getSessionPrice()}.000
          </p>
        </div>

        <p className='flex items-center gap-1 mt-1 font-medium text-black/60 text-xs'>
          Powered by <span className='font-bold text-black'>xendit</span>
        </p>
      </div>

      {/* Instructions */}
      <div className='space-y-2 mb-4 w-full'>
        <div className='flex items-start gap-2 text-studio-textLight text-xs md:text-sm'>
          <div className='flex justify-center items-center bg-studio-primary/20 mt-0.5 rounded-full w-5 h-5 text-[10px] text-studio-primary shrink-0 font-bold'>
            1
          </div>
          <p>Scan QRIS menggunakan e-Wallet / m-Banking</p>
        </div>
        <div className='flex items-start gap-2 text-studio-textLight text-xs md:text-sm'>
          <div className='flex justify-center items-center bg-studio-primary/20 mt-0.5 rounded-full w-5 h-5 text-[10px] text-studio-primary shrink-0 font-bold'>
            2
          </div>
          <p>
            Aplikasi akan{' '}
            <span className='font-bold text-studio-text'>otomatis lanjut</span>{' '}
            setelah sukses
          </p>
        </div>
      </div>
    </div>
  )
}
