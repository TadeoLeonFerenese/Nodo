import React, { useState } from 'react';
import { FormField } from '../../components/molecules/FormField';
import { Button } from '../../components/atoms/Button';
import { useAuthStore } from '../../../application/stores/useAuthStore';

interface RegisterPageProps {
  onSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  /* 
    Restricción Estricta de UI/UX (AGENTS.md):
    El formulario de registro debe contener estricta y únicamente cuatro campos:
    1. usuario (username)
    2. email (email)
    3. contraseña (password)
    4. confirmación de contraseña (passwordConfirmation)
    NO agregar campos adicionales al registro.
  */
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });

  const [loginData, setLoginData] = useState({
    usernameOrEmail: '',
    password: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { register, login, isLoading } = useAuthStore();

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await register(registerData);
      onSuccess();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await login(loginData.usernameOrEmail, loginData.password);
      onSuccess();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-md w-full shadow-sm flex flex-col gap-6 text-center">
        <div>
          <div className="w-12 h-12 rounded-xl bg-indigo-600 mx-auto flex items-center justify-center text-white font-bold text-xl shadow-sm mb-3">
            N
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {mode === 'login' ? 'Iniciar Sesión' : 'Registro de Usuario'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login' ? 'Ingresa a tu cuenta local de Nodo' : 'Crea tu cuenta local de Nodo MVP'}
          </p>
        </div>

        {/* Selector de modo simétrico */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setFormError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setFormError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registrarse
          </button>
        </div>

        {formError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3 font-medium text-left">
            {formError}
          </div>
        )}

        {mode === 'login' ? (
          /* Formulario de Login */
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <FormField
              label="Usuario o Email"
              name="usernameOrEmail"
              type="text"
              placeholder="tu_usuario o tu@email.com"
              value={loginData.usernameOrEmail}
              onChange={handleLoginChange}
              required
            />

            <FormField
              label="Contraseña"
              name="password"
              type="password"
              placeholder="••••••••"
              value={loginData.password}
              onChange={handleLoginChange}
              required
            />

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? 'Iniciando sesión...' : 'Ingresar a Nodo'}
            </Button>
          </form>
        ) : (
          /* Formulario Estricto de Exactamente 4 Campos (AGENTS.md) */
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            {/* Campo 1: Usuario */}
            <FormField
              label="Usuario"
              name="username"
              type="text"
              placeholder="UsuarioEjemplo"
              value={registerData.username}
              onChange={handleRegisterChange}
              required
            />

            {/* Campo 2: Email */}
            <FormField
              label="Email"
              name="email"
              type="email"
              placeholder="ejemplo@nodo.com"
              value={registerData.email}
              onChange={handleRegisterChange}
              required
            />

            {/* Campo 3: Contraseña */}
            <FormField
              label="Contraseña"
              name="password"
              type="password"
              placeholder="••••••••"
              value={registerData.password}
              onChange={handleRegisterChange}
              required
            />

            {/* Campo 4: Confirmación de Contraseña */}
            <FormField
              label="Confirmación de Contraseña"
              name="passwordConfirmation"
              type="password"
              placeholder="••••••••"
              value={registerData.passwordConfirmation}
              onChange={handleRegisterChange}
              required
            />

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>
        )}

        <div className="text-xs text-slate-500">
          {mode === 'login' ? (
            <p>
              ¿No tienes una cuenta todavía?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError(null);
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Regístrate aquí
              </button>
            </p>
          ) : (
            <p>
              ¿Ya tienes una cuenta creada?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Inicia sesión aquí
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
