import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { getPasswordStrength } from '../lib/crypto';
import { cn } from '../lib/utils';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ value, onChange, placeholder = "Enter password" }) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(value);

  const getStrengthColor = () => {
    if (strength <= 25) return "bg-red-500";
    if (strength <= 50) return "bg-orange-500";
    if (strength <= 75) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getStrengthIcon = () => {
    if (strength <= 25) return <ShieldAlert className="w-4 h-4 text-red-500" />;
    if (strength <= 50) return <Shield className="w-4 h-4 text-orange-500" />;
    if (strength <= 75) return <Shield className="w-4 h-4 text-yellow-500" />;
    return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
  };

  const requirements = [
    { label: "8+ characters", met: value.length >= 8 },
    { label: "Uppercase & Lowercase", met: /[A-Z]/.test(value) && /[a-z]/.test(value) },
    { label: "Number", met: /[0-9]/.test(value) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(value) },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="relative flex items-center group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none flex items-center justify-center">
          <Lock className="w-4 h-4 drop-shadow-sm" />
        </div>
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full glass-card border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-10 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-500 hover:text-cyan-400 transition-colors flex items-center justify-center p-1"
        >
          {showPassword ? <EyeOff className="w-4 h-4 drop-shadow-sm" /> : <Eye className="w-4 h-4 drop-shadow-sm" />}
        </button>
      </div>
      
      {value && (
        <div className="px-1 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold">
              <span className="text-white/40">Security Strength</span>
              <div className="flex items-center gap-1">
                {getStrengthIcon()}
                <span className={cn(
                  strength <= 30 ? "text-red-500" : 
                  strength <= 60 ? "text-orange-500" : 
                  strength <= 85 ? "text-yellow-500" : "text-emerald-500"
                )}>
                  {strength <= 30 ? "Weak" : strength <= 60 ? "Fair" : strength <= 85 ? "Good" : "Strong"}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", getStrengthColor())}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  req.met ? "bg-emerald-500" : "bg-white/10"
                )} />
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  req.met ? "text-white/80" : "text-white/20"
                )}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
