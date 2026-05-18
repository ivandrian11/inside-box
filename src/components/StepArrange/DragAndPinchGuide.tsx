import React from 'react'
import { Move } from 'lucide-react'

export const DragAndPinchGuide: React.FC = () => {
  return (
    <div className='z-10 relative flex flex-wrap justify-center items-center gap-4 md:gap-8 mt-12 animate-fade-in'>
      {/* Drag Guide */}
      <div className='flex items-center gap-3 bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-studio-border shadow-md transition-all hover:bg-white'>
        <div className='flex justify-center items-center bg-studio-primary/10 rounded-full w-8 h-8 shrink-0'>
          <Move size={16} className='text-studio-primary' />
        </div>
        <span className='font-display font-bold text-studio-text text-xs uppercase tracking-widest italic'>
          Drag untuk geser
        </span>
      </div>
      
      {/* Zoom Guide */}
      <div className='flex items-center gap-3 bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-studio-border shadow-md transition-all hover:bg-white'>
        <div className='flex justify-center items-center bg-studio-accent/10 rounded-full w-8 h-8 shrink-0'>
          <span className='text-xs'>🖱️</span>
        </div>
        <span className='font-display font-bold text-studio-text text-xs uppercase tracking-widest italic'>
          Pinch untuk zoom
        </span>
      </div>
    </div>
  )
}
