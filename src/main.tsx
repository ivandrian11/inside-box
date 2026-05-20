import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'shepherd.js/dist/css/shepherd.css'

// Disable right-click globally (Kiosk/Photo Booth Mode)
document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
