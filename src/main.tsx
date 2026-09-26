import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import { initClientMonitoring } from '@/lib/monitoring';
import { registerSW } from 'virtual:pwa-register';

// Configure future flags for React Router
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

initClientMonitoring();

// Without a reload on update, an already-open tab or installed PWA keeps running
// the bundle it loaded with even after a new version activates in the background.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={router.future}>
      <App />
      <Analytics />
    </BrowserRouter>
  </StrictMode>
);