import React, { useState, useEffect } from 'react'
import { useBooth } from '../hooks/usePhotoBooth'
import { AppStep } from '../types'
import {
  Timer,
  AlertTriangle,
  QrCode,
  Smartphone,
  X,
  ListOrdered,
} from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { SESSION_DURATION_SECONDS } from '../constants'
import { QRCodeSVG } from 'qrcode.react'
import { getPublicRemoteUrl } from '../services/tunnelService'
import { startTourPayment } from '../services/tourService'

import { QRISPayment } from './StepPayment/QRISPayment'
import { CashPayment } from './StepPayment/CashPayment'
import { MethodSelector } from './StepPayment/MethodSelector'
import { PaymentStatusIcon } from './StepPayment/PaymentStatusIcon'
import { PaymentHeader } from './StepPayment/PaymentHeader'
import { DevSimulationButton } from './StepPayment/DevSimulationButton'

// Get session duration from localStorage (admin setting) or fallback to constant
const getSessionDurationSeconds = (): number => {
  const savedMinutes = localStorage.getItem('sessionDurationMinutes')
  if (savedMinutes) {
    return parseInt(savedMinutes, 10) * 60
  }
  return SESSION_DURATION_SECONDS
}

// Get session price from localStorage (admin setting) or default 25
const getSessionPrice = (): number => {
  const saved = localStorage.getItem('sessionPriceThousands')
  if (saved) {
    return parseInt(saved, 10)
  }
  return 25 // Default Rp 25.000
}

