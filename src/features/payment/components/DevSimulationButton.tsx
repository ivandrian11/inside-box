import React from 'react'

interface DevSimulationButtonProps {
  status: 'WAITING' | 'PROCESSING' | 'SUCCESS' | 'INSTRUCTIONS'
  debugMode: boolean
  simulatePayment: () => void
}

export const DevSimulationButton: React.FC<DevSimulationButtonProps> = ({
  status,
  debugMode,
  simulatePayment,
}) => {
  if (status !== 'WAITING' || !debugMode) return null

  return (
    <button
      onClick={simulatePayment}
      className='bg-purple-50 hover:bg-purple-100 mt-8 px-6 py-3 border border-purple-300 rounded-full text-purple-700 font-bold text-xs transition-all shadow-sm'
    >
      [DEV] Simulasi Konfirmasi Pembayaran
    </button>
  )
}
