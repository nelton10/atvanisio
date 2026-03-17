import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolClass } from '@/types';
import {
  getClasses, addClass, deleteClass, updateClass, exportBackup, importBackup,
  getAssignments, setProfessorClasses
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit3, Download, Upload, Users, BookOpen,
  Check, Search, FolderOpen
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  onOpenClass: (id: string) => void;
}

export default function DashboardPage({ onOpenClass }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const isGestao = user?.role === 'gestao';
  const assignments = getAssignments();

  useEffect(() => {
    setClasses(getClasses());
  }, []);

  useEffect(() => {
    if (user?.role === 'prof') {
      const myClasses = assignments[user.name];
      if (!myClasses || myClasses.length === 0) {
        setSetupMode(true);
      }
    }
  }, [user, assignments]);

  const visibleClasses = isGestao
    ? classes
    : classes.filter(c => (assignments[user!.name] || []).includes(c.id));

  const filteredClasses = visibleClasses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newClassName.trim()) return;
    addClass(newClassName.trim());
    setNewClassName('');
    setClasses(getClasses());
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    updateClass(id, { name: editName.trim() });
    setEditingId(null);
    setClasses(getClasses());
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteClass(deleteTarget);
      setDeleteTarget(null);
      setClasses(getClasses());
    }
  };

  const handleExport = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
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
        reader.onload = () => {
          try {
            importBackup(reader.result as string);
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

  const handleSetupSave = () => {
    if (user) {
      setProfessorClasses(user.name, selectedClassIds);
      setSetupMode(false);
    }
  };

  const toggleClassSelection = (id: string) => {
    setSelectedClassIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Professor setup mode
  if (setupMode) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground font-display mb-2">Configuração Inicial</h2>
        <p className="text-sm text-muted-foreground mb-6">Selecione as turmas que você leciona:</p>
        <div className="space-y-2 mb-6">
          {classes.map(c => (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleClassSelection(c.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                selectedClassIds.includes(c.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              <span className="font-medium text-foreground">{c.name}</span>
              {selectedClassIds.includes(c.id) && (
                <Check size={20} className="text-primary" />
              )}
            </motion.button>
          ))}
          {classes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma turma cadastrada. Peça à gestão para criar turmas.
            </p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSetupSave}
          disabled={selectedClassIds.length === 0}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 transition-opacity"
        >
          Confirmar Seleção
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
        <h2 className="text-xl font-bold text-foreground font-display">
          {isGestao ? 'Painel de Gestão' : `Olá, ${user?.name}`}
        </h2>
        {isGestao && visibleClasses.length > 0 && (
          <div className="mt-3 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Média Global de Conclusão</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {globalAvg.toFixed(1).replace('.', ',')}%
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
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
      {isGestao && (
        <div className="flex flex-wrap gap-2 mb-4">
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
        </div>
      )}

      {/* Add class */}
      {isGestao && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nome da nova turma..."
            className="flex-1 h-11 px-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus size={18} /> Criar
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
          {filteredClasses.map(cls => {
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
                        onClick={() => onOpenClass(cls.id)}
                        className="text-left flex-1"
                      >
                        <h3 className="text-base font-bold text-foreground font-display">{cls.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users size={12} /> {totalStudents} alunos</span>
                          <span className="flex items-center gap-1"><BookOpen size={12} /> {totalActivities} atividades</span>
                        </div>
                      </motion.button>
                      {isGestao && (
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
                      )}
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
