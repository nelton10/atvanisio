import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolClass, ProfessorAssignments } from '@/types';
import {
  getClasses, addClass, deleteClass, updateClass, exportBackup, importBackup,
  getAssignments, setProfessorClasses
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Download, Upload, Users, BookOpen,
  Check, Search, FolderOpen, Smartphone
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  onOpenClass: (id: string, discipline: string) => void;
}

export default function DashboardPage({ onOpenClass }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [assignments, setAssignments] = useState<ProfessorAssignments>({});
  const [newClassName, setNewClassName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState<Assignment[]>([]);
  const [newDiscipline, setNewDiscipline] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const isGestao = user?.role === 'gestao';

  const loadData = async () => {
    const [clsList, assignList] = await Promise.all([
      getClasses(),
      getAssignments()
    ]);
    setClasses(clsList);
    setAssignments(assignList);
    
    if (user?.role === 'prof') {
      const myAssignments = assignList[user.name] || [];
      setSelectedAssignments(myAssignments);
      if (myAssignments.length === 0) {
        setSetupMode(true);
      }
    }
  };

  useEffect(() => {
    loadData();

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [user]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const visibleClasses = isGestao
    ? classes
    : classes.filter(c => (assignments[user!.name] || []).some(a => a.classId === c.id));

  const filteredClasses = visibleClasses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newClassName.trim()) return;
    await addClass(newClassName.trim());
    setNewClassName('');
    loadData();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await updateClass(id, { name: editName.trim() });
    setEditingId(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteClass(deleteTarget);
      setDeleteTarget(null);
      loadData();
    }
  };

  const handleExport = async () => {
    const backupContent = await exportBackup();
    const blob = new Blob([backupContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            await importBackup(reader.result as string);
            alert('Dados importados com sucesso!');
            window.location.reload();
          } catch (err: any) {
            alert(err.message || 'Erro ao processar o arquivo.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSetupSave = async () => {
    if (user) {
      await setProfessorClasses(user.name, selectedAssignments);
      setSetupMode(false);
      loadData();
    }
  };

  const addAssignment = (classId: string) => {
    if (!newDiscipline.trim()) {
      alert('Informe a disciplina.');
      return;
    }
    const exists = selectedAssignments.some(a => a.classId === classId && a.discipline === newDiscipline.trim());
    if (exists) {
      alert('Esta disciplina já foi adicionada para esta turma.');
      return;
    }
    setSelectedAssignments(prev => [...prev, { classId, discipline: newDiscipline.trim() }]);
  };

  const removeAssignment = (classId: string, discipline: string) => {
    setSelectedAssignments(prev => prev.filter(a => !(a.classId === classId && a.discipline === discipline)));
  };

  // Professor setup mode
  if (setupMode) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground font-display mb-2">Configuração das Turmas</h2>
        <p className="text-sm text-muted-foreground mb-6">Adicione as turmas e disciplinas que você leciona:</p>
        
        <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 ml-1">1. Qual a disciplina?</label>
            <input 
              type="text" 
              placeholder="Ex: Matemática, Português..." 
              value={newDiscipline}
              onChange={e => setNewDiscipline(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-input bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5 ml-1">2. Clique para adicionar às turmas:</label>
            <div className="grid grid-cols-2 gap-2">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => addAssignment(c.id)}
                  className="h-10 px-3 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary/5 transition-colors text-left truncate"
                >
                  + {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 ml-1">Minhas Turmas Atuais:</label>
          {selectedAssignments.map((a, i) => {
            const cls = classes.find(c => c.id === a.classId);
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div>
                  <div className="text-sm font-bold text-foreground">{cls?.name}</div>
                  <div className="text-xs text-primary font-medium">{a.discipline}</div>
                </div>
                <button 
                  onClick={() => removeAssignment(a.classId, a.discipline)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          {selectedAssignments.length === 0 && (
            <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground font-medium">Nenhuma turma adicionada ainda.</p>
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSetupSave}
          disabled={selectedAssignments.length === 0}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-opacity"
        >
          Salvar Configurações
        </motion.button>
      </div>
    );
  }

  const globalAvg = visibleClasses.length > 0
    ? visibleClasses.reduce((sum, cls) => {
        if (cls.students.length === 0 || cls.activities.length === 0) return sum;
        const totalPossible = cls.students.length * cls.activities.length;
        const totalCompleted = cls.activities.reduce((s, a) => s + a.completedIds.length, 0);
        return sum + (totalCompleted / totalPossible) * 100;
      }, 0) / visibleClasses.filter(c => c.students.length > 0 && c.activities.length > 0).length || 0
    : 0;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground font-display">
          {isGestao ? 'Painel de Gestão' : `Olá, ${user?.name}`}
        </h2>
        {isGestao && visibleClasses.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Média Global de Conclusão</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {globalAvg.toFixed(1).replace('.', ',')}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${globalAvg}%` }}
                className="h-full bg-primary rounded-full"
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions for gestao */}
      <div className="flex flex-wrap gap-2 mb-4">
        {showInstallBtn && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-sm"
          >
            <Smartphone size={16} /> Instalar Aplicativo
          </motion.button>
        )}
        {isGestao && (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleExport}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Download size={16} /> Backup
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleImport}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Upload size={16} /> Importar
            </motion.button>
          </>
        )}
      </div>

      {/* Add class */}
      {isGestao && (
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nome da nova turma..."
            className="flex-1 h-12 px-4 rounded-xl border border-input bg-card text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            className="h-12 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={20} /> Criar Turma
          </motion.button>
        </div>
      )}

      {/* Search */}
      {visibleClasses.length > 3 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar turma..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Class list */}
      <div className="space-y-2">
        <AnimatePresence>
          {isGestao ? filteredClasses.map(cls => {
            const totalStudents = cls.students.length;
            const totalActivities = cls.activities.length;
            const progress = totalStudents > 0 && totalActivities > 0
              ? (cls.activities.reduce((s, a) => s + a.completedIds.length, 0) / (totalStudents * totalActivities)) * 100
              : 0;

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-card rounded-xl border border-border p-4 shadow-sm"
              >
                {editingId === cls.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(cls.id)}
                      className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm"
                      autoFocus
                    />
                    <button onClick={() => handleRename(cls.id)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                      Salvar
                    </button>
                    <button onClick={() => setEditingId(null)} className="h-9 px-3 rounded-lg bg-secondary text-secondary-foreground text-sm">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onOpenClass(cls.id, '')}
                        className="text-left flex-1"
                      >
                        <h3 className="text-base font-bold text-foreground font-display">{cls.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users size={12} /> {totalStudents} alunos</span>
                          <span className="flex items-center gap-1"><BookOpen size={12} /> {totalActivities} atividades</span>
                        </div>
                      </motion.button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(cls.id); setEditName(cls.name); }}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cls.id)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {totalStudents > 0 && totalActivities > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground tabular-nums">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          }) : (assignments[user!.name] || []).map((a, idx) => {
            const cls = classes.find(c => c.id === a.classId);
            if (!cls) return null;
            
            const totalStudents = cls.students.length;
            const activities = cls.activities.filter(act => act.discipline === a.discipline);
            const totalActivities = activities.length;
            const progress = totalStudents > 0 && totalActivities > 0
              ? (activities.reduce((s, act) => s + act.completedIds.length, 0) / (totalStudents * totalActivities)) * 100
              : 0;

            return (
              <motion.div
                key={`${a.classId}-${a.discipline}-${idx}`}
                className="bg-card rounded-xl border border-border p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onOpenClass(a.classId, a.discipline)}
                    className="text-left flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground font-display">{cls.name}</h3>
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                        {a.discipline}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={12} /> {totalStudents} alunos</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {totalActivities} atividades</span>
                    </div>
                  </motion.button>
                </div>
                {totalStudents > 0 && totalActivities > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredClasses.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhuma turma encontrada.' : 'Nenhuma turma cadastrada.'}
            </p>
          </div>
        )}
      </div>

      {/* Professor reconfigure */}
      {!isGestao && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setSetupMode(true)}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Alterar minhas turmas
          </button>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir Turma"
        message="Tem certeza que deseja excluir esta turma? Todos os dados serão perdidos."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
