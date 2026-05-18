import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  AppStep,
  BoothState,
  FeatureType,
  BackgroundType,
  Template,
  PhotoData,
} from '../types'
import { SESSION_DURATION_SECONDS } from '../constants'

// Get session duration from localStorage (admin setting) or fallback to constant
const getSessionDurationSeconds = (): number => {
  const savedMinutes = localStorage.getItem('sessionDurationMinutes')
  if (savedMinutes) {
    return parseInt(savedMinutes, 10) * 60
  }
  return SESSION_DURATION_SECONDS
}

interface BoothContextType extends BoothState {
  setStep: (step: AppStep) => void
  startSession: () => void
  startTimer: () => void
  resetSession: () => void
  selectTemplate: (template: Template, initialPhotos?: PhotoData[]) => void
  selectFeature: (feature: FeatureType) => void
  selectBackground: (bg: BackgroundType) => void
  selectEffect: (effect: string) => void
  savePhoto: (photo: string) => void
  setPhotoIndex: (index: number) => void
  updateProcessedPhoto: (index: number, processedData: string) => void
  setCompositeResult: (result: string) => void
  setTicketCode: (code: string) => void
  togglePhotoFlip: (photoIndex: number) => void
  setAutoPrintSuccess: (success: boolean) => void
  setTimerPaused: (paused: boolean) => void
  ackTimeout: () => void
  setPhotos: (newPhotos: PhotoData[]) => void
  setSelectedSequence: (update: number[] | ((prev: number[]) => number[])) => void
}

const BoothContext = createContext<BoothContextType | null>(null)

