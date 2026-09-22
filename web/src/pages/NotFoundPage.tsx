import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { NotFoundView } from '../components/StatusViews';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main" id="main-content">
        <NotFoundView message="The requested page could not be found. Please verify the URL." />
      </main>
      <Footer />
    </div>
  );
};
