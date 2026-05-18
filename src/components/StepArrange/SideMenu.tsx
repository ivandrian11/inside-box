import React from 'react'
import { QrCode } from 'lucide-react'

interface SideMenuProps {
  ticketCode?: string | null
  showRemoteQR: boolean
  setShowRemoteQR: (show: boolean) => void
}

export const SideMenu: React.FC<SideMenuProps> = ({
  ticketCode,
  showRemoteQR,
  setShowRemoteQR,
}) => {
  return (
    <div className='top-32 left-8 z-50 fixed flex flex-col items-start gap-4 animate-fade-in'>
      {ticketCode && (
        <button
          id='tour-arrange-remote'
          onClick={() => setShowRemoteQR(true)}
          className={`flex flex-col items-center justify-center backdrop-blur-xl w-20 h-20 rounded-2xl transition-all shadow-xl border ${
            showRemoteQR
              ? 'bg-studio-primary text-white border-studio-primary scale-110'
              : 'bg-white/80 text-studio-primary border-studio-border hover:bg-white hover:scale-105'
          }`}
        >
          <QrCode size={28} />
          <span className='mt-1 font-display font-bold text-[0.6rem] uppercase tracking-widest italic'>Remote</span>
        </button>
      )}
    </div>
  )
}
