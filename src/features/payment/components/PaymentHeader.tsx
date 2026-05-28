import React from 'react'

interface PaymentHeaderProps {
  status: 'WAITING' | 'PROCESSING' | 'SUCCESS' | 'INSTRUCTIONS'
  paymentMethod: 'CASH' | 'QRIS' | null
}

export const PaymentHeader: React.FC<PaymentHeaderProps> = ({
  status,
  paymentMethod,
}) => {
  return (
    <div className='mb-6 text-center'>
      {status === 'SUCCESS' ? (
        <>
          <h2 className='mb-2 font-display font-bold text-green-600 text-2xl italic'>
            Pembayaran Berhasil!
          </h2>
          <p className='text-studio-textLight text-sm italic'>Menyiapkan sesi foto...</p>
        </>
      ) : status === 'PROCESSING' ? (
        <>
          <h2 className='mb-2 font-display font-bold text-studio-primary text-2xl italic'>
            Memproses...
          </h2>
          <p className='text-studio-textLight text-sm italic'>Mohon tunggu sebentar</p>
        </>
      ) : (
        <>
          <h2 className='mb-2 font-display font-bold text-studio-text text-2xl italic'>
            {paymentMethod === 'QRIS'
              ? 'Pembayaran QRIS'
              : paymentMethod === 'CASH'
                ? 'Bayar di Kasir'
                : 'Metode Pembayaran'}
          </h2>
          <p className='text-studio-textLight text-sm italic'>
            {paymentMethod === 'QRIS'
              ? 'Silakan scan QRIS untuk melanjutkan'
              : paymentMethod === 'CASH'
                ? 'Tunjukkan kode ini kepada kasir'
                : 'Pilih metode pembayaran yang Anda inginkan'}
          </p>
        </>
      )}
    </div>
  )
}
