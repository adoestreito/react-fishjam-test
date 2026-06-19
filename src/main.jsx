


import React from 'react'
// 1. Change this line to import 'createRoot' directly
import { createRoot } from 'react-dom/client' 
import App from './App.jsx'
import './index.css'
import { FishjamProvider } from '@fishjam-cloud/react-client' // Make sure this matches your package name

// Fetch the ID from the environment
const FISHJAM_ID = import.meta.env.VITE_FISHJAM_ID;

// 2. Change 'ReactDOM.createRoot' to just 'createRoot'
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FishjamProvider fishjamId={FISHJAM_ID}>
      <App />
    </FishjamProvider>
  </React.StrictMode>,
)