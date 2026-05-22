import Shepherd from 'shepherd.js'

let currentTour: any = null
export let isTourActive = false
const shownTours = new Set<string>()

const defaultStepOptions: any = {
  classes:
    'shadow-2xl border border-studio-border bg-white text-studio-text rounded-3xl z-[999] overflow-hidden',
  scrollTo: false,
  cancelIcon: {
    enabled: true,
  },
}

/** Stop tour totally and disable further tours */
export const finishTour = () => {
  isTourActive = false
  if (currentTour) {
    const tour = currentTour
    currentTour = null // clear reference before cancelling
    try {
      tour.cancel()
    } catch (_) {}
  }
}

/** Complete a tour segment successfully, leaving isTourActive = true for future steps */
const completeTourSegment = () => {
  if (currentTour) {
    const tour = currentTour
    currentTour = null // clear reference
    try {
      tour.complete() // Shepherd automatically removes overlay and dialog
    } catch (_) {}
  }
}

/** Clean up an orphaned tour segment (if any) before starting a new one */
export const cleanupStraggler = () => {
  if (currentTour) {
    const tour = currentTour
    currentTour = null
    try {
      tour.cancel()
    } catch (_) {}
  }
}

/** Handler for the 'X' button or click outside: turns off the current tour only */
const onCancelHandler = () => {
  if (currentTour) {
    currentTour = null
  }
}

const btnClasses =
  'bg-studio-primary hover:bg-studio-primary/90 text-white px-6 py-2.5 font-bold font-display italic rounded-full mt-4 w-full transition-colors shadow-md shadow-studio-primary/20'

// ─── PAYMENT TOUR ────────────────────────────────────────────────
export const startTourPayment = () => {
  cleanupStraggler()
  isTourActive = true
  shownTours.clear() // Reset all tour memory for a new session
  shownTours.add('payment')

  currentTour = new Shepherd.Tour({
    useModalOverlay: true, // we keep overlay here since it's a fixed popup
    defaultStepOptions,
  })

  currentTour.addStep({
    id: 'payment-start',
    title: 'Mulai Sesi',
    text: 'Klik tombol Mulai Sesi untuk mulai masuk ke Pemilihan Templat.',
    attachTo: { element: '#tour-start-session', on: 'top' },
    buttons: [
      {
        text: 'Mengerti',
        action: completeTourSegment,
        classes: btnClasses,
      },
    ],
  })

  currentTour.on('cancel', onCancelHandler)
  currentTour.start()
}

// ─── SELECTION TOUR ──────────────────────────────────────────────
export const startTourSelection = (force = false) => {
  if (!force) return
  cleanupStraggler()
  isTourActive = true
  shownTours.add('selection')

  currentTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions,
  })

  currentTour.addStep({
    id: 'selection-cards',
    title: 'Pilih Layout',
    text: 'Tinggal swipe ke kiri/kanan buat lihat-lihat, lalu tap layout frame (kayak 3 foto atau 4 foto) yang paling pas di hati! 💖',
    attachTo: { element: '#tour-template-card', on: 'top' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'selection-scroll',
    title: 'Geser Halaman',
    text: 'Psst.. kamu juga bisa tap panah ini atau geser layar buat ngintip koleksi frame kece lainnya lho! 🚀',
    attachTo: { element: '#tour-scroll-right', on: 'left' },
    buttons: [
      {
        text: 'Paham',
        action: completeTourSegment, // This finishes this segment only
        classes: btnClasses,
      },
    ],
  })

  currentTour.on('cancel', onCancelHandler)
  currentTour?.start()
}