export const BoothProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<BoothState>({
    step: AppStep.HOME,
    timeLeft: getSessionDurationSeconds(),
    isSessionActive: false,
    selectedTemplate: null,
    selectedFeature: FeatureType.STANDARD,
    selectedBackground: BackgroundType.RAW,
    selectedEffect: 'none',
    photos: [],
    currentPhotoIndex: 0,
    autoPrintSuccess: false,
    isTimerPaused: false,
    isTimeout: false,
    showTimeoutModal: false,
    selectedSequence: [],
  })

  // Timer Logic - only runs when isSessionActive is true AND not paused
  useEffect(() => {
    let interval: number

    // Get Timer Scope (default: Step 03 / CAMERA)
    const timerScope = localStorage.getItem('sessionTimerScope') || 'STEP_03'

    // Determine if timer should be ticking in the current step
    let isTimerRunningStep = false
    
    if (timerScope === 'STEP_03_ONLY') {
      isTimerRunningStep = state.step === AppStep.CAMERA
    } else if (timerScope === 'STEP_03_04') {
      isTimerRunningStep = state.step === AppStep.CAMERA || state.step === AppStep.REVIEW
    } else if (timerScope === 'STEP_03_05') {
       isTimerRunningStep = state.step === AppStep.CAMERA || state.step === AppStep.REVIEW || state.step === AppStep.ARRANGE
    } else {
      // Default: Only Camera (Backward compatibility/safety)
      isTimerRunningStep = state.step === AppStep.CAMERA
    }

    if (
      state.isSessionActive &&
      state.timeLeft > -1 &&
      isTimerRunningStep &&
      !state.isTimerPaused
    ) {
      interval = window.setInterval(() => {
        setState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 }))
      }, 1000)
    } else if (state.timeLeft === -1 && state.isSessionActive) {
      // Time expired (at -1s to allow capture at 0s)

      // Auto-fill empty slots with cyclic logic (only if we were in CAMERA)
      if (state.step === AppStep.CAMERA) {
        const validPhotos = state.photos.filter((p): p is PhotoData => p !== null)
        let finalPhotos = [...state.photos]

        if (validPhotos.length > 0 && validPhotos.length < state.photos.length) {
          finalPhotos = state.photos.map((p, i) => {
            if (p !== null) return p

            // Cyclic fill
            const source = validPhotos[i % validPhotos.length]

            // Save duplicate to disk for remote access
            if (state.ticketCode) {
              import('@tauri-apps/api/core').then(({ invoke }) => {
                invoke('save_photo', {
                  ticketCode: state.ticketCode,
                  photoData: source.original,
                  filename: `photo_${i + 1}.jpg`,
                }).catch(console.error)
              })
            }

            return {
              original: source.original,
              activeFlipIndex: 0,
            }
          })
        }
        
        setState((prev) => ({
          ...prev,
          photos: finalPhotos,
          isSessionActive: false,
          step: AppStep.REVIEW,
          isTimeout: true,
          showTimeoutModal: true,
        }))
      } else {
        // Normal timeout behavior for Review/Arrange
        setState((prev) => ({
          ...prev,
          isSessionActive: false,
          isTimeout: true,
          showTimeoutModal: true,
          // If we time out in Review/Arrange, we usually just force end or stay put but with modal
        }))
      }
    }
    return () => clearInterval(interval)
  }, [
    state.isSessionActive,
    state.timeLeft,
    state.step,
    state.photos,
    state.ticketCode,
    state.isTimerPaused,
  ])

  // Start a new session (goes to payment, timer NOT started yet)
  const startSession = useCallback(() => {
    setState({
      step: AppStep.PAYMENT,
      timeLeft: getSessionDurationSeconds(),
      isSessionActive: false, // Timer NOT active yet
      selectedTemplate: null,
      selectedFeature: FeatureType.STANDARD,
      selectedBackground: BackgroundType.RAW,
      selectedEffect: 'none',
      photos: [],
      currentPhotoIndex: 0,
      autoPrintSuccess: false,
      isTimerPaused: false, // Reset pause state
      isTimeout: false,
      showTimeoutModal: false,
      selectedSequence: [],
    })
  }, [])

  // Start the timer (called after user confirms instructions)
  const startTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSessionActive: true,
      timeLeft: getSessionDurationSeconds(),
    }))
  }, [])

  const resetSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSessionActive: false,
      step: AppStep.HOME,
      photos: [],
      selectedTemplate: null,
    }))
  }, [])

  const selectTemplate = useCallback(
    (template: Template, initialPhotos?: PhotoData[]) => {
      setState((prev) => ({
        ...prev,
        selectedTemplate: template,
        photos: initialPhotos || new Array(template.photoCount).fill(null),
        selectedSequence: Array.from({ length: template.photoCount }, (_, i) => i),
        isSessionActive: true,
      }))
    },
    [],
  )

  const selectFeature = useCallback((feature: FeatureType) => {
    setState((prev) => ({ ...prev, selectedFeature: feature }))
  }, [])

  const selectBackground = useCallback((bg: BackgroundType) => {
    setState((prev) => ({ ...prev, selectedBackground: bg }))
  }, [])

  const selectEffect = useCallback((effect: string) => {
    setState((prev) => ({ ...prev, selectedEffect: effect }))
  }, [])

  const savePhoto = useCallback(
    (photoBase64: string) => {
      // Save to backend filesystem for remote access
      if (state.ticketCode) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('save_photo', {
            ticketCode: state.ticketCode,
            photoData: photoBase64,
            filename: `photo_${state.currentPhotoIndex + 1}.jpg`,
          }).catch((e) => console.error('Failed to save photo to disk:', e))
        })
      }

      setState((prev) => {
        const newPhotos = [...prev.photos]
        newPhotos[prev.currentPhotoIndex] = {
          original: photoBase64,
          activeFlipIndex: 0, // Default tampilkan original
          filename: `photo_${state.currentPhotoIndex + 1}.jpg`,
        }
        let nextStep = prev.step
        let nextIndex = prev.currentPhotoIndex

        const allTaken = newPhotos.every((p) => p !== null)

        if (allTaken) {
          nextStep = AppStep.REVIEW
        } else {
          const nextEmptyIndex = newPhotos.findIndex((p) => p === null)
          if (nextEmptyIndex !== -1) {
            nextIndex = nextEmptyIndex
          }
        }

        return {
          ...prev,
          photos: newPhotos,
          currentPhotoIndex: nextIndex,
          step: nextStep,
        }
      })
    },
    [state.ticketCode, state.currentPhotoIndex],
  )

  const setPhotoIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentPhotoIndex: index,
      step: AppStep.CAMERA,
    }))
  }, [])

  const updateProcessedPhoto = useCallback(
    (index: number, processedData: string) => {
      setState((prev) => {
        const newPhotos = [...prev.photos]
        if (newPhotos[index]) {
          newPhotos[index] = { ...newPhotos[index]!, processed: processedData }
        }
        return { ...prev, photos: newPhotos }
      })
    },
    [],
  )

  const setStep = useCallback((step: AppStep) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const setCompositeResult = useCallback((result: string) => {
    setState((prev) => ({ ...prev, compositeResult: result }))
  }, [])

  const setTicketCode = useCallback((code: string) => {
    setState((prev) => ({ ...prev, ticketCode: code }))
  }, [])

  // Toggle flip card untuk foto (cycle through original + processed)
  const togglePhotoFlip = useCallback((photoIndex: number) => {
    setState((prev) => {
      const newPhotos = [...prev.photos]
      const photo = newPhotos[photoIndex]
      if (photo) {
        const totalStates = photo.processed ? 2 : 1
        const nextIndex = ((photo.activeFlipIndex || 0) + 1) % totalStates
        newPhotos[photoIndex] = {
          ...photo,
          activeFlipIndex: nextIndex,
        }
        return { ...prev, photos: newPhotos }
      }
      return prev
    })
  }, [])

  // Set auto print success status
  const setAutoPrintSuccess = useCallback((success: boolean) => {
    setState((prev) => ({ ...prev, autoPrintSuccess: success }))
  }, [])

  // Set timer paused status
  const setTimerPaused = useCallback((paused: boolean) => {
    setState((prev) => ({ ...prev, isTimerPaused: paused }))
  }, [])

  const ackTimeout = useCallback(() => {
    setState((prev) => ({ ...prev, showTimeoutModal: false }))
  }, [])

  const setPhotos = useCallback((newPhotos: PhotoData[]) => {
    setState((prev) => ({ ...prev, photos: newPhotos }))
  }, [])

  const setSelectedSequence = useCallback(
    (update: number[] | ((prev: number[]) => number[])) => {
      setState((prev) => {
        const nextSequence =
          typeof update === 'function' ? update(prev.selectedSequence) : update
        return { ...prev, selectedSequence: nextSequence }
      })
    },
    [],
  )

  return (
    <BoothContext.Provider
      value={{
        ...state,
        setStep,
        startSession,
        startTimer,
        resetSession,
        selectTemplate,
        selectFeature,
        selectBackground,
        selectEffect,
        savePhoto,
        setPhotoIndex,
        updateProcessedPhoto,
        setCompositeResult,
        setTicketCode,
        togglePhotoFlip,
        setAutoPrintSuccess,
        setTimerPaused,
        ackTimeout,
        setPhotos,
        setSelectedSequence,
      }}
    >
      {children}
    </BoothContext.Provider>
  )
}

export const useBooth = () => {
  const context = useContext(BoothContext)
  if (!context) throw new Error('useBooth must be used within a BoothProvider')
  return context
}
