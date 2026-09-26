import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SharePage } from './pages/SharePage';
import { InstallModalProvider } from './components/InstallEditorModal';

export const App: React.FC = () => {
  return (
    <InstallModalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/share" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </InstallModalProvider>
  );
};

export default App;
