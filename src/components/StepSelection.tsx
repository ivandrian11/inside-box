import React from 'react'
import { useBooth } from '../hooks/usePhotoBooth'
import { AppStep, BackgroundType } from '../types'
import { TEMPLATES } from '../constants'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { TemplateImage } from './common/TemplateImage'

export const StepSelection: React.FC = () => {
  const { step, setStep, selectTemplate, selectedTemplate, selectBackground } =
    useBooth()

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 20) // Tolerance
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20)
    }
  }

  React.useEffect(() => {
    checkScroll()
    let t1: number
    let t_tour: number
    // Re-check when step changes or window resizes
    if (step === AppStep.TEMPLATE_SELECT) {
      t1 = window.setTimeout(checkScroll, 100) // Wait for layout
      t_tour = window.setTimeout(() => {
        import('../services/tourService').then((m) => m.startTourSelection())
      }, 1000)
    }
    window.addEventListener('resize', checkScroll)
    return () => {
      window.removeEventListener('resize', checkScroll)
      clearTimeout(t1)
      clearTimeout(t_tour)
    }
  }, [step])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = window.innerWidth * 0.6
      const targetScroll =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount)
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      })
    }
  }

  if (step === AppStep.TEMPLATE_SELECT) {
    return (
      <div className='group/container relative flex flex-col w-full h-full overflow-hidden animate-fade-in'>

        {/* Left Arrow - Improved for Light Theme */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-24 z-30 pointer-events-none transition-opacity duration-500 flex items-center justify-start pl-6 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={() => scroll('left')}
            className='bg-white/80 hover:bg-studio-primary shadow-2xl backdrop-blur-md p-4 border border-studio-border hover:border-studio-primary rounded-full text-studio-primary hover:text-white hover:scale-110 transition-all pointer-events-auto transform active:scale-95'
          >
            <ChevronLeft size={32} />
          </button>
        </div>

        {/* Right Arrow - Improved for Light Theme */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-24 z-30 pointer-events-none transition-opacity duration-500 flex items-center justify-end pr-6 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            id='tour-scroll-right'
            onClick={() => scroll('right')}
            className='bg-white/80 hover:bg-studio-primary shadow-2xl backdrop-blur-md p-4 border border-studio-border hover:border-studio-primary rounded-full text-studio-primary hover:text-white hover:scale-110 transition-all pointer-events-auto transform active:scale-95'
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Scrollable Container - Added top padding to avoid overlap with tabs */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className='[&::-webkit-scrollbar]:hidden flex items-center gap-12 px-12 md:px-32 lg:px-48 pb-12 w-full h-full pt-40 [-ms-overflow-style:none] overflow-x-auto snap-mandatory snap-x [scrollbar-width:none]'
        >
          {TEMPLATES.map((template, index) => (
            <div key={template.id} className='snap-center shrink-0 animate-scale-in' style={{ animationDelay: `${index * 50}ms` }}>
              <TemplateImage
                id={index === 0 ? 'tour-template-card' : undefined}
                template={template}
                selected={selectedTemplate?.id === template.id}
                onClick={() => {
                  selectTemplate(template)
                  selectBackground(BackgroundType.RAW)
                  setStep(AppStep.CONFIRMATION)
                }}
              />
            </div>
          ))}

          {/* Spacer at the end */}
          <div className='w-24 shrink-0' />
        </div>
      </div>
    )
  }

  return null
}
