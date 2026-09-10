import { useState, useEffect } from 'react';
import { useAuthStore } from './application/stores/useAuthStore';
import { RegisterPage } from './presentation/pages/auth/RegisterPage';
import { HomePage } from './presentation/pages/home/HomePage';
import { ProfilePage } from './presentation/pages/profile/ProfilePage';
import { MainLayout } from './presentation/layouts/MainLayout';

export function App() {
  const { isAuthenticated, checkCurrentUser } = useAuthStore();
  const [currentTab, setCurrentTab] = useState<'home' | 'profile'>('home');

  useEffect(() => {
    checkCurrentUser();
  }, [checkCurrentUser]);

  if (!isAuthenticated) {
    return <RegisterPage onSuccess={() => setCurrentTab('home')} />;
  }

  return (
    <MainLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'home' && <HomePage />}
      {currentTab === 'profile' && <ProfilePage />}
    </MainLayout>
  );
}

export default App;
