import React from 'react'
import {
  QrCode,
  Timer,
  AlertTriangle,
  ListOrdered,
  Smartphone,
  X,
  Camera,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface InstructionsPopupProps {
  status: 'WAITING' | 'PROCESSING' | 'SUCCESS' | 'INSTRUCTIONS'
  showQR: boolean
  setShowQR: (show: boolean) => void
  remoteUrl: string
  formatTime: (seconds: number) => string
  getSessionDurationSeconds: () => number
  handleStartSession: () => void
}

export const InstructionsPopup: React.FC<InstructionsPopupProps> = ({
  status,
  showQR,
  setShowQR,
  remoteUrl,
  formatTime,
  getSessionDurationSeconds,
  handleStartSession,
}) => {
  if (status !== 'INSTRUCTIONS') return null

  return (
    <div className='z-50 fixed inset-0 flex justify-center items-center bg-studio-text/40 backdrop-blur-sm animate-fade-in'>
      <div className='relative bg-white shadow-2xl mx-4 p-8 border border-studio-border rounded-4xl w-full max-w-3xl overflow-hidden'>
        {/* Remote Button (Floating Top Left) */}
        <button
          id='tour-remote-qr'
          onClick={() => setShowQR(true)}
          className='top-8 left-8 absolute flex flex-col justify-center items-center bg-studio-bg shadow-lg hover:shadow-xl p-3 border border-studio-border rounded-2xl outline-none w-20 h-20 font-bold text-[0.6rem] text-studio-text hover:scale-105 active:scale-95 transition-all'
        >
          <QrCode size={28} className='mb-1 text-studio-primary' />
          Remote
        </button>

        {/* Header */}
        <div className='mb-8 text-center'>
          <div className='inline-flex justify-center items-center bg-studio-primary/10 shadow-inner mb-5 rounded-full w-20 h-20'>
            <Timer size={40} className='text-studio-primary' />
          </div>
          <h2 className='mb-2 font-display font-medium text-studio-text text-4xl italic'>
            Satu Langkah Lagi
          </h2>
          <p className='font-medium text-studio-textLight text-sm uppercase tracking-widest'>
            Baca instruksi berikut untuk hasil terbaik
          </p>
        </div>

        {/* Time Warning - Full Width */}
        <div className='bg-orange-50 shadow-sm mb-6 p-5 border border-orange-100 rounded-2xl'>
          <div className='flex items-start gap-4'>
            <div className='bg-orange-500/10 p-2 rounded-xl'>
              <AlertTriangle className='text-orange-600' size={22} />
            </div>
            <div className='flex-1'>
              <h4 className='mb-1 font-bold text-orange-700 text-lg'>
                Batas Waktu Sesi
              </h4>
              <p className='text-orange-600/90 text-sm leading-relaxed'>
                Anda memiliki waktu{' '}
                <span className='font-bold text-orange-700 decoration-2 underline underline-offset-4'>
                  {formatTime(getSessionDurationSeconds())}
                </span>{' '}
                untuk menyelesaikan sesi foto. Timer akan dimulai setelah Anda
                menekan tombol "Mulai Sesi".
              </p>
            </div>
          </div>
        </div>

        {/* 2 Column Layout for Features and Tips */}
        <div className='gap-6 grid grid-cols-2 mb-8'>
          {/* Left Column - Features */}
          <div className='space-y-4'>
            <div className='flex items-start gap-4 bg-studio-bg hover:bg-white hover:shadow-md p-5 border border-studio-border rounded-2xl transition-all'>
              <div className='bg-studio-primary/10 p-2 rounded-xl shrink-0'>
                <ListOrdered className='text-studio-primary' size={20} />
              </div>
              <div>
                <h4 className='mb-1 font-bold text-studio-text'>Alur Sesi</h4>
                <p className='text-studio-textLight text-xs leading-relaxed'>
                  Capture &rarr; Edit &rarr; Print
                </p>
              </div>
            </div>

            <div className='flex items-start gap-4 bg-studio-bg hover:bg-white hover:shadow-md p-5 border border-studio-border rounded-2xl transition-all'>
              <div className='bg-studio-accent/10 p-2 rounded-xl shrink-0'>
                <Smartphone className='text-studio-accent' size={20} />
              </div>
              <div>
                <h4 className='mb-1 font-bold text-studio-text'>
                  Remote Control
                </h4>
                <p className='text-studio-textLight text-xs leading-relaxed'>
                  Scan QR di pojok kiri atas untuk mengontrol kamera dengan HP
                  Anda
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Tips */}
          <div className='bg-studio-bg shadow-inner p-6 border border-studio-border rounded-2xl h-fit'>
            <h4 className='flex items-center gap-2 mb-4 font-bold text-[0.65rem] text-studio-primary uppercase tracking-widest'>
              <div className='bg-studio-primary rounded-full w-1.5 h-1.5'></div>
              Tips Profesional
            </h4>
            <ul className='space-y-3 text-studio-text text-sm'>
              <li className='flex items-start gap-3'>
                <CheckCircleIcon
                  size={16}
                  className='mt-0.5 text-studio-primary shrink-0'
                />
                <span className='font-medium text-xs leading-relaxed'>
                  Pastikan wajah terlihat jelas dan pencahayaan pas
                </span>
              </li>
              <li className='flex items-start gap-3'>
                <CheckCircleIcon
                  size={16}
                  className='mt-0.5 text-studio-primary shrink-0'
                />
                <span className='font-medium text-xs leading-relaxed'>
                  Gunakan filter artistik untuk hasil yang lebih estetik
                </span>
              </li>
              <li className='flex items-start gap-3'>
                <CheckCircleIcon
                  size={16}
                  className='mt-0.5 text-studio-primary shrink-0'
                />
                <span className='font-medium text-xs leading-relaxed'>
                  Jangan ragu untuk retake jika hasil foto kurang memuaskan
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Start Button */}
        <button
          id='tour-start-session'
          onClick={handleStartSession}
          className='group flex justify-center items-center gap-4 bg-studio-primary shadow-studio-primary/20 shadow-xl hover:shadow-studio-primary/30 py-6 rounded-full w-full font-display font-bold text-white text-2xl italic hover:scale-[1.02] active:scale-[0.98] transition-all'
        >
          Mulai Sesi
          <Camera
            size={24}
            className='group-hover:rotate-12 transition-transform'
          />
        </button>

        {/* QR Code Modal Overlay */}
        {showQR && (
          <div
            className='z-60 fixed inset-0 flex flex-col justify-center items-center bg-studio-text/40 backdrop-blur-md p-6 animate-fade-in'
            onClick={() => setShowQR(false)}
          >
            {/* White Card */}
            <div
              className='relative flex flex-col items-center bg-white shadow-2xl p-10 border-4 border-studio-bg rounded-[3rem] w-full max-w-sm text-center'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button (Inside Card) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowQR(false)
                }}
                className='-top-4 -right-4 absolute bg-white hover:bg-studio-bg shadow-lg p-3 border border-studio-border rounded-full text-studio-textLight hover:text-studio-text transition-all'
              >
                <X size={24} />
              </button>

              <h3 className='mb-2 font-display font-medium text-studio-text text-3xl italic uppercase tracking-tight'>
                HP Remote
              </h3>
              <p className='mb-10 font-medium text-studio-textLight text-sm tracking-wide'>
                Scan untuk mulai mengontrol dari ponsel Anda
              </p>

              <div className='bg-studio-bg shadow-inner mb-10 p-5 border border-studio-border rounded-4xl'>
                <QRCodeSVG value={remoteUrl} size={200} level='M' />
              </div>

              <p className='mb-4 max-w-50 font-mono text-[0.6rem] text-studio-text/20 text-center break-all'>
                {remoteUrl}
              </p>

              <div className='flex items-center gap-2 bg-studio-primary/5 px-4 py-2 rounded-full text-studio-primary/60'>
                <span className='font-bold text-[0.6rem] uppercase tracking-widest'>
                  Status: Ready to Connect
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const CheckCircleIcon = ({
  size,
  className,
}: {
  size: number
  className?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='3'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
  >
    <polyline points='20 6 9 17 4 12'></polyline>
  </svg>
)
