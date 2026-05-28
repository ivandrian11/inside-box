import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, RefreshCw, Layers } from 'lucide-react'
import { TEMPLATES } from '@/constants'
import { Template } from '@/types'

interface AbandonedSession {
  ticket_code: string
  photo_count: number
  created_at: number
  photos: string[]
}

interface SessionRecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  onRecover: (session: AbandonedSession, template: Template) => void
}

type ViewState = 'LIST' | 'PREVIEW' | 'TEMPLATE'

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRecover,
}) => {
  const [sessions, setSessions] = useState<AbandonedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [viewState, setViewState] = useState<ViewState>('LIST')
  const [selectedSession, setSelectedSession] =
    useState<AbandonedSession | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadSessions()
      setViewState('LIST')
      setSelectedSession(null)
    }
  }, [isOpen])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await invoke<AbandonedSession[]>('get_abandoned_sessions')
      setSessions(data)
    } catch (err) {
      console.error('Failed to load abandoned sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const renderList = () => (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-between items-center bg-white/5 p-4 rounded-xl'>
        <h3 className='font-bold text-white text-xl'>
          Pulihkan Sesi (Tidak Selesai)
        </h3>
        <button
          onClick={loadSessions}
          className='hover:bg-white/10 p-2 rounded-lg text-white/50 transition-colors'
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {sessions.length === 0 && !loading && (
        <div className='py-12 text-white/50 text-center'>
          Tidak ada sesi yang tertunda.
        </div>
      )}

      <div className='gap-3 grid max-h-[50vh] overflow-y-auto'>
        {sessions.map((session) => (
          <button
            key={session.ticket_code}
            onClick={() => {
              setSelectedSession(session)
              setViewState('PREVIEW')
            }}
            className='flex justify-between items-center bg-white/5 hover:bg-white/10 p-4 border border-white/5 rounded-xl text-left transition-colors'
          >
            <div>
              <div className='font-mono font-bold text-sasak-gold text-lg'>
                {session.ticket_code}
              </div>
              <div className='text-white/50 text-xs'>
                {new Date(session.created_at * 1000).toLocaleString('id-ID')}
              </div>
            </div>
            <div className='flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full'>
              <Layers size={14} className='text-sasak-gold' />
              <span className='font-bold text-white text-sm'>
                {session.photo_count} Foto
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderPreview = () => {
    if (!selectedSession) return null
    return (
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-4 mb-2'>
          <button
            onClick={() => setViewState('LIST')}
            className='text-white/50 hover:text-white transition-colors'
          >
            &larr; Kembali
          </button>
          <h3 className='font-bold text-white text-xl'>
            Preview: {selectedSession.ticket_code}
          </h3>
        </div>

        <div className='gap-2 grid grid-cols-2 bg-black/20 p-4 rounded-xl max-h-[50vh] overflow-y-auto'>
          {selectedSession.photos.map((photo, idx) => {
            const port = import.meta.env.VITE_BACKEND_PORT || '3847'
            return (
              <img
                key={idx}
                src={`http://127.0.0.1:${port}/photos/${selectedSession.ticket_code}/${photo}`}
                alt={photo}
                className='rounded-lg w-full h-32 object-cover'
              />
            )
          })}
        </div>

        <button
          onClick={() => setViewState('TEMPLATE')}
          className='bg-sasak-gold py-3 rounded-xl font-bold text-black hover:scale-[1.02] active:scale-[0.98] transition-colors'
        >
          Lanjut Pilih Template ({selectedSession.photo_count} foto)
        </button>
      </div>
    )
  }

  const renderTemplate = () => {
    if (!selectedSession) return null

    // Filter templates matching exactly the number of photos in the session
    const validTemplates = TEMPLATES.filter(
      (t) => t.photoCount === selectedSession.photo_count,
    )

    return (
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-4 mb-2'>
          <button
            onClick={() => setViewState('PREVIEW')}
            className='text-white/50 hover:text-white transition-colors'
          >
            &larr; Kembali
          </button>
          <div>
            <h3 className='font-bold text-white text-xl'>Pilih Template</h3>
            <div className='text-sasak-gold text-xs'>
              Hanya template {selectedSession.photo_count} slot
            </div>
          </div>
        </div>

        {validTemplates.length === 0 ? (
          <div className='py-8 text-red-400 text-center'>
            Tidak ada template yang cocok dengan {selectedSession.photo_count}{' '}
            foto.
          </div>
        ) : (
          <div className='gap-4 grid grid-cols-2 max-h-[50vh] overflow-y-auto'>
            {validTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onRecover(selectedSession, template)}
                className='flex flex-col items-center bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all'
              >
                <img
                  src={template.previewUrl}
                  alt={template.name}
                  className='mb-2 rounded-lg w-full h-auto object-contain'
                  style={{ maxHeight: '200px' }}
                />
                <div className='font-bold text-white text-sm'>
                  {template.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='z-50 fixed inset-0 flex justify-center items-center bg-black/80 backdrop-blur-sm animate-fade-in'>
      <div className='relative bg-[#1a1512] shadow-2xl p-6 md:p-8 border border-sasak-gold/30 rounded-3xl w-full max-w-2xl'>
        {/* Close Button */}
        <button
          onClick={onClose}
          className='-top-4 -right-4 absolute bg-black hover:bg-neutral-900 shadow-lg p-2 border border-sasak-gold/30 rounded-full text-white/50 hover:text-white transition-colors'
        >
          <X size={24} />
        </button>

        {viewState === 'LIST' && renderList()}
        {viewState === 'PREVIEW' && renderPreview()}
        {viewState === 'TEMPLATE' && renderTemplate()}
      </div>
    </div>
  )
}
