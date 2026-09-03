import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PwaControls } from './components/PwaControls';
import './styles.css';
import './practiceSets.css';
import './clozeSelfAssessment.css';
import './pwa.css';
import './progressiveRendering.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaControls />
    <App />
  </StrictMode>
);