// Generate a random ticket code
const generateTicketCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Format seconds to MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const StepPayment: React.FC = () => {
  const { setStep, startTimer, setTicketCode } = useBooth()
  const [ticketCode] = useState(() => {
    const code = generateTicketCode()
    return code
  })
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | null>(
    null,
  )
  const [status, setStatus] = useState<
    'WAITING' | 'PROCESSING' | 'SUCCESS' | 'INSTRUCTIONS'
  >('WAITING')
  const [showQR, setShowQR] = useState(false)
  const [qrString, setQrString] = useState<string>('') // Store Xendit QR String
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)

  const remoteUrl = ticketCode
    ? getPublicRemoteUrl(ticketCode) ||
      `http://${window.location.hostname}:3847/remote/${ticketCode}`
    : ''

  // Debug mode (read from localStorage on mount)
  const debugMode = localStorage.getItem('debugMode') === 'true'

  // Save ticketCode to global state on mount
  useEffect(() => {
    setTicketCode(ticketCode)
  }, [ticketCode, setTicketCode])

  // Listen for webhook confirmation from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      try {
        unlisten = await listen<{ ticket_code: string }>(
          'payment-confirmed',
          (event) => {
            console.log('Payment confirmed via webhook:', event.payload)
            if (
              event.payload.ticket_code === ticketCode ||
              event.payload.ticket_code === '*'
            ) {
              handlePaymentConfirmed()
            }
          },
        )
      } catch (error) {
        console.error('Failed to setup payment listener:', error)
      }
    }

    setupListener()

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  }, [ticketCode])

  const handlePaymentConfirmed = () => {
    setStatus('PROCESSING')
    setTimeout(() => {
      setStatus('SUCCESS')
      setTimeout(() => {
        // Show instructions popup instead of going directly to template select
        setStatus('INSTRUCTIONS')
      }, 1500)
    }, 1000)
  }

  // Trigger tour when instructions popup is shown
  useEffect(() => {
    if (status === 'INSTRUCTIONS') {
      setTimeout(() => {
        startTourPayment()
      }, 500)
    }
  }, [status])

  // Called when user clicks "Mulai" in instructions popup
  const handleStartSession = () => {
    startTimer() // Start the 10-minute timer
    setStep(AppStep.TEMPLATE_SELECT)
  }

  // Effect to generate QR when QRIS is selected
  useEffect(() => {
    if (paymentMethod === 'QRIS' && !qrString && !isGeneratingQR && !qrError) {
      const generateQR = async () => {
        setIsGeneratingQR(true)
        setQrError(null)
        try {
          const price = getSessionPrice() * 1000 // Convert to Rupiah
          console.log(`Generating QR for ${ticketCode} amount ${price}`)

          const qr = await invoke<string>('create_xendit_qr', {
            ticketCode,
            amount: 500,
          })

          setQrString(qr)
        } catch (error: any) {
          console.error('Failed to generate Xendit QR:', error)
          setQrError(
            typeof error === 'string' ? error : 'Gagal membuat QR Code',
          )
        } finally {
          setIsGeneratingQR(false)
        }
      }

      generateQR()
    }
  }, [paymentMethod, ticketCode, qrString, isGeneratingQR, qrError])

  // For development/testing
  const simulatePayment = () => {
    handlePaymentConfirmed()
  }

  // INSTRUCTIONS POPUP
  if (status === 'INSTRUCTIONS') {
    return (
      <div className='z-50 fixed inset-0 flex justify-center items-center bg-studio-text/40 backdrop-blur-sm animate-fade-in'>
        <div className='relative bg-white shadow-2xl mx-4 p-8 border border-studio-border rounded-3xl w-full max-w-3xl'>
          {/* Remote Button (Floating Top Left) */}
          <button
            id='tour-remote-qr'
            onClick={() => setShowQR(true)}
            className='top-8 left-8 absolute flex flex-col justify-center items-center bg-white shadow-lg shadow-studio-primary/20 hover:shadow-studio-primary/40 p-3 border border-studio-border rounded-2xl w-20 h-20 font-bold text-studio-text text-xs hover:scale-105 active:scale-95 transition-all'
          >
            <QrCode size={28} className='mb-1 text-studio-primary' />
            Remote
          </button>

          {/* Header */}
          <div className='mb-6 text-center'>
            <div className='inline-flex justify-center items-center bg-studio-bg mb-4 rounded-full w-16 h-16'>
              <Timer size={32} className='text-studio-primary' />
            </div>
            <h2 className='mb-2 font-display font-bold text-studio-text text-2xl italic'>
              Sebelum Memulai
            </h2>
            <p className='text-studio-textLight text-sm italic'>
              Baca instruksi berikut dengan seksama
            </p>
          </div>

          {/* Time Warning - Full Width */}
          <div className='bg-red-50 shadow-sm mb-4 p-4 border border-red-100 rounded-xl'>
            <div className='flex items-start gap-3'>
              <AlertTriangle
                className='mt-0.5 text-red-500 shrink-0'
                size={20}
              />
              <div>
                <h4 className='mb-1 font-bold text-red-600'>Batas Waktu</h4>
                <p className='text-red-700/80 text-sm'>
                  Anda memiliki waktu{' '}
                  <span className='font-extrabold text-red-600'>
                    {formatTime(getSessionDurationSeconds())}
                  </span>{' '}
                  untuk menyelesaikan sesi foto. Waktu akan dimulai setelah Anda
                  menekan tombol "Mulai Sesi".
                </p>
              </div>
            </div>
          </div>

          {/* 2 Column Layout for Features and Tips */}
          <div className='gap-4 grid grid-cols-2 mb-6'>
            {/* Left Column - Features */}
            <div className='space-y-3'>
              <div className='flex items-start gap-3 bg-studio-bg p-4 border border-studio-border/50 rounded-xl'>
                <ListOrdered
                  className='mt-0.5 text-studio-primary shrink-0'
                  size={20}
                />
                <div>
                  <h4 className='mb-1 font-bold text-studio-text'>Alur Sesi</h4>
                  <p className='text-studio-textLight text-sm'>
                    Template &rarr; Background &rarr; Foto (Capture) &rarr; Edit
                    & Review &rarr; Atur Posisi &rarr; Cetak
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3 bg-studio-bg p-4 border border-studio-border/50 rounded-xl'>
                <Smartphone
                  className='mt-0.5 text-studio-primary shrink-0'
                  size={20}
                />
                <div>
                  <h4 className='mb-1 font-bold text-studio-text'>
                    Remote Control
                  </h4>
                  <p className='text-studio-textLight text-sm'>
                    Gunakan tombol Remote di pojok kiri atas untuk kontrol
                    dengan HP
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Tips */}
            <div className='bg-studio-bg shadow-sm p-4 border border-studio-border/50 rounded-xl h-fit'>
              <h4 className='mb-2 font-bold text-studio-primary text-sm italic uppercase tracking-wider'>
                Tips
              </h4>
              <ul className='space-y-2 text-studio-textLight text-sm'>
                <li className='flex items-start gap-2'>
                  <span className='font-bold text-studio-primary shrink-0'>
                    •
                  </span>
                  <span>
                    Pastikan posisi dan ekspresi sudah sesuai sebelum mengambil
                    foto
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='font-bold text-studio-primary shrink-0'>
                    •
                  </span>
                  <span>
                    Anda dapat mengulang foto jika hasilnya kurang memuaskan
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='font-bold text-studio-primary shrink-0'>
                    •
                  </span>
                  <span>
                    Filter dapat diterapkan sebelum mencetak hasil akhir
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Start Button */}
          <button
            id='tour-start-session'
            onClick={handleStartSession}
            className='bg-studio-primary shadow-lg shadow-studio-primary/30 py-4 rounded-full w-full font-bold text-white text-lg hover:scale-[1.02] active:scale-[0.98] transition-all'
          >
            Mulai Sesi ({formatTime(getSessionDurationSeconds())})
          </button>

          {/* QR Code Modal Overlay */}
          {showQR && (
            <div
              className='z-60 fixed inset-0 flex flex-col justify-center items-center bg-black/80 backdrop-blur-md p-6 animate-in duration-200 fade-in zoom-in-95'
              onClick={() => setShowQR(false)}
            >
              {/* White Card */}
              <div
                className='relative flex flex-col items-center bg-white shadow-2xl p-8 rounded-4xl w-full max-w-sm text-center'
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button (Inside Card) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowQR(false)
                  }}
                  className='-top-4 -right-4 absolute bg-white hover:bg-gray-100 shadow-lg p-2 border border-gray-200 rounded-full text-black/50 hover:text-black transition-colors'
                >
                  <X size={24} />
                </button>

                <h3 className='mb-1 font-bold text-black text-2xl tracking-tight'>
                  Scan untuk Remote
                </h3>
                <p className='mb-8 text-black/50 text-lg'>
                  Capture dari HP Anda
                </p>

                <div className='mb-8 p-2'>
                  <QRCodeSVG value={remoteUrl} size={200} level='M' />
                </div>

                <p className='max-w-50 text-[10px] text-black/30 text-center break-all'>
                  {remoteUrl}
                </p>
                <p className='mt-2 max-w-50 font-bold text-[10px] text-red-500'>
                  Klik 'Visit Site' saat pertama kali membuka link
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='z-10 relative flex flex-col justify-center items-center px-4 w-full h-screen overflow-hidden animate-fade-in'>
      {/* Main Card */}
      <div className='relative flex flex-col items-center bg-white shadow-2xl mb-4 p-6 md:p-8 border border-studio-border rounded-3xl w-full max-w-md shrink-0'>
        {/* Decorative Background */}
        <div className='top-0 right-0 absolute bg-studio-primary/5 blur-[60px] rounded-full w-48 h-48 -translate-y-1/2 translate-x-1/2'></div>
        <div className='bottom-0 left-0 absolute bg-studio-secondary/10 blur-2xl rounded-full w-32 h-32 -translate-x-1/2 translate-y-1/2'></div>

        <div className='z-10 relative w-full'>
          <PaymentStatusIcon status={status} />

          <PaymentHeader status={status} paymentMethod={paymentMethod} />

          {status === 'WAITING' && !paymentMethod && (
            <MethodSelector setPaymentMethod={setPaymentMethod} />
          )}

          {status === 'WAITING' && paymentMethod === 'CASH' && (
            <CashPayment
              ticketCode={ticketCode}
              getSessionPrice={getSessionPrice}
              setPaymentMethod={setPaymentMethod}
            />
          )}

          {status === 'WAITING' && paymentMethod === 'QRIS' && (
            <QRISPayment
              isGeneratingQR={isGeneratingQR}
              qrString={qrString}
              qrError={qrError}
              getSessionPrice={getSessionPrice}
              setQrError={setQrError}
              setPaymentMethod={setPaymentMethod}
            />
          )}
        </div>
      </div>

      <DevSimulationButton
        status={status}
        debugMode={debugMode}
        simulatePayment={simulatePayment}
      />
    </div>
  )
}
