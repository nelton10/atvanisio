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
  Check, Search, FolderOpen, Smartphone, CalendarDays, X
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { getBimesters, setBimesters } from '@/lib/store';
import { Bimester, Assignment } from '@/types';

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
  const [bimesters, setBimestersList] = useState<Bimester[]>([]);
  const [showBimesterModal, setShowBimesterModal] = useState(false);
  const [activeBimester, setActiveBimester] = useState<Bimester | null>(null);

  const isGestao = user?.role === 'gestao';

  const loadData = async () => {
    const [clsList, assignList, bimesterList] = await Promise.all([
      getClasses(),
      getAssignments(),
      getBimesters()
    ]);
    setClasses(clsList);
    setAssignments(assignList);
    setBimestersList(bimesterList);
    
    // Auto-detect current bimester
    const now = new Date().toISOString().split('T')[0];
    const current = bimesterList.find(b => now >= b.startDate && now <= b.endDate) || bimesterList[0];
    setActiveBimester(current || null);

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

  const handleSaveBimesters = async () => {
    await setBimesters(bimesters);
    setShowBimesterModal(false);
    loadData();
  };

  const updateBimesterDate = (id: number, field: 'startDate' | 'endDate', value: string) => {
    setBimestersList(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
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

  const calculateProgress = (cls: SchoolClass, discipline?: string) => {
    const totalStudents = cls.students.length;
    if (totalStudents === 0) return 0;

    let activities = cls.activities;
    if (discipline) {
      activities = activities.filter(a => a.discipline === discipline);
    }
    
    if (activeBimester) {
      activities = activities.filter(a => {
        const date = a.date.split('T')[0];
        return date >= activeBimester.startDate && date <= activeBimester.endDate;
      });
    }

    const totalActivities = activities.length;
    if (totalActivities === 0) return 0;

    const totalCompleted = activities.reduce((s, a) => s + a.completedIds.length, 0);
    return (totalCompleted / (totalStudents * totalActivities)) * 100;
  };

  const globalAvg = visibleClasses.length > 0
    ? visibleClasses.reduce((sum, cls) => sum + calculateProgress(cls), 0) / visibleClasses.length
    : 0;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-foreground font-display">
            {isGestao ? 'Painel de Gestão' : `Olá, ${user?.name}`}
          </h2>
          {activeBimester && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <CalendarDays size={14} />
              <span className="text-xs font-bold">{activeBimester.name}</span>
            </div>
          )}
        </div>
        {isGestao && visibleClasses.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Progresso Médio do Bimestre</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {globalAvg.toFixed(1).replace('.', ',')}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${globalAvg}%` }}
                className="h-full bg-primary rounded-full transition-all duration-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
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
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowBimesterModal(true)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <CalendarDays size={16} /> Bimestres
        </motion.button>
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
            const progress = calculateProgress(cls);

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
                          <span className="flex items-center gap-1">
                            <BookOpen size={12} /> {cls.activities.length} atividades
                          </span>
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
                    {totalStudents > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-primary rounded-full transition-all duration-500"
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
            const progress = calculateProgress(cls, a.discipline);
            const activitiesCount = cls.activities.filter(act => act.discipline === a.discipline).length;

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
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} /> {activitiesCount} atividades
                      </span>
                    </div>
                  </motion.button>
                </div>
                {totalStudents > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-primary rounded-full transition-all duration-500"
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

      <AnimatePresence>
        {showBimesterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary" /> Configurar Bimestres
                </h3>
                <button onClick={() => setShowBimesterModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {bimesters.map(b => (
                  <div key={b.id} className="p-3 rounded-xl border border-border bg-background space-y-3">
                    <div className="text-sm font-bold text-foreground">{b.name}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Início</label>
                        <input
                          type="date"
                          value={b.startDate}
                          onChange={e => updateBimesterDate(b.id, 'startDate', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-input bg-card text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Término</label>
                        <input
                          type="date"
                          value={b.endDate}
                          onChange={e => updateBimesterDate(b.id, 'endDate', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-input bg-card text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border bg-secondary/30 flex gap-2">
                <button
                  onClick={handleSaveBimesters}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-sm"
                >
                  Confirmar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
