import React from 'react'
import {
  Printer,
  QrCode,
  Loader2,
  ChevronRight,
  CheckCircle2
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { SessionSaveResult } from '../../services/localStorageService'
import { UploadProgressInfo } from '../../services/googleDriveService'

interface ResultViewProps {
  compositeResult: string | null
  saveResult: SessionSaveResult | null
  isSaving: boolean
  isPrinting: boolean
  printMenuUnlocked: boolean
  autoPrintSuccess: boolean
  ticketCode: string | null
  onPrint: () => Promise<void>
  onDownload: () => void
  onNewSession: () => void
  onSecretUnlock: () => void
  uploadProgressInfo: UploadProgressInfo | null
  debugModeInfo?: {
    isDebugMode: boolean
    clickCount: number
  }
}

export const ResultView: React.FC<ResultViewProps> = ({
  compositeResult,
  saveResult,
  isSaving,
  isPrinting,
  printMenuUnlocked,
  autoPrintSuccess,
  ticketCode,
  onPrint,
  onNewSession,
  onSecretUnlock,
  uploadProgressInfo,
  debugModeInfo,
}) => {
  const [showNewSessionConfirm, setShowNewSessionConfirm] =
    React.useState(false)

  return (
    <div className='relative flex flex-col justify-center items-center w-full h-full overflow-hidden'>
      {/* Absolute Header - Pushed to absolute top to save space */}
      <div className='absolute top-4 left-1/2 -translate-x-1/2 z-50 text-center w-full max-w-xl pointer-events-none animate-fade-in'>
         <h2 className='font-display font-medium text-studio-text text-3xl italic tracking-tight mb-0'>
          Terima Kasih!
        </h2>
        <p className='font-display font-bold text-[0.6rem] text-studio-primary opacity-60 uppercase tracking-[0.4em] italic leading-none mt-1'>
          Photo Session Complete
        </p>

        {/* Printing Badge - Integrated into header to prevent layout shift */}
        {isPrinting && (
          <div className='flex items-center justify-center gap-2 bg-studio-primary text-white mt-4 mx-auto px-6 py-2 rounded-xl shadow-lg border border-white/20 animate-pulse w-fit pointer-events-auto'>
            <Printer size={16} strokeWidth={2.5} />
            <span className='font-display font-black text-xs uppercase tracking-widest italic'>Sedang Mencetak...</span>
          </div>
        )}
      </div>

      {/* Secret Unlock Button (Top Left) */}
      <div
        onClick={onSecretUnlock}
        className='top-0 left-0 z-550 absolute bg-transparent w-20 h-20 cursor-default'
        title={
          debugModeInfo?.isDebugMode
            ? `Clicks: ${debugModeInfo.clickCount}/5`
            : ''
        }
      />

      {/* Scrollable Container for Content with Animation - Rebalanced Proportions */}
      <div className='flex flex-col justify-center items-center px-4 pt-24 pb-2 w-full h-full animate-fade-in overflow-y-auto no-scrollbar'>

        {/* Main Content - Preserving User-Preferred Image Size (64vh) */}
        <div className='flex lg:flex-row flex-col justify-center items-center gap-10 mb-4 w-full max-w-5xl'>
          
          {/* Composited Result Image */}
          <div id='tour-done-image' className='relative group shrink-0'>
            {compositeResult ? (
              <div className='relative ring-8 ring-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.18)] rounded-2xl overflow-hidden'>
                <img
                  src={compositeResult}
                  alt='Photo Booth Result'
                  className='w-auto max-h-[64vh] object-contain transform group-hover:scale-[1.01] transition-transform duration-700'
                />
              </div>
            ) : (
              <div className='flex flex-col justify-center items-center bg-white/40 backdrop-blur-3xl rounded-3xl w-72 h-[50vh] border border-white/20'>
                <Loader2
                  className='mb-4 text-studio-primary animate-spin'
                  size={40}
                />
                <p className='text-studio-textLight font-bold uppercase tracking-widest text-[0.6rem] italic'>Memuat gambar...</p>
              </div>
            )}
          </div>

          {/* QR Code Section - Tightened Padding to Fit Vertically */}
          <div
            id='tour-done-qr'
            className='flex flex-col items-center bg-white border border-studio-border rounded-3xl p-6 shadow-xl relative overflow-hidden min-w-[280px]'
          >
            {isSaving || (uploadProgressInfo && uploadProgressInfo.status !== 'success' && uploadProgressInfo.status !== 'error') ? (
              <div className='flex flex-col items-center p-6 w-full min-h-[220px] justify-center'>
                <div className='p-4 bg-studio-bg rounded-2xl mb-4 relative flex items-center justify-center'>
                  <Loader2
                    className='text-studio-primary animate-spin'
                    size={36}
                  />
                  {uploadProgressInfo && uploadProgressInfo.status === 'uploading' && (
                    <span className='absolute text-[0.65rem] font-display font-black text-studio-primary mt-0.5'>
                      {uploadProgressInfo.overallPercent}%
                    </span>
                  )}
                </div>
                
                <p className='text-studio-text font-display font-black uppercase tracking-widest text-xs italic mb-2 text-center'>
                  {uploadProgressInfo ? (
                    uploadProgressInfo.status === 'authenticating' ? 'Menghubungkan Drive...' :
                    uploadProgressInfo.status === 'creating_folder' ? 'Membuat Folder...' :
                    'Mengunggah Foto...'
                  ) : 'Menyimpan...'}
                </p>

                {uploadProgressInfo && (
                  <div className='w-full max-w-[200px] mt-1'>
                    <div className='w-full bg-studio-bg rounded-full h-2 overflow-hidden border border-studio-border/50'>
                      <div
                        className='bg-studio-primary h-full rounded-full transition-all duration-300 ease-out'
                        style={{ width: `${uploadProgressInfo.overallPercent}%` }}
                      />
                    </div>
                    
                    <p className='text-[0.6rem] text-studio-textLight font-medium text-center mt-2 tracking-wider leading-relaxed opacity-75'>
                      {uploadProgressInfo.message}
                    </p>
                  </div>
                )}
              </div>
            ) : saveResult ? (
              <>
                <div className='flex flex-col items-center gap-1 mb-3'>
                  <div className='bg-studio-primary text-white p-2 rounded-xl shadow-md mb-1'>
                    <QrCode size={20} strokeWidth={2.5} />
                  </div>
                  <h4 className='font-display font-black text-sm text-studio-text uppercase tracking-widest italic'>
                    Download
                  </h4>
                </div>

                <div className='bg-white p-2.5 rounded-2xl shadow-inner border border-studio-bg mb-3'>
                  <QRCodeSVG
                    value={saveResult.driveUrl || saveResult.galleryUrl}
                    size={150}
                    level='M'
                    includeMargin={false}
                    className='rounded-xl'
                  />
                </div>

                <div className='bg-studio-bg/50 px-3 py-2 rounded-xl border border-studio-border text-center max-w-[200px] mb-2 font-display font-bold text-[0.6rem] text-studio-textLight uppercase tracking-widest italic'>
                    Scan QR to Download
                </div>

                {uploadProgressInfo?.status === 'error' && (
                  <div className='mt-1 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200 text-center max-w-[220px]'>
                    <p className='text-[0.55rem] text-amber-700 font-bold uppercase tracking-wider mb-0.5'>
                      ⚠️ Cloud Offline
                    </p>
                    <p className='text-[0.5rem] text-amber-600 font-medium leading-normal'>
                      Hubungkan ke WiFi Booth untuk download foto secara lokal.
                    </p>
                  </div>
                )}

                {uploadProgressInfo?.status === 'success' && (
                  <div className='mt-1 px-3 py-1 bg-green-50 rounded-xl border border-green-200 flex items-center justify-center gap-1 max-w-[200px]'>
                    <CheckCircle2 size={10} className='text-green-600' />
                    <span className='text-[0.55rem] text-green-700 font-bold uppercase tracking-widest'>
                      Google Drive Ready
                    </span>
                  </div>
                )}
                
                <div className='h-2' />
              </>
            ) : (
              <div className='flex flex-col items-center p-8 text-center'>
                <div className='w-16 h-16 bg-studio-bg rounded-full flex items-center justify-center mb-4'>
                   <QrCode className='text-studio-primary/20' size={32} />
                </div>
                <p className='text-studio-textLight font-bold uppercase tracking-widest italic text-xs'>
                  QR code akan muncul
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Secret Action Menu (Admin/Unlocked) */}
        {printMenuUnlocked && (
          <div className='flex flex-wrap justify-center gap-4 mb-4 animate-slide-up bg-white/50 p-2 rounded-2xl border border-studio-border'>
            <button
              onClick={onPrint}
              disabled={isPrinting || !ticketCode || autoPrintSuccess}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-display font-black text-[0.65rem] uppercase tracking-widest italic shadow-md transition-all ${
                autoPrintSuccess
                  ? 'bg-studio-bg text-studio-textLight/40 border border-studio-border'
                  : 'bg-studio-primary text-white hover:scale-102 active:scale-98'
              }`}
            >
              <Printer size={14} strokeWidth={3} />
              {isPrinting ? 'Mencetak...' : autoPrintSuccess ? 'Success' : 'Print Again'}
            </button>
          </div>
        )}

        {/* Primary Action Button - More Compact Vertical Margin */}
        <button
          onClick={() => setShowNewSessionConfirm(true)}
          className='group relative flex items-center gap-3 bg-studio-primary text-white px-10 py-4 rounded-3xl font-display font-black text-xl uppercase tracking-widest italic shadow-xl shadow-studio-primary/30 hover:scale-105 active:scale-95 transition-all duration-300'
        >
          <span>Selesai / Sesi Baru</span>
          <div className='bg-white/20 p-1.5 rounded-full transform group-hover:translate-x-1.5 transition-transform duration-300'>
             <ChevronRight size={22} strokeWidth={4} />
          </div>
        </button>
      </div>

      {/* New Session Confirmation Modal */}
      {showNewSessionConfirm && (
        <div className='z-9999 fixed inset-0 flex justify-center items-center bg-studio-text/90 backdrop-blur-2xl animate-fade-in p-8'>
          <div className='bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] p-10 border border-studio-border rounded-[2.5rem] w-full max-w-lg text-center transform animate-scale-in'>
            <div className='flex justify-center items-center bg-studio-primary/10 mx-auto mb-6 border border-studio-primary/20 rounded-full w-20 h-20 text-studio-primary'>
              <CheckCircle2 size={40} strokeWidth={2.5} />
            </div>
            <h3 className='mb-3 font-display font-black text-studio-text text-3xl uppercase tracking-widest italic'>
              Sesi Berakhir?
            </h3>
            <p className='mb-8 font-bold text-studio-textLight text-base leading-relaxed'>
              Pastikan Anda sudah mengunduh hasil foto. 
              <br/>
              Siap untuk memotret customer berikutnya?
            </p>
            <div className='flex gap-4'>
              <button
                onClick={() => setShowNewSessionConfirm(false)}
                className='flex-1 py-4 border-2 border-studio-border rounded-xl font-bold text-studio-text text-base hover:bg-studio-bg transition-colors uppercase tracking-widest italic'
              >
                Batal
              </button>
              <button
                onClick={onNewSession}
                className='flex-1 bg-studio-primary shadow-xl py-4 rounded-xl font-black text-white text-lg transition-all hover:scale-105 active:scale-95 uppercase tracking-widest italic'
              >
                Mulai Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
