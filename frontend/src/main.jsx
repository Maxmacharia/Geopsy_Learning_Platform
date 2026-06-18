import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#FFFFFF',
            color: '#06090F',
            border: '1px solid #BEC9CE',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 6px -1px rgb(6 9 15 / 0.08)',
          },
          success: {
            iconTheme: { primary: '#1A8C5B', secondary: '#E6F6EF' },
          },
          error: {
            iconTheme: { primary: '#C0392B', secondary: '#FDECEA' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
