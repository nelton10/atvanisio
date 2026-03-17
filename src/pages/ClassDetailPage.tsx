import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolClass, Activity, Student } from '@/types';
import {
  getClassById, getClasses, addStudent, removeStudent,
  addActivity, updateActivity, deleteActivity,
  toggleStudentCompletion, markAllComplete, clearAllCompletion,
  updateClass
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Trash2, Edit3, Check, Search,
  Camera, X, CheckCheck, XCircle, UserPlus, Image
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  classId: string;
  onBack: () => void;
}

export default function ClassDetailPage({ classId, onBack }: Props) {
  const { user } = useAuth();
  const [cls, setCls] = useState<SchoolClass | null>(null);
  const [tab, setTab] = useState<'students' | 'activities'>('activities');
  const [newStudentName, setNewStudentName] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingActivityTitle, setEditingActivityTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'student' | 'activity'; id: string } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const c = await getClassById(classId);
    setCls(c || null);
    if (selectedActivity && c) {
      const updated = c.activities.find(a => a.id === selectedActivity.id);
      if (updated) setSelectedActivity(updated);
      else setSelectedActivity(null);
    }
  };

  useEffect(() => { reload(); }, [classId]);

  if (!cls) return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;
    await addStudent(classId, newStudentName.trim());
    setNewStudentName('');
    reload();
  };

  const handleDeleteStudent = async () => {
    if (deleteTarget?.type === 'student') {
      await removeStudent(classId, deleteTarget.id);
      setDeleteTarget(null);
      reload();
    }
  };

  const handleAddActivity = async () => {
    if (!newActivityTitle.trim() || !user) return;
    await addActivity(classId, newActivityTitle.trim(), user.name);
    setNewActivityTitle('');
    reload();
  };

  const handleAddActivityWithDate = async () => {
    if (!user) return;
    const dateTitle = new Date().toLocaleDateString('pt-BR');
    await addActivity(classId, dateTitle, user.name);
    setNewActivityTitle('');
    reload();
  };

  const handleDeleteActivity = async () => {
    if (deleteTarget?.type === 'activity') {
      await deleteActivity(classId, deleteTarget.id);
      setDeleteTarget(null);
      setSelectedActivity(null);
      reload();
    }
  };

  const handleToggle = async (studentId: string) => {
    if (!selectedActivity) return;
    await toggleStudentCompletion(classId, selectedActivity.id, studentId);
    reload();
  };

  const handleMarkAll = async () => {
    if (!selectedActivity) return;
    await markAllComplete(classId, selectedActivity.id);
    reload();
  };

  const handleClearAll = async () => {
    if (!selectedActivity) return;
    await clearAllCompletion(classId, selectedActivity.id);
    reload();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedActivity) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await updateActivity(classId, selectedActivity.id, { image: reader.result as string });
      reload();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    if (!selectedActivity) return;
    await updateActivity(classId, selectedActivity.id, { image: undefined });
    reload();
  };

  const handleSaveTitle = async () => {
    if (!selectedActivity || !editingActivityTitle.trim()) return;
    await updateActivity(classId, selectedActivity.id, { title: editingActivityTitle.trim() });
    setIsEditingTitle(false);
    reload();
  };

  const filteredStudents = cls.students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const completedCount = selectedActivity
    ? selectedActivity.completedIds.length
    : 0;
  const totalStudents = cls.students.length;
  const progress = totalStudents > 0 && selectedActivity
    ? (completedCount / totalStudents) * 100
    : 0;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-card border border-border text-foreground"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <h2 className="text-xl font-bold text-foreground font-display">{cls.name}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-1">
        {(['activities', 'students'] as const)
          .filter(t => t !== 'students' || user?.role === 'gestao')
          .map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedActivity(null); }}
              className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t === 'activities' ? 'Atividades' : 'Alunos'}
            </button>
          ))}
      </div>

      {/* Students Tab */}
      {tab === 'students' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newStudentName}
              onChange={e => setNewStudentName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
              placeholder="Nome do aluno..."
              className="flex-1 h-11 px-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddStudent}
              className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5"
            >
              <UserPlus size={16} />
            </motion.button>
          </div>

          {cls.students.length > 5 && (
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Buscar aluno..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1">
            {filteredStudents.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
              >
                <span className="text-sm font-medium text-foreground">{i + 1}. {s.name}</span>
                <button
                  onClick={() => setDeleteTarget({ type: 'student', id: s.id })}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
            {cls.students.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum aluno cadastrado.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Activities Tab */}
      {tab === 'activities' && !selectedActivity && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newActivityTitle}
              onChange={e => setNewActivityTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddActivity()}
              placeholder="Título da atividade..."
              className="flex-1 h-11 px-3 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddActivity}
              className="h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5"
            >
              <Plus size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddActivityWithDate}
              className="h-11 px-4 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={18} /> Nova Atividade
            </motion.button>
          </div>

          <div className="space-y-2">
            {cls.activities.map(act => {
              const actProgress = totalStudents > 0
                ? (act.completedIds.length / totalStudents) * 100
                : 0;
              return (
                <motion.div
                  key={act.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedActivity(act)}
                  className="p-4 bg-card rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{act.title}</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                        {new Date(act.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {act.image && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-border">
                          <img src={act.image} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'activity', id: act.id }); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${actProgress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">
                      {actProgress.toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
            {cls.activities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade registrada. Comece uma nova para acompanhar o progresso.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Activity detail - student checklist */}
      {tab === 'activities' && selectedActivity && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedActivity(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-foreground"
            >
              <ArrowLeft size={16} />
            </button>
            {isEditingTitle ? (
              <div className="flex-1 flex gap-2">
                <input
                  value={editingActivityTitle}
                  onChange={e => setEditingActivityTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                  className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm"
                  autoFocus
                />
                <button onClick={handleSaveTitle} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  Salvar
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground font-display">{selectedActivity.title}</h3>
                <button
                  onClick={() => { setIsEditingTitle(true); setEditingActivityTitle(selectedActivity.title); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="p-4 rounded-xl bg-card border border-border mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progresso</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {completedCount}/{totalStudents}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary rounded-full"
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Image */}
          <div className="mb-4">
            {selectedActivity.image ? (
              <div className="relative">
                <img
                  src={selectedActivity.image}
                  alt="Evidência"
                  className="w-full max-h-48 object-cover rounded-xl ring-1 ring-border cursor-pointer"
                  onClick={() => setLightboxImage(selectedActivity.image!)}
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center text-destructive"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/40 transition-colors"
              >
                <Camera size={18} /> Anexar foto da atividade
              </motion.button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Bulk actions */}
          <div className="flex gap-2 mb-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleMarkAll}
              className="flex-1 h-9 rounded-lg bg-success/10 text-success text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <CheckCheck size={16} /> Marcar Todos
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleClearAll}
              className="flex-1 h-9 rounded-lg bg-secondary text-muted-foreground text-sm font-medium flex items-center justify-center gap-1.5"
            >
              <XCircle size={16} /> Limpar Todos
            </motion.button>
          </div>

          {/* Search students */}
          {cls.students.length > 5 && (
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Buscar aluno..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Student checklist */}
          <div className="rounded-xl border border-border overflow-hidden">
            {filteredStudents.map(s => {
              const completed = selectedActivity.completedIds.includes(s.id);
              return (
                <motion.div
                  key={s.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleToggle(s.id)}
                  className="flex items-center justify-between px-4 min-h-[56px] bg-card border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      completed ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <Check size={20} strokeWidth={3} />
                  </div>
                </motion.div>
              );
            })}
            {totalStudents === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Adicione alunos na aba "Alunos" primeiro.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt="Evidência ampliada"
              className="max-w-full max-h-full rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!deleteTarget}
        title={deleteTarget?.type === 'student' ? 'Excluir Aluno' : 'Excluir Atividade'}
        message={deleteTarget?.type === 'student'
          ? 'Tem certeza que deseja excluir este aluno?'
          : 'Tem certeza que deseja excluir esta atividade?'
        }
        onConfirm={deleteTarget?.type === 'student' ? handleDeleteStudent : handleDeleteActivity}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
