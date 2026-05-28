import React from 'react'
import { Settings, X } from 'lucide-react'

interface CameraControlsProps {
  showDeviceMenu: boolean
  setShowDeviceMenu: (show: boolean) => void
  videoDevices: MediaDeviceInfo[]
  activeCameraId: string | null
  setActiveCameraId: (id: string) => void
  flipHorizontal: boolean
  toggleFlipH: () => void
  flipVertical: boolean
  toggleFlipV: () => void
  isPortrait: boolean
  togglePortrait: () => void
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  showDeviceMenu,
  setShowDeviceMenu,
  videoDevices,
  activeCameraId,
  setActiveCameraId,
}) => {
  return (
    <div
      id='tour-camera-controls'
      className='top-24 left-6 z-60 fixed flex flex-col items-start gap-3'
    >
      {/* Row 1: Camera Setting Button */}
      <div id='tour-camera-row-1' className='z-100 relative'>
        <button
          onClick={() => setShowDeviceMenu(!showDeviceMenu)}
          title='Camera Settings'
          className={`flex flex-col items-center justify-center backdrop-blur-md w-16 h-16 rounded-xl transition-all shadow-lg ${
            showDeviceMenu
              ? 'bg-sasak-gold text-sasak-dark'
              : 'bg-white text-sasak-dark hover:bg-sasak-gold'
          }`}
        >
          <Settings size={24} />
          <span className='mt-1 font-bold text-[10px]'>Config</span>
        </button>

        {/* Dropdown Menu */}
        {showDeviceMenu && (
          <>
            {/* Invisible Backdrop to handle click outside */}
            <div
              className='z-40 fixed inset-0'
              onClick={() => setShowDeviceMenu(false)}
            />

            <div
              className='top-16 left-0 z-50 absolute flex flex-col gap-1 bg-black/90 shadow-2xl backdrop-blur-xl mt-2 p-2 border border-white/10 rounded-xl w-64 max-h-60 overflow-y-auto animate-fade-in'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex justify-between items-center mb-1 px-2 py-1 pb-2 border-white/10 border-b'>
                <span className='font-bold text-[10px] text-white/40 uppercase tracking-widest'>
                  Select Camera
                </span>
                <button onClick={() => setShowDeviceMenu(false)}>
                  <X size={14} className='text-white/50 hover:text-white' />
                </button>
              </div>

              {videoDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => {
                    setActiveCameraId(device.deviceId)
                    localStorage.setItem('selectedCameraId', device.deviceId)
                    setShowDeviceMenu(false)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                    activeCameraId === device.deviceId
                      ? 'bg-sasak-gold text-sasak-dark font-bold'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span className='flex-1 truncate'>
                    {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                  </span>
                  {activeCameraId === device.deviceId && (
                    <div className='bg-sasak-dark rounded-full w-1.5 h-1.5' />
                  )}
                </button>
              ))}
              {videoDevices.length === 0 && (
                <div className='p-2 text-white/40 text-xs text-center'>
                  No cameras found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Camera Tools Container */}
      <div id='tour-camera-tools' className='flex flex-col gap-3'>
        {/* Row 2: Flip Buttons (Commented out per user request) */}
        {/* <div id='tour-camera-row-2' className='flex gap-3'>
          <button
            onClick={toggleFlipH}
            title='Flip Horizontal'
            className={`flex flex-col items-center justify-center backdrop-blur-md w-16 h-16 rounded-xl transition-all shadow-lg ${
              flipHorizontal
                ? 'bg-sasak-gold text-sasak-dark'
                : 'bg-white text-sasak-dark hover:bg-sasak-gold'
            }`}
          >
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M12 3v18M17 8l4 4-4 4M7 8l-4 4 4 4' />
            </svg>
            <span className='mt-1 font-bold text-[10px]'>Flip H</span>
          </button>

          <button
            onClick={toggleFlipV}
            title='Flip Vertical'
            className={`flex flex-col items-center justify-center backdrop-blur-md w-16 h-16 rounded-xl transition-all shadow-lg ${
              flipVertical
                ? 'bg-sasak-gold text-sasak-dark'
                : 'bg-white text-sasak-dark hover:bg-sasak-gold'
            }`}
          >
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4' />
            </svg>
            <span className='mt-1 font-bold text-[10px]'>Flip V</span>
          </button>
        </div> */}


      </div>
    </div>
  )
}
