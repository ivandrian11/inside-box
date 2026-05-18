import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getTunnelUrl } from '../../services/tunnelService'

interface RemoteQRModalProps {
  showRemoteQR: boolean
  setShowRemoteQR: (show: boolean) => void
  ticketCode?: string | null
}

export const RemoteQRModal: React.FC<RemoteQRModalProps> = ({
  showRemoteQR,
  setShowRemoteQR,
  ticketCode,
}) => {
  if (!showRemoteQR || !ticketCode) return null

  return (
    <div className='z-100 fixed inset-0' onClick={() => setShowRemoteQR(false)}>
      {/* Modal Content */}
      <div
        className='top-44 left-6 absolute bg-white shadow-2xl p-4 rounded-2xl animate-fade-in cursor-default'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-3 text-center'>
          <p className='font-bold text-sasak-dark text-sm'>Scan untuk Remote</p>
          <p className='text-gray-500 text-xs'>Atur Posisi dari HP</p>
        </div>
        <QRCodeSVG
          value={`${getTunnelUrl()}/remote/${ticketCode}/arrange?force=true`}
          size={160}
          level='M'
          includeMargin={true}
        />
        <div className='mt-3 text-center'>
          <p className='max-w-40 text-[10px] text-gray-400 break-all'>
            {getTunnelUrl()}/remote/...
          </p>
          <p className='mt-2 max-w-40 font-bold text-[9px] text-red-500'>
            Klik 'Visit Site' saat pertama kali membuka link
          </p>
        </div>
      </div>
    </div>
  )
}
