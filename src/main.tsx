import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 1. Importe a função de inicialização dos Insights da Vercel
import { injectSpeedInsights } from '@vercel/speed-insights';

// 2. Execute a função para ativar o monitoramento no carregamento do site
injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)