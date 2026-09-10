import React from 'react';

interface MainLayoutProps {
  currentTab: 'home' | 'profile';
  onTabChange: (tab: 'home' | 'profile') => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentTab, onTabChange, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800 pb-16 md:pb-0">
      {/* Top Bar / Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            N
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Nodo Inventory</h1>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
          Local-First Engine
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* 
        Restricción Estricta de UI/UX:
        El menú inferior (bottom navigation) debe tener ÚNICA Y EXCLUSIVAMENTE DOS opciones: "Inicio" y "Perfil".
      */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center z-20 md:hidden shadow-lg">
        {/* Opción 1: Inicio */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
            currentTab === 'home' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 00-1 1m-6 0h6" />
          </svg>
          Inicio
        </button>

        {/* Opción 2: Perfil */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
            currentTab === 'profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Perfil
        </button>
      </nav>
    </div>
  );
};
