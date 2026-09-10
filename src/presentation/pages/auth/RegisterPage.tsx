import React, { useState } from 'react';
import { FormField } from '../../components/molecules/FormField';
import { Button } from '../../components/atoms/Button';
import { useAuthStore } from '../../../application/stores/useAuthStore';

interface RegisterPageProps {
  onSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSuccess }) => {
  /* 
    Restricción Estricta de UI/UX:
    El formulario debe contener estricta y únicamente cuatro campos:
    1. usuario (username)
    2. email (email)
    3. contraseña (password)
    4. confirmación de contraseña (passwordConfirmation)
    NO agregar campos adicionales.
  */
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const { register, isLoading } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await register(formData);
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Registro de Usuario</h2>
          <p className="text-xs text-slate-500 mt-1">Crea tu cuenta local de Nodo MVP</p>
        </div>

        {formError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3 font-medium text-left">
            {formError}
          </div>
        )}

        {/* Formulario Estricto de Exactamente 4 Campos */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Campo 1: Usuario */}
          <FormField
            label="Usuario"
            name="username"
            type="text"
            placeholder="Ej. tadeoleon"
            value={formData.username}
            onChange={handleChange}
            required
          />

          {/* Campo 2: Email */}
          <FormField
            label="Email"
            name="email"
            type="email"
            placeholder="ejemplo@nodo.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* Campo 3: Contraseña */}
          <FormField
            label="Contraseña"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {/* Campo 4: Confirmación de Contraseña */}
          <FormField
            label="Confirmación de Contraseña"
            name="passwordConfirmation"
            type="password"
            placeholder="••••••••"
            value={formData.passwordConfirmation}
            onChange={handleChange}
            required
          />

          <Button type="submit" disabled={isLoading} className="w-full mt-2">
            {isLoading ? 'Registrando...' : 'Crear Cuenta'}
          </Button>
        </form>
      </div>
    </div>
  );
};
