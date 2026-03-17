import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Informe seu nome.'); return; }
    if (password !== 'gestao' && password !== 'prof') {
      setError('Senha inválida. Use "gestao" ou "prof".');
      return;
    }
    login(name.trim(), password as 'gestao' | 'prof', remember);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-sm border border-border mb-6">
            <img 
              src="https://raw.githubusercontent.com/nelton10/atvanisio/refs/heads/main/public/favicon.ico" 
              alt="Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">Portal Educativo</h1>
          <p className="text-base text-muted-foreground mt-2 font-medium">Gestão Escolar Simplificada</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className="w-full h-11 px-3 pr-10 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">Lembrar de mim</span>
          </label>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Entrar
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
