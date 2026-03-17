import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ClassDetailPage from '@/pages/ClassDetailPage';
import ReportsPage from '@/pages/ReportsPage';
import { motion } from 'framer-motion';
import { LogOut, BarChart3, Home } from 'lucide-react';

type View = 'dashboard' | 'class' | 'reports';

export default function Index() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  if (!user) return <LoginPage />;

  const openClass = (id: string) => {
    setSelectedClassId(id);
    setView('class');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <span className="text-base font-bold text-primary font-display flex items-center gap-2">
            <img src="https://raw.githubusercontent.com/nelton10/atvanisio/refs/heads/main/public/favicon.ico" alt="" className="w-6 h-6 object-contain" />
            Portal Educativo
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
              {user.name} · {user.role === 'gestao' ? 'Gestão' : 'Professor'}
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {view === 'dashboard' && <DashboardPage onOpenClass={openClass} />}
        {view === 'class' && (
          <ClassDetailPage
            classId={selectedClassId}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'reports' && <ReportsPage onBack={() => setView('dashboard')} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/50 pb-safe">
        <div className="max-w-3xl mx-auto flex h-16">
          <button
            onClick={() => setView('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center text-xs font-bold transition-all ${
              view === 'dashboard' || view === 'class'
                ? 'text-primary scale-110'
                : 'text-muted-foreground opacity-70'
            }`}
          >
            <Home size={22} className="mb-1" />
            Turmas
          </button>
          <button
            onClick={() => setView('reports')}
            className={`flex-1 flex flex-col items-center justify-center text-xs font-bold transition-all ${
              view === 'reports'
                ? 'text-primary scale-110'
                : 'text-muted-foreground opacity-70'
            }`}
          >
            <BarChart3 size={22} className="mb-1" />
            Relatórios
          </button>
        </div>
      </nav>
    </div>
  );
}
