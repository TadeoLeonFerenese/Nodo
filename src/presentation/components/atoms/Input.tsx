import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
  const base = 'w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all duration-200 shadow-xs';
  const border = error
    ? 'border-rose-500 focus:ring-2 focus:ring-rose-200'
    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  return <input className={`${base} ${border} ${className}`} {...props} />;
};
