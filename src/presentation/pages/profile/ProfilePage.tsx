import React from 'react';
import { useAuthStore } from '../../../application/stores/useAuthStore';
import { Button } from '../../components/atoms/Button';
import { Badge } from '../../components/atoms/Badge';
import { WifiSyncCard } from '../../components/molecules/WifiSyncCard';

export const ProfilePage: React.FC = () => {
  const { currentUser, logout } = useAuthStore();

  return (
    <div className="max-w-md mx-auto w-full flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xl uppercase">
            {currentUser?.username?.[0] || 'U'}
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900">{currentUser?.username || 'Usuario Nodo'}</h2>
            <span className="text-xs text-slate-500">{currentUser?.email || 'email@nodo.com'}</span>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 font-semibold">Estado de la Base Local:</span>
            <Badge variant="success">SQLite Activo</Badge>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 font-semibold">Motor de Sincronización:</span>
            <Badge variant="info">Wi-Fi Direct Local Engine</Badge>
          </div>
        </div>

        <Button variant="danger" onClick={logout} className="mt-2 w-full">
          Cerrar Sesión Local
        </Button>
      </div>

      {/* Sincronización Local Wi-Fi */}
      <WifiSyncCard />
    </div>
  );
};