// ─── CAMERA TOUR ─────────────────────────────────────────────────
export const startTourCamera = (onEnd?: () => void, force = false) => {
  if (!force) {
    if (onEnd) onEnd()
    return
  }
  cleanupStraggler()
  isTourActive = true
  shownTours.add('camera')

  currentTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions,
  })



  currentTour.addStep({
    id: 'camera-timer',
    title: 'Durasi Sesi',
    text: 'Perhatiin sisa waktu kamu di sini yaa ⏱️. Tenang aja, waktunya cuma berjalan selama kamu ada di halaman Capture ini kok! Santai tapi pasti! 📸',
    attachTo: { element: '#tour-camera-timer', on: 'bottom' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'camera-slots',
    title: 'Slot Foto',
    text: 'Kalo ngerasa kurang pas sama posenya, kamu tinggal tap aja salah satu slot foto di pojok bawah ini buat jepret ulang (retake). Oiya, tenang aja, retake tetep bisa dilakuin walau semua slot foto udah kepake, asalkan waktunya masih sisa ya! 🎬✨',
    attachTo: { element: '#tour-camera-slots', on: 'right' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'camera-capture',
    title: 'Ambil Foto',
    text: 'Tap tombol ini buat mulai hitung mundur (countdown) jepretan kamu 🤩!',
    attachTo: { element: '#tour-camera-capture', on: 'top' },
    buttons: [
      {
        text: 'Mengerti',
        action: () => {
          completeTourSegment()
          if (onEnd) onEnd()
        },
        classes: btnClasses,
      },
    ],
  })

  currentTour.on('cancel', () => {
    onCancelHandler()
    if (onEnd) onEnd()
  })
  currentTour?.start()
}

// ─── REVIEW TOUR ─────────────────────────────────────────────────
export const startTourReview = (force = false) => {
  if (!force) return
  cleanupStraggler()
  isTourActive = true
  shownTours.add('review')

  currentTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions,
  })

  currentTour.addStep({
    id: 'review-arrange',
    title: 'Urutkan Foto',
    text: 'Sekarang waktunya ngurutin hasil jepretan! Tap fotonya sesuai urutan ya buat milih letak foto. Tapi inget nih, kalau kamu nggak nge-tap, urutannya otomatis ngikutin urutan pas kamu ngefoto tadi ya!',
    attachTo: { element: '#tour-review-grid', on: 'bottom' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'review-template',
    title: 'Preview Urutan',
    text: 'Cek urutannya di mini layout ini ya! Hasil tap kamu otomatis nyocokin sama nomor slot yang ada di sini. 🖼️',
    attachTo: { element: '#tour-review-template', on: 'left' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.on('cancel', onCancelHandler)
  currentTour?.start()
}

// ─── ARRANGE TOUR ─────────────────────────────────────────────────
export const startTourArrange = (onEnd?: () => void, force = false) => {
  if (!force) {
    if (onEnd) onEnd()
    return
  }
  cleanupStraggler()
  isTourActive = true
  shownTours.add('arrange')

  currentTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions,
  })

  currentTour.addStep({
    id: 'arrange-drag',
    title: 'Geser & Zoom Foto',
    text: 'Bebas berekspresi! Kamu bisa geser (drag) foto di dalam masing-masing slot untuk menyesuaikan posisinya. Gunakan scroll mouse atau cubit (pinch) layar untuk zoom in/out agar posisinya pas! 🔍👌',
    attachTo: { element: '#tour-arrange-drag', on: 'right' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'arrange-filters',
    title: 'Pilih Filter Foto',
    text: 'Ingin warna foto lebih estetik? Pilih salah satu filter instan di menu samping ini (klik "More Filters" untuk pilihan lebih lengkap)! ✨🎨',
    attachTo: { element: '#tour-arrange-filters', on: 'left' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'arrange-submit',
    title: 'Selesai & Cetak',
    text: 'Jika posisi foto dan filternya sudah pas, klik tombol "SELESAI & CETAK" ini untuk memproses dan mencetak hasil fotomu! 🖨️✨',
    attachTo: { element: '#tour-arrange-submit', on: 'top' },
    buttons: [
      {
        text: 'Mengerti',
        action: () => {
          completeTourSegment()
          if (onEnd) onEnd()
        },
        classes: btnClasses,
      },
    ],
  })

  currentTour.on('cancel', () => {
    onCancelHandler()
    if (onEnd) onEnd()
  })
  currentTour?.start()
}

// ─── DONE TOUR (FINAL STEP) ───────────────────────────────────────
export const startTourDone = (onEnd?: () => void, force = false) => {
  if (!force) {
    if (onEnd) onEnd()
    return
  }
  cleanupStraggler()
  isTourActive = true
  shownTours.add('done')

  currentTour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      ...defaultStepOptions,
      scrollTo: false,
    },
  })

  currentTour.addStep({
    id: 'done-image',
    title: 'Proses Cetak',
    text: 'Ini dia karya kamu! Proses cetak foto fisik akan otomatis berjalan. Santai aja ditunggu sampai kertasnya tercetak secara utuh. Jangan ditarik ketika cetakan belum selesai seluruhnya ya supaya hasilnya rapi dan maksimal! 🖨️📸',
    attachTo: { element: '#tour-done-image', on: 'left' },
    buttons: [
      {
        text: 'Lanjut',
        action: () => currentTour?.next(),
        classes: btnClasses,
      },
    ],
  })

  currentTour.addStep({
    id: 'done-qr',
    title: 'Download Foto Digital',
    text: 'Nah buat file digitalnya, langsung aja scan QR ini! Nanti dapet deh jepretan final masing-masing slot beserta template jadinya. Oiya, kalau webnya scan tadi masih kebuka di HP, kamu cukup ganti aja ke menu Galeri! 📲✨',
    attachTo: { element: '#tour-done-qr', on: 'right' },
    buttons: [
      {
        text: 'Selesai',
        action: () => {
          finishTour()
          if (onEnd) onEnd()
        },
        classes: btnClasses,
      },
    ],
  })

  currentTour.on('cancel', () => {
    onCancelHandler()
    if (onEnd) onEnd()
  })
  currentTour?.start()
}
