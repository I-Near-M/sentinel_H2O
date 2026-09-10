import React from 'react';
import { Check, X, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { getPasswordStrength } from '../utils/validators';

export default function PasswordStrengthMeter({ password, showCriteria = true, className = '' }) {
  if (!password && !showCriteria) return null;

  const strength = getPasswordStrength(password);
  const score = strength.score;

  return (
    <div className={`space-y-2 mt-1.5 ${className}`}>
      {/* Barra de progreso de fortaleza (4 segmentos) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-500" />
            <span>Seguridad de contraseña:</span>
          </span>
          <span className={`font-bold ${strength.color}`}>
            {strength.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`rounded-full transition-all duration-300 ${
                score >= step ? strength.bgColor : 'bg-slate-200 dark:bg-slate-700/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lista de criterios */}
      {showCriteria && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 p-2 bg-slate-50 dark:bg-[#061821]/80 rounded-xl border border-slate-200 dark:border-cyan-900/40 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            {strength.criteria.length ? (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            )}
            <span className={strength.criteria.length ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
              Mínimo 8 caracteres
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {strength.criteria.hasUppercase ? (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            )}
            <span className={strength.criteria.hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
              1 Mayúscula (A-Z)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {strength.criteria.hasLowercase ? (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            )}
            <span className={strength.criteria.hasLowercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
              1 Minúscula (a-z)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {strength.criteria.hasNumber ? (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            )}
            <span className={strength.criteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
              1 Número (0-9)
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:col-span-2">
            {strength.criteria.hasSpecial ? (
              <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            )}
            <span className={strength.criteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
              1 Símbolo especial (!@#$%^&*...)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
