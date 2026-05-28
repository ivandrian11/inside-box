import React from 'react'

interface CashPaymentProps {
  ticketCode: string
  getSessionPrice: () => number
  setPaymentMethod: (method: 'CASH' | 'QRIS' | null) => void
}

export const CashPayment: React.FC<CashPaymentProps> = ({
  ticketCode,
  getSessionPrice,
  setPaymentMethod,
}) => {
  return (
    <>
      {/* Ticket Code */}
      <div className='bg-studio-bg mb-6 p-6 border border-studio-border rounded-2xl shadow-inner'>
        <p className='mb-2 text-studio-textLight text-xs text-center uppercase tracking-[0.3em] font-medium'>
          Kode Tiket
        </p>
        <p className='font-mono font-bold text-studio-primary text-4xl md:text-5xl text-center tracking-[0.2em]'>
          {ticketCode}
        </p>
      </div>

      {/* Price */}
      <div className='bg-studio-primary/10 mb-6 p-4 border border-studio-primary/20 rounded-xl'>
        <div className='flex justify-between items-center'>
          <span className='text-studio-textLight font-medium'>Total Pembayaran</span>
          <span className='font-display font-bold text-studio-primary text-3xl italic'>
            {getSessionPrice()}K
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className='space-y-3 mb-6'>
        <div className='flex items-start gap-3 text-studio-textLight text-sm'>
          <div className='flex justify-center items-center bg-studio-primary/20 mt-0.5 rounded-full w-6 h-6 text-studio-primary shrink-0 font-bold'>
            1
          </div>
          <p>Pergi ke kasir untuk melakukan transaksi</p>
        </div>
        <div className='flex items-start gap-3 text-studio-textLight text-sm'>
          <div className='flex justify-center items-center bg-studio-primary/20 mt-0.5 rounded-full w-6 h-6 text-studio-primary shrink-0 font-bold'>
            2
          </div>
          <p>
            Bayar sebesar{' '}
            <span className='font-bold text-studio-primary underline decoration-dotted'>
              Rp {getSessionPrice()}.000
            </span>
          </p>
        </div>
        <div className='flex items-start gap-3 text-studio-textLight text-sm'>
          <div className='flex justify-center items-center bg-studio-primary/20 mt-0.5 rounded-full w-6 h-6 text-studio-primary shrink-0 font-bold'>
            3
          </div>
          <p>
            Aplikasi akan{' '}
            <span className='font-bold text-studio-text'>otomatis lanjut</span>{' '}
            setelah pembayaran dikonfirmasi
          </p>
        </div>
      </div>
      <div className='flex justify-center mt-2 w-full'>
        <button
          onClick={() => setPaymentMethod(null)}
          className='pb-1 border-transparent hover:border-studio-primary border-b text-studio-textLight hover:text-studio-primary text-sm transition-all italic'
        >
          Ganti Metode Pembayaran
        </button>
      </div>
    </>
  )
}
