import React from 'react'

export interface ModernCardProps {
  selected: boolean
  onClick: () => void
  title: string
  subtitle?: string
  image?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export const ModernCard: React.FC<ModernCardProps> = ({
  selected,
  onClick,
  title,
  subtitle,
  image,
  icon,
  disabled,
}) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`snap-center group relative w-[80vw] md:w-[280px] shrink-0 h-[400px] rounded-4xl overflow-hidden transition-all duration-500 ease-out text-left
      ${
        disabled
          ? 'opacity-50 grayscale cursor-not-allowed scale-95'
          : selected
            ? 'ring-2 ring-sasak-gold scale-100 opacity-100 shadow-[0_0_50px_rgba(212,175,55,0.3)] z-10'
            : 'scale-90 opacity-50 hover:opacity-80 hover:scale-95'
      }`}
  >
    {/* Background */}
    <div className='absolute inset-0 bg-sasak-charcoal group-hover:bg-sasak-dark transition-colors'></div>

    {image && (
      <>
        <img
          src={image}
          alt={title}
          className='absolute inset-0 opacity-60 group-hover:opacity-80 w-full h-full object-cover group-hover:scale-110 transition-opacity duration-700'
        />
        <div className='absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-90'></div>
      </>
    )}

    {!image && (
      <div
        className={`absolute inset-0 bg-linear-to-br ${
          selected
            ? 'from-sasak-gold/20 to-sasak-terracotta/20'
            : 'from-white/5 to-white/0'
        }`}
      >
        <div
          className='absolute inset-0 opacity-20'
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        ></div>
      </div>
    )}

    {/* Disabled Badge */}
    {disabled && (
      <div className='z-30 absolute inset-0 flex justify-center items-center'>
        <div className='bg-sasak-gold/90 shadow-xl px-6 py-2 border-2 border-sasak-dark font-bold text-sasak-dark text-xl tracking-wider -rotate-12'>
          COMING SOON
        </div>
      </div>
    )}

    {/* Content */}
    <div className='z-10 absolute inset-0 flex flex-col justify-end p-8'>
      <div
        className={`mb-auto w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 ${
          selected ? 'bg-sasak-gold text-sasak-dark' : 'bg-white/10 text-white'
        }`}
      >
        {icon}
      </div>

      <h3 className='mb-2 font-display font-medium text-white text-3xl leading-tight'>
        {title}
      </h3>
      {subtitle && (
        <p className='font-body text-sasak-cream/60 text-sm tracking-wide'>
          {subtitle}
        </p>
      )}

      <div
        className={`mt-6 w-full h-px ${
          selected ? 'bg-sasak-gold' : 'bg-white/20'
        } transition-all group-hover:w-full group-hover:bg-white`}
      ></div>
    </div>
  </button>
)
