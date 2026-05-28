import React, { useState, useMemo } from 'react'
import { CheckCircle2, Info } from 'lucide-react'
import { ImagePreviewModal } from '@/components/modals/ImagePreviewModal'
import { PhotoData, Template as TemplateData } from '@/types'
import { PhotoCard } from './PhotoCard'

interface ReviewViewProps {
  photos: (PhotoData | null)[]
  setPhotos: (photos: (PhotoData | null)[]) => void
  handleRetake: (index: number) => void
  handleFinish: () => void
  isTimeout: boolean
  isDebugMode: boolean
  currentEffectClass: string
  selectedTemplate: TemplateData | null
  selectedSequence: number[]
  setSelectedSequence: (
    update: number[] | ((prev: number[]) => number[]),
  ) => void
  toggleFlip?: (index: number) => void
  selectedFeature?: any
  setToast: (
    toast: {
      message: string
      type: 'success' | 'error'
    } | null,
  ) => void
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  photos,
  handleRetake,
  handleFinish,
  isTimeout,
  currentEffectClass,
  selectedTemplate,
  selectedSequence,
  setSelectedSequence,
}) => {
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean
    imageUrl: string
    label: string
  }>({ isOpen: false, imageUrl: '', label: '' })

  // Effect to hide global UI when modal is open
  React.useEffect(() => {
    if (previewImage.isOpen) {
      document.body.classList.add('hide-global-header')
    } else {
      document.body.classList.remove('hide-global-header')
    }
    return () => document.body.classList.remove('hide-global-header')
  }, [previewImage.isOpen])

  const handlePhotoCardClick = (index: number) => {
    if (!photos[index]) return
    setSelectedSequence((prev) => {
      const idx = prev.indexOf(index)

      // Reset if full and clicking an already selected item to allow NEW order
      if (prev.length === (selectedTemplate?.photoCount || 0) && idx > -1) {
        return [index]
      }

      if (idx > -1) {
        return prev.filter((i) => i !== index)
      } else {
        if (prev.length < (selectedTemplate?.photoCount || 4)) {
          return [...prev, index]
        }
        return prev
      }
    })
  }

  const isTemplateComplete =
    selectedSequence.length === (selectedTemplate?.photoCount || 0)

  // Re-order the photos for display based on selectedSequence ONLY when complete
  const sortedDisplayIndices = useMemo(() => {
    if (!isTemplateComplete) {
      return photos.map((_, i) => i)
    }

    const sequence = [...selectedSequence]
    photos.forEach((_, i) => {
      if (!sequence.includes(i)) {
        sequence.push(i)
      }
    })
    return sequence
  }, [isTemplateComplete, selectedSequence, photos.length])

  return (
    <div className='fixed inset-0 flex bg-studio-bg overflow-hidden animate-fade-in'>
      {/* Left Side: Photo Grid */}
      <div id='tour-review-grid' className='flex-1 px-12 pt-48 pb-12 overflow-y-auto no-scrollbar'>
        <div className='gap-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mx-auto max-w-5xl'>
          {sortedDisplayIndices.map((originalIndex) => (
            <PhotoCard
              key={originalIndex}
              index={originalIndex}
              photo={photos[originalIndex]}
              selectedSequence={selectedSequence}
              handlePhotoCardClick={handlePhotoCardClick}
              handleRetake={handleRetake}
              setPreviewImage={setPreviewImage}
              isTimeout={isTimeout}
              currentEffectClass={currentEffectClass}
            />
          ))}
        </div>
      </div>

      {/* Right Side: Sidebar for Template */}
      <div className='z-20 relative flex flex-col bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.03)] p-8 pt-24 border-studio-border border-l w-[460px] h-full overflow-hidden'>
        <div className='flex flex-col flex-1 gap-8'>
          <div className='text-center animate-slide-up'>
            <h3 className='mb-6 font-display text-studio-text text-2xl italic tracking-wider'>
              Your Selection
            </h3>

            {/* Template Preview Container - Enlarged and Elevated */}
            <div
              id='tour-review-template'
              className='relative bg-white shadow-2xl mx-auto rounded-2xl ring-8 ring-studio-bg/10 w-[320px] overflow-hidden'
              style={{
                aspectRatio: selectedTemplate
                  ? `${selectedTemplate.outputWidth} / ${selectedTemplate.outputHeight}`
                  : '3/4',
              }}
            >
              {selectedTemplate && (
                <>
                  <img
                    src={selectedTemplate.previewUrl}
                    className='absolute inset-0 opacity-40 brightness-110 w-full h-full object-contain contrast-125'
                    alt='Template'
                  />
                  {selectedTemplate.slots.map((slot, idx) => {
                    const selectedIdx = selectedSequence[idx]
                    const photo =
                      selectedIdx !== undefined ? photos[selectedIdx] : null
                    const photoUrl = photo?.processed || photo?.original

                    const left = (slot.x / selectedTemplate.outputWidth) * 100
                    const top = (slot.y / selectedTemplate.outputHeight) * 100
                    const width =
                      (slot.width / selectedTemplate.outputWidth) * 100
                    const height =
                      (slot.height / selectedTemplate.outputHeight) * 100

                    return (
                      <div
                        key={idx}
                        className={`absolute flex items-center justify-center border-2 transition-all duration-300 overflow-hidden ${
                          photoUrl
                            ? 'bg-white border-white z-20 shadow-xl'
                            : 'bg-studio-bg/60 border-dashed border-studio-border z-10'
                        }`}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                        }}
                      >
                        {photoUrl ? (
                          <div className='relative w-full h-full'>
                            <img
                              src={photoUrl}
                              className='w-full h-full object-cover animate-scale-in'
                              alt={`Slot ${idx + 1}`}
                            />
                            <div className='top-1 left-1 absolute flex justify-center items-center bg-studio-primary shadow-md rounded-full w-8 h-8 font-display font-black text-white text-xl italic scale-75'>
                              {idx + 1}
                            </div>
                          </div>
                        ) : (
                          <span className='font-display font-black text-studio-primary/20 text-2xl italic'>
                            {idx + 1}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          <div className='p-2'>
            <div className='flex justify-center items-center gap-3 opacity-60'>
              <div className='bg-studio-primary/20 p-1.5 rounded-lg text-studio-primary'>
                <Info size={14} strokeWidth={3} />
              </div>
              <p className='font-bold text-[0.65rem] text-studio-textLight italic uppercase leading-tight tracking-[0.2em]'>
                Info: Atur Urutan Foto Di Samping
              </p>
            </div>
          </div>
        </div>

        <div className='mt-auto pt-4'>
          <button
            onClick={handleFinish}
            disabled={!isTemplateComplete}
            className={`w-full py-5 rounded-2xl font-display font-bold text-2xl shadow-xl transition-all duration-500 italic flex items-center justify-center gap-3 ${
              isTemplateComplete
                ? 'bg-studio-primary text-white hover:scale-[1.02] active:scale-95 shadow-studio-primary/30'
                : 'bg-studio-bg text-studio-textLight/40 border-2 border-studio-border'
            }`}
          >
            {isTemplateComplete ? (
              <>
                Confirm
                <CheckCircle2 size={24} strokeWidth={3} />
              </>
            ) : (
              <span className='font-bold text-studio-textLight text-xs uppercase tracking-widest'>
                Pilih{' '}
                {(selectedTemplate?.photoCount || 0) - selectedSequence.length}{' '}
                Lagi
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Full Preview Modal Overlay */}
      <ImagePreviewModal
        data={previewImage}
        onClose={() => setPreviewImage((prev) => ({ ...prev, isOpen: false }))}
        effectClass={currentEffectClass}
      />
    </div>
  )
}
