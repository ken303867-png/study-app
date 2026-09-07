import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LearningStateBackupControls } from './components/LearningStateBackupControls';
import { PublicDatasetGate } from './components/PublicDatasetGate';
import { PwaControls } from './components/PwaControls';
import { SessionExitGuard } from './components/SessionExitGuard';
import { shouldShowAdminTools } from './utils/adminMode';
import './styles.css';
import './questionPromptFormatting.css';
import './practiceSets.css';
import './clozeSelfAssessment.css';
import './pwa.css';
import './progressiveRendering.css';
import './publicDatasetSync.css';
import './adminMode.css';
import './learningStateBackup.css';

const adminToolsVisible = shouldShowAdminTools(window.location);
document.documentElement.dataset.adminTools = adminToolsVisible ? 'visible' : 'hidden';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublicDatasetGate>
      <SessionExitGuard>
        <PwaControls />
        {!adminToolsVisible && (
          <div className="learner-mode-banner" role="note">
            全3,154問を利用できます。学習履歴はこの端末に保存されます。
          </div>
        )}
        <LearningStateBackupControls />
        <App />
      </SessionExitGuard>
    </PublicDatasetGate>
  </StrictMode>
);
