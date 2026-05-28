import React from 'react'
import { useBooth } from '@/hooks/useBooth'
import { AppStep, BackgroundType } from '@/types'
import { Camera, Layers, User, CheckCircle2 } from 'lucide-react'

export const StepConfirmation: React.FC = () => {
  const { selectedTemplate, selectedBackground, setStep } = useBooth()

  // Helper labels
  const getBgLabel = () =>
    selectedBackground === BackgroundType.RAW
      ? 'Natural Studio'
      : 'Studio Background'
      
  const getTemplateLabel = () => {
    if (!selectedTemplate) return 'No Template'
    const count = selectedTemplate.photoCount
    return `${selectedTemplate.name} (${count} Foto)`
  }

  return (
    <div className='flex flex-col justify-center items-center mx-auto px-4 pt-32 pb-12 w-full max-w-4xl h-full animate-fade-in'>
      {/* Summary Card */}
      <div className='relative flex flex-col gap-8 bg-white shadow-2xl p-8 md:p-12 border border-studio-border rounded-3xl w-full overflow-hidden'>
        <div className='top-0 right-0 absolute bg-studio-primary/5 blur-[80px] rounded-full w-64 h-64 -translate-y-1/2 translate-x-1/2'></div>

        <div className='z-10 relative flex flex-col gap-8'>
          <div className='flex justify-center items-center w-full'>
            <div className='bg-studio-border w-12 h-px'></div>
            <span className='mx-4 font-mono text-studio-textLight/70 text-xs uppercase tracking-[0.2em]'>
              Session Details
            </span>
            <div className='bg-studio-border w-12 h-px'></div>
          </div>

          <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
            {/* Item 1: Template */}
            <div className='group flex flex-col items-center bg-studio-bg hover:bg-studio-bg/80 p-6 border border-studio-border rounded-2xl text-center transition-colors'>
              <div className='flex justify-center items-center bg-studio-primary/10 mb-4 rounded-full w-12 h-12 text-studio-primary group-hover:scale-110 transition-transform'>
                <Layers size={24} />
              </div>
              <span className='mb-1 text-studio-textLight text-[0.65rem] font-bold uppercase tracking-widest'>
                Template
              </span>
              <span className='font-display font-medium text-studio-text text-xl italic'>
                {getTemplateLabel()}
              </span>
            </div>

            {/* Item 2: Background */}
            <div className='group flex flex-col items-center bg-studio-bg hover:bg-studio-bg/80 p-6 border border-studio-border rounded-2xl text-center transition-colors'>
              <div className='flex justify-center items-center bg-studio-accent/10 mb-4 rounded-full w-12 h-12 text-studio-accent group-hover:scale-110 transition-transform'>
                <User size={24} />
              </div>
              <span className='mb-1 text-studio-textLight text-[0.65rem] font-bold uppercase tracking-widest'>
                Background
              </span>
              <span className='font-display font-medium text-studio-text text-xl italic'>
                {getBgLabel()}
              </span>
            </div>
          </div>

          {/* Warning Text */}
          <div className='flex items-start gap-4 bg-orange-50 p-4 border border-orange-100 rounded-xl'>
            <CheckCircle2 className='mt-1 text-orange-500 shrink-0' size={20} />
            <div className='text-left'>
              <h4 className='mb-1 font-bold text-orange-700'>Final Check</h4>
              <p className='text-orange-600/80 text-sm leading-relaxed'>
                Pastikan pilihan Anda sudah benar. Tombol "Back" tidak akan
                tersedia saat sesi foto dimulai.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className='z-20 mt-8'>
        <button
          onClick={() => setStep(AppStep.CAMERA)}
          className='group relative bg-studio-primary shadow-lg shadow-studio-primary/20 px-12 py-5 rounded-full font-bold text-white text-lg hover:scale-105 transition-all duration-300'
        >
          <span className='flex items-center gap-3 uppercase tracking-wide'>
            Mulai Sesi Foto{' '}
            <Camera className='group-hover:rotate-12 transition-transform' />
          </span>
        </button>
      </div>
    </div>
  )
}
