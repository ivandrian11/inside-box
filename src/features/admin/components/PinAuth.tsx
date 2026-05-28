import React from 'react'
import { Eye, EyeOff, LogOut } from 'lucide-react'

interface PinAuthProps {
  pinInput: string
  setPinInput: React.Dispatch<React.SetStateAction<string>>
  pinError: boolean
  showPin: boolean
  setShowPin: React.Dispatch<React.SetStateAction<boolean>>
  handlePinSubmit: () => void
  setShowExitConfirm: React.Dispatch<React.SetStateAction<boolean>>
}

export const PinAuth: React.FC<PinAuthProps> = ({
  pinInput,
  setPinInput,
  pinError,
  showPin,
  setShowPin,
  handlePinSubmit,
  setShowExitConfirm,
}) => {
  const ADMIN_PIN_MAX_LENGTH = 6

  return (
    <div className='mx-auto max-w-md space-y-4 animate-fade-in'>
      <div className='text-center'>
        <h3 className='font-display font-black text-studio-text text-xl italic'>Masukkan PIN Akses</h3>
      </div>
      
      <div className='flex flex-col gap-3'>
        <div className='relative'>
          <input
            type='text'
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            placeholder='······'
            maxLength={ADMIN_PIN_MAX_LENGTH}
            autoComplete='off'
            className={`w-full bg-studio-bg px-4 py-3 pr-14 border-2 rounded-2xl text-studio-text text-center text-3xl font-mono tracking-[0.5em] focus:outline-none focus:ring-4 transition-all ${
              pinError
                ? 'border-red-400 focus:ring-red-100'
                : 'border-studio-border focus:border-studio-primary focus:ring-studio-primary/10'
            }`}
            style={
              {
                WebkitTextSecurity: showPin ? 'none' : 'disc',
              } as React.CSSProperties
            }
          />
          <button
            type='button'
            onClick={() => setShowPin(!showPin)}
            className='top-1/2 right-4 absolute p-2 text-studio-textLight hover:text-studio-primary transition-colors -translate-y-1/2'
          >
            {showPin ? <EyeOff size={24} /> : <Eye size={24} />}
          </button>
        </div>
        <button
          onClick={handlePinSubmit}
          className='bg-studio-primary shadow-lg shadow-studio-primary/20 py-3.5 rounded-2xl font-display font-black text-white text-xl uppercase tracking-widest italic hover:scale-[1.02] active:scale-95 transition-all'
        >
          Unlock Dashboard
        </button>
      </div>

      {/* Number Pad for Touchscreen - Elegant Light Style */}
      <div className='gap-3 grid grid-cols-3'>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((key) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'C') {
                setPinInput('')
              } else if (key === '⌫') {
                setPinInput(pinInput.slice(0, -1))
              } else if (pinInput.length < ADMIN_PIN_MAX_LENGTH) {
                setPinInput(pinInput + key)
              }
            }}
            className={`py-3 rounded-2xl text-2xl font-display font-black italic transition-all ${
              key === 'C'
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : key === '⌫'
                  ? 'bg-orange-50 text-orange-500 hover:bg-orange-100'
                  : 'bg-studio-bg text-studio-text hover:bg-studio-primary hover:text-white'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Exit Application Button */}
      <button
        onClick={() => setShowExitConfirm(true)}
        className='flex justify-center items-center gap-2 bg-red-50 hover:bg-red-100 py-3 border border-red-200 rounded-2xl w-full font-bold text-red-500 transition-all uppercase tracking-widest text-xs italic'
      >
        <LogOut size={16} />
        Tutup Aplikasi (Shutdown)
      </button>

      {pinError && (
        <p className='bg-red-50 py-3 rounded-lg text-red-500 text-sm font-bold text-center animate-shake'>
          ⚠️ PIN yang Anda masukkan salah!
        </p>
      )}
    </div>
  )
}
