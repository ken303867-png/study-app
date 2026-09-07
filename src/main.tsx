import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PublicDatasetGate } from './components/PublicDatasetGate';
import { PwaControls } from './components/PwaControls';
import { shouldShowAdminTools } from './utils/adminMode';
import './styles.css';
import './questionPromptFormatting.css';
import './practiceSets.css';
import './clozeSelfAssessment.css';
import './pwa.css';
import './progressiveRendering.css';
import './publicDatasetSync.css';
import './adminMode.css';

document.documentElement.dataset.adminTools = shouldShowAdminTools(window.location)
  ? 'visible'
  : 'hidden';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicDatasetGate>
      <PwaControls />
      <App />
    </PublicDatasetGate>
  </StrictMode>
);
