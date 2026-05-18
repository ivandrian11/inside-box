import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface RemoteQRModalProps {
  showQR: boolean
  setShowQR: (show: boolean) => void
  remoteUrl: string
}

export const RemoteQRModal: React.FC<RemoteQRModalProps> = ({
  showQR,
  setShowQR,
  remoteUrl,
}) => {
  if (!showQR || !remoteUrl) return null

  return (
    <div className='z-100 fixed inset-0' onClick={() => setShowQR(false)}>
      {/* Modal Content */}
      <div
        className='top-64 left-6 absolute bg-white shadow-2xl p-4 rounded-2xl cursor-default'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-3 text-center'>
          <p className='font-bold text-sasak-dark text-sm'>Scan untuk Remote</p>
          <p className='text-gray-500 text-xs'>Capture dari HP Anda</p>
        </div>
        <QRCodeSVG
          value={remoteUrl}
          size={160}
          level='M'
          includeMargin={true}
        />
        <div className='mt-3 text-center'>
          <p className='max-w-40 text-[10px] text-gray-400 break-all'>
            {remoteUrl}
          </p>
          <p className='mt-2 max-w-40 font-bold text-[9px] text-red-500'>
            Klik 'Visit Site' saat pertama kali membuka link
          </p>
        </div>
      </div>
    </div>
  )
}
