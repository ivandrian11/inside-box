import React from 'react'
import {
  Camera,
  Trash2,
  Calendar,
  Settings,
  RefreshCw,
  Eye,
  X,
  ChevronRight,
} from 'lucide-react'

interface CameraDevice {
  id: string
  label: string
}

interface AdminDashboardProps {
  cameras: CameraDevice[]
  selectedCamera: string
  handleCameraChange: (cameraId: string) => void
  flipHorizontal: boolean
  handleFlipHorizontalChange: (enabled: boolean) => void
  flipVertical: boolean
  handleFlipVerticalChange: (enabled: boolean) => void
  isPortrait: boolean
  handleIsPortraitChange: (enabled: boolean) => void
  previewStream: MediaStream | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  startPreview: (cameraId?: string) => void
  stopPreview: () => void
  loadCameras: () => void
  sessionDuration: number
  handleDurationChange: (minutes: number) => void
  timerScope: string
  handleTimerScopeChange: (scope: string) => void
  sessionPrice: number
  handlePriceChange: (priceInThousands: number) => void
  place: string
  handlePlaceChange: (val: string) => void
  isLoading: boolean
  handleDeleteTodayPhotos: () => void
  handleDeleteYesterdayPhotos: () => void
  handleDeleteOldPhotos: () => void
  handleRefreshApp: () => void
  debugMode: boolean
  handleDebugModeChange: (enabled: boolean) => void
  handleExport: () => void
  handleClearDatabase: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  cameras,
  selectedCamera,
  handleCameraChange,
  flipHorizontal,
  handleFlipHorizontalChange,
  flipVertical,
  handleFlipVerticalChange,
  isPortrait,
  handleIsPortraitChange,
  previewStream,
  videoRef,
  startPreview,
  stopPreview,
  loadCameras,
  sessionDuration,
  handleDurationChange,
  timerScope,
  handleTimerScopeChange,
  sessionPrice,
  handlePriceChange,
  place,
  handlePlaceChange,
  isLoading,
  handleDeleteTodayPhotos,
  handleDeleteYesterdayPhotos,
  handleDeleteOldPhotos,
  handleRefreshApp,
  debugMode,
  handleDebugModeChange,
  handleExport,
  handleClearDatabase,
}) => {
  return (
    <div className='gap-6 grid grid-cols-2 animate-fade-in'>
      {/* Camera Selection */}
      <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-4 shadow-sm'>
        <div className='flex items-center gap-3 text-studio-primary'>
          <Camera size={20} strokeWidth={2.5} />
          <span className='font-display font-black italic tracking-widest uppercase text-xs'>Pilih Kamera</span>
        </div>
        <select
          value={selectedCamera}
          onChange={(e) => handleCameraChange(e.target.value)}
          className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary focus:ring-4 focus:ring-studio-primary/5 transition-all'
        >
          <option value=''>-- Otomatis --</option>
          {cameras.map((cam) => (
            <option key={cam.id} value={cam.id}>
              {cam.label}
            </option>
          ))}
        </select>

        {/* Camera Orientation and Flips */}
        <div className='grid grid-cols-3 gap-2 pt-2'>
          <label className='flex flex-col items-center justify-center bg-white p-3 border border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group text-center'>
            <input
              type='checkbox'
              checked={flipHorizontal}
              onChange={(e) => handleFlipHorizontalChange(e.target.checked)}
              className='mb-1.5 w-5 h-5 accent-studio-primary cursor-pointer'
            />
            <span className='font-display font-bold text-studio-text text-[10px] uppercase tracking-wider'>
              Flip H
            </span>
          </label>

          <label className='flex flex-col items-center justify-center bg-white p-3 border border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group text-center'>
            <input
              type='checkbox'
              checked={flipVertical}
              onChange={(e) => handleFlipVerticalChange(e.target.checked)}
              className='mb-1.5 w-5 h-5 accent-studio-primary cursor-pointer'
            />
            <span className='font-display font-bold text-studio-text text-[10px] uppercase tracking-wider'>
              Flip V
            </span>
          </label>

          <label className='flex flex-col items-center justify-center bg-white p-3 border border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group text-center'>
            <input
              type='checkbox'
              checked={isPortrait}
              onChange={(e) => handleIsPortraitChange(e.target.checked)}
              className='mb-1.5 w-5 h-5 accent-studio-primary cursor-pointer'
            />
            <span className='font-display font-bold text-studio-text text-[10px] uppercase tracking-wider'>
              Portrait
            </span>
          </label>
        </div>

        {/* Camera Preview */}
        <div className='mt-2'>
          {previewStream ? (
            <div className='relative group'>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className='border-4 border-white shadow-lg rounded-xl w-full aspect-video object-cover transition-transform duration-500'
                style={{
                  transform: isPortrait
                    ? `rotate(-90deg) scale(1.3) scaleX(${
                        flipVertical ? -1 : 1
                      }) scaleY(${flipHorizontal ? 1 : -1})`
                    : `scaleX(${flipHorizontal ? 1 : -1}) scaleY(${
                        flipVertical ? -1 : 1
                      })`,
                }}
              />
              <button
                onClick={stopPreview}
                className='top-3 right-3 absolute bg-red-600 shadow-lg p-2 rounded-lg text-white hover:scale-110 active:scale-95 transition-all'
                title='Tutup Preview'
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => startPreview(selectedCamera || undefined)}
              className='group flex items-center justify-center gap-2 bg-white hover:bg-studio-primary hover:text-white py-4 rounded-xl border-2 border-studio-border w-full text-studio-text font-bold text-sm transition-all shadow-sm'
            >
              <Eye size={18} />
              Preview Kamera
            </button>
          )}
        </div>

        <button
          onClick={loadCameras}
          className='flex items-center gap-2 font-bold text-studio-textLight hover:text-studio-primary text-[0.65rem] uppercase tracking-widest italic transition-colors'
        >
          <RefreshCw size={12} strokeWidth={3} /> Refresh daftar kamera
        </button>
      </div>

      {/* Session Settings Group */}
      <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-6 shadow-sm'>
        {/* Duration */}
        <div className='space-y-3'>
          <div className='flex items-center gap-3 text-studio-primary'>
            <Settings size={20} strokeWidth={2.5} />
            <span className='font-display font-black italic tracking-widest uppercase text-xs'>Durasi Sesi</span>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <select
              value={sessionDuration}
              onChange={(e) =>
                handleDurationChange(parseInt(e.target.value, 10))
              }
              className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary transition-all'
            >
              {[1, 3, 5, 7, 10, 12, 15, 20, 30].map(min => (
                <option key={min} value={min}>{min} Menit</option>
              ))}
            </select>
            
            <select
              value={timerScope}
              onChange={(e) => handleTimerScopeChange(e.target.value)}
              className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary transition-all'
            >
              <option value='STEP_03_ONLY'>Hanya Capture</option>
              <option value='STEP_03_04'>Capture - Edit & Review</option>
              <option value='STEP_03_05'>Capture - Atur Posisi</option>
            </select>
          </div>
          <div className='flex justify-between items-center text-studio-textLight text-[0.6rem] font-bold italic opacity-60'>
             <span>Waktu Sesi (Menit)</span>
             <span>Jangkauan Timer</span>
          </div>
        </div>

        {/* Price */}
        <div className='space-y-3 pt-6 border-t border-studio-border'>
          <div className='flex items-center gap-3 text-studio-primary'>
            <span className='text-xl'>💰</span>
            <span className='font-display font-black italic tracking-widest uppercase text-xs'>Harga Sesi (Rp)</span>
          </div>
          <div className='flex items-center gap-3'>
            <div className='relative flex-1'>
              <span className='absolute left-4 top-1/2 -translate-y-1/2 text-studio-textLight font-mono text-sm opacity-50'>Rp</span>
              <input
                type='number'
                value={sessionPrice}
                onChange={(e) =>
                  handlePriceChange(parseInt(e.target.value, 10) || 0)
                }
                className='w-full bg-white pl-10 pr-4 py-3 border-2 border-studio-border rounded-xl font-display font-black text-studio-text text-xl italic focus:outline-none focus:border-studio-primary transition-all'
                placeholder='25'
              />
            </div>
            <span className='font-display font-black text-studio-primary text-2xl italic'>.000</span>
          </div>
        </div>

        {/* Lokasi / Place */}
        <div className='space-y-3 pt-6 border-t border-studio-border'>
          <div className='flex items-center gap-3 text-studio-primary'>
            <span className='text-xl'>📍</span>
            <span className='font-display font-black italic tracking-widest uppercase text-xs'>Lokasi Booth (Place)</span>
          </div>
          <div className='flex items-center gap-3'>
            <input
              type='text'
              value={place}
              onChange={(e) => handlePlaceChange(e.target.value)}
              className='w-full bg-white px-4 py-3 border-2 border-studio-border rounded-xl font-display font-bold text-studio-text text-sm focus:outline-none focus:border-studio-primary transition-all'
              placeholder='Contoh: Mall A, Booth 1'
            />
          </div>
        </div>
      </div>

      {/* Photos & Assets Management */}
      <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-4 shadow-sm'>
        <div className='flex items-center gap-3 text-studio-primary'>
          <Trash2 size={20} strokeWidth={2.5} />
          <span className='font-display font-black italic tracking-widest uppercase text-xs'>Kelola Data Foto</span>
        </div>
        <div className='space-y-2'>
          <button
            onClick={handleDeleteTodayPhotos}
            disabled={isLoading}
            className='group flex items-center justify-between bg-white hover:bg-red-50 hover:text-red-600 disabled:opacity-50 px-5 py-4 border-2 border-studio-border rounded-xl w-full text-studio-text font-bold text-xs transition-all'
          >
            <div className='flex items-center gap-3 uppercase tracking-widest italic'>
              <Calendar size={16} />
              <span>Hapus Foto Hari Ini</span>
            </div>
            <ChevronRight size={14} className='opacity-0 group-hover:opacity-100 transform translate-x-1 transition-all' />
          </button>
          <button
            onClick={handleDeleteYesterdayPhotos}
            disabled={isLoading}
             className='group flex items-center justify-between bg-white hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50 px-5 py-4 border-2 border-studio-border rounded-xl w-full text-studio-text font-bold text-xs transition-all'
          >
            <div className='flex items-center gap-3 uppercase tracking-widest italic'>
               <Calendar size={16} />
              <span>Hapus Foto Kemarin</span>
            </div>
            <ChevronRight size={14} className='opacity-0 group-hover:opacity-100 transform translate-x-1 transition-all' />
          </button>
          <button
            onClick={handleDeleteOldPhotos}
            disabled={isLoading}
            className='group flex items-center justify-between bg-white hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 px-5 py-4 border-2 border-studio-border rounded-xl w-full text-studio-text font-bold text-xs transition-all'
          >
            <div className='flex items-center gap-3 uppercase tracking-widest italic'>
              <Trash2 size={16} />
              <span>Hapus Foto Lama</span>
            </div>
            <ChevronRight size={14} className='opacity-0 group-hover:opacity-100 transform translate-x-1 transition-all' />
          </button>
        </div>
      </div>

      {/* App Logic & Controls */}
      <div className='bg-studio-bg/40 p-6 border border-studio-border rounded-2xl space-y-4 shadow-sm'>
        <div className='flex items-center gap-3 text-studio-primary'>
          <RefreshCw size={20} strokeWidth={2.5} />
          <span className='font-display font-black italic tracking-widest uppercase text-xs'>Kontrol Aplikasi</span>
        </div>
        <div className='space-y-4'>
          <button
            onClick={handleRefreshApp}
            className='flex items-center justify-center gap-3 bg-studio-primary shadow-lg shadow-studio-primary/20 text-white py-4 rounded-xl w-full font-display font-black uppercase tracking-widest text-xs italic hover:scale-[1.02] active:scale-95 transition-all'
          >
            <RefreshCw size={16} strokeWidth={3} />
            Refresh Aplikasi
          </button>

          {/* Debug Mode Toggle - Elegant Style */}
          <label className='flex items-center gap-4 bg-white px-5 py-4 border-2 border-studio-border rounded-xl hover:border-studio-primary/30 transition-all cursor-pointer group'>
            <input
              type='checkbox'
              checked={debugMode}
              onChange={(e) => handleDebugModeChange(e.target.checked)}
              className='w-6 h-6 accent-studio-primary cursor-pointer'
            />
            <div className='flex-1'>
              <span className='block font-display font-black text-studio-text text-sm italic uppercase tracking-widest'>
                Debug Mode
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Database & Export Section - Full Width */}
      <div className='col-span-2 bg-studio-text/5 p-6 border-2 border-dashed border-studio-border rounded-3xl space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3 text-studio-text'>
            <span className='text-xl'>🗄️</span>
            <span className='font-display font-black italic tracking-widest uppercase text-xs'>Manajemen Data Utama</span>
          </div>
          <div className='px-4 py-1.5 bg-studio-primary/10 rounded-full border border-studio-primary/20'>
             <p className='text-[0.6rem] text-studio-primary font-black uppercase tracking-widest italic'>
               Secured Database
             </p>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className='flex flex-col items-center justify-center gap-2 bg-white hover:bg-studio-primary hover:text-white disabled:opacity-50 p-6 border-2 border-studio-border rounded-2xl w-full text-studio-text transition-all group shadow-sm'
          >
            <span className='text-3xl group-hover:scale-110 transition-transform'>📊</span>
            <span className='font-display font-black text-sm uppercase tracking-widest italic'>Export Sesi (Excel)</span>
            <p className='text-[0.55rem] font-bold opacity-40 uppercase tracking-widest'>Google Sheets API</p>
          </button>

          <button
            onClick={handleClearDatabase}
            disabled={isLoading}
            className='flex flex-col items-center justify-center gap-2 bg-white hover:bg-red-600 hover:text-white disabled:opacity-50 p-6 border-2 border-studio-border rounded-2xl w-full text-studio-text transition-all group shadow-sm'
          >
            <Trash2 size={32} className='group-hover:scale-110 transition-transform' />
            <span className='font-display font-black text-sm uppercase tracking-widest italic'>Reset Semua Data</span>
            <p className='text-[0.55rem] font-bold opacity-40 uppercase tracking-widest'>Clear Database History</p>
          </button>
        </div>
      </div>
    </div>
  )
}
