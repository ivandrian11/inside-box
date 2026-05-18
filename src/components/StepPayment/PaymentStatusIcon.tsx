import React from 'react'
import { CheckCircle2, Loader2, Wallet } from 'lucide-react'

interface PaymentStatusIconProps {
  status: 'WAITING' | 'PROCESSING' | 'SUCCESS' | 'INSTRUCTIONS'
}

export const PaymentStatusIcon: React.FC<PaymentStatusIconProps> = ({
  status,
}) => {
  return (
    <div className='flex justify-center mb-4'>
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
          status === 'SUCCESS'
            ? 'bg-green-100 text-green-600'
            : status === 'PROCESSING'
              ? 'bg-studio-bg text-studio-primary'
              : 'bg-studio-bg text-studio-primary shadow-inner'
        }`}
      >
        {status === 'SUCCESS' ? (
          <CheckCircle2 size={40} className='animate-pulse' />
        ) : status === 'PROCESSING' ? (
          <Loader2 size={40} className='animate-spin' />
        ) : (
          <Wallet size={40} />
        )}
      </div>
    </div>
  )
}
