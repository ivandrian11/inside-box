import React from 'react'
import { Wallet, QrCode } from 'lucide-react'

interface MethodSelectorProps {
  setPaymentMethod: (method: 'CASH' | 'QRIS' | null) => void
}

export const MethodSelector: React.FC<MethodSelectorProps> = ({
  setPaymentMethod,
}) => {
  return (
    <div className='flex flex-col gap-5 mt-8'>
      <button
        onClick={() => setPaymentMethod('CASH')}
        className='flex justify-center items-center gap-4 bg-studio-accent hover:bg-studio-text py-5 rounded-full font-bold text-white text-lg transition-all shadow-lg shadow-studio-accent/20 hover:scale-[1.02]'
      >
        <Wallet className='w-6 h-6' />
        Bayar Tunai di Kasir
      </button>

      <button
        onClick={() => setPaymentMethod('QRIS')}
        className='flex justify-center items-center gap-4 bg-studio-primary hover:bg-studio-accent py-5 rounded-full font-bold text-white text-lg transition-all shadow-lg shadow-studio-primary/20 hover:scale-[1.02]'
      >
        <QrCode className='w-6 h-6' />
        Bayar Pakai QRIS
      </button>
    </div>
  )
}
