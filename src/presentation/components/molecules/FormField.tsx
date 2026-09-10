import React from 'react';
import { Input } from '../atoms/Input';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, errorMessage, ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full text-left">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
      <Input error={!!errorMessage} {...props} />
      {errorMessage && (
        <span className="text-xs font-medium text-rose-500 mt-1">{errorMessage}</span>
      )}
    </div>
  );
};
