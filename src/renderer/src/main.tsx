import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initApiClient } from './services/apiClient'

// Initialize API client before rendering
initApiClient().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
