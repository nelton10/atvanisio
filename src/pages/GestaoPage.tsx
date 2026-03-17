import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolClass, Bimester, Student } from '@/types';
import {
  getClasses, getBimesters, setBimesters, addStudent, transferStudent,
  toggleStudentExitProhibition, exportBackup, importBackup
} from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CalendarDays, Download, Upload, X, UserPlus, ArrowRightLeft,
  ShieldAlert, ShieldCheck, Search, ChevronRight, ChevronDown
} from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function GestaoPage({ onBack }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [bimesters, setBimestersList] = useState<Bimester[]>([]);
  const [showBimesterModal, setShowBimesterModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState<'add' | 'transfer'>('add');
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  // Form states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const loadData = async () => {
    const [clsList, bimesterList] = await Promise.all([
      getClasses(),
      getBimesters()
    ]);
    setClasses(clsList);
    setBimestersList(bimesterList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleExit = async (classId: string, studentId: string) => {
    try {
      await toggleStudentExitProhibition(classId, studentId);
      loadData();
    } catch (error) {
      alert('Erro ao alterar permissão de saída.');
    }
  };

  const handleAddStudentToClass = async () => {
    if (!selectedClassId || !newStudentName.trim()) return;
    setIsProcessing(true);
    try {
      await addStudent(selectedClassId, newStudentName.trim());
      setNewStudentName('');
      setSelectedClassId('');
      setShowStudentModal(false);
      loadData();
      alert('Aluno adicionado com sucesso!');
    } catch (error) {
      alert('Erro ao adicionar aluno.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferStudent = async () => {
    if (!fromClassId || !toClassId || !selectedStudentId) return;
    setIsProcessing(true);
    try {
      await transferStudent(fromClassId, toClassId, selectedStudentId);
      setFromClassId('');
      setToClassId('');
      setSelectedStudentId('');
      setShowStudentModal(false);
      loadData();
      alert('Aluno transferido com sucesso!');
    } catch (error) {
      alert('Erro ao transferir aluno.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveBimesters = async () => {
    await setBimesters(bimesters);
    setShowBimesterModal(false);
    loadData();
  };

  const updateBimesterDate = (id: number, field: 'startDate' | 'endDate', value: string) => {
    setBimestersList(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
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

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => 
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.students.some(s => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground font-display">Gestão Administrativa</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowStudentModal(true)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-primary text-primary-foreground shadow-sm"
        >
          <Users size={24} />
          <span className="text-xs font-bold">Gerenciar Alunos</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowBimesterModal(true)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border text-foreground hover:bg-secondary transition-colors"
        >
          <CalendarDays size={24} />
          <span className="text-xs font-bold">Bimestres</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border text-foreground hover:bg-secondary transition-colors"
        >
          <Download size={24} />
          <span className="text-xs font-bold">Backup</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleImport}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border text-foreground hover:bg-secondary transition-colors"
        >
          <Upload size={24} />
          <span className="text-xs font-bold">Importar</span>
        </motion.button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShieldAlert size={20} className="text-primary" /> Controle de Saída
          </h3>
          <div className="relative w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-8 pl-9 pr-3 rounded-lg border border-input bg-card text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredClasses.map(cls => (
            <div key={cls.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button 
                onClick={() => toggleClass(cls.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">{cls.name}</span>
                  <span className="text-xs text-muted-foreground">({cls.students.length} alunos)</span>
                </div>
                {expandedClasses.includes(cls.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              
              <AnimatePresence>
                {expandedClasses.includes(cls.id) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-2 space-y-1">
                      {cls.students.map(student => (
                        <div key={student.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                          <span className="text-sm font-medium text-foreground">{student.name}</span>
                          <button
                            onClick={() => handleToggleExit(cls.id, student.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                              student.prohibitedFromExit
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-success/10 text-success'
                            }`}
                          >
                            {student.prohibitedFromExit ? (
                              <><ShieldAlert size={12} /> Proibido Sair</>
                            ) : (
                              <><ShieldCheck size={12} /> Saída Livre</>
                            )}
                          </button>
                        </div>
                      ))}
                      {cls.students.length === 0 && (
                        <p className="p-4 text-center text-xs text-muted-foreground italic">Nenhum aluno cadastrado.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
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

        {showStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Users size={18} className="text-primary" /> Gerenciar Alunos
                </h3>
                <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="flex p-1 bg-secondary mx-4 mt-4 rounded-lg">
                <button
                  onClick={() => setStudentModalTab('add')}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                    studentModalTab === 'add' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setStudentModalTab('transfer')}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                    studentModalTab === 'transfer' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Transferir
                </button>
              </div>

              <div className="p-4 space-y-4">
                {studentModalTab === 'add' ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Turma</label>
                      <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-input bg-card text-sm"
                      >
                        <option value="">Selecione a turma...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Nome do Aluno</label>
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={e => setNewStudentName(e.target.value)}
                        placeholder="Nome completo..."
                        className="w-full h-11 px-3 rounded-xl border border-input bg-card text-sm"
                      />
                    </div>
                    <button
                      onClick={handleAddStudentToClass}
                      disabled={isProcessing || !selectedClassId || !newStudentName.trim()}
                      className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? 'Processando...' : <><UserPlus size={18} /> Adicionar Aluno</>}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">De: Turma (Origem)</label>
                      <select
                        value={fromClassId}
                        onChange={e => {
                          setFromClassId(e.target.value);
                          setSelectedStudentId('');
                        }}
                        className="w-full h-11 px-3 rounded-xl border border-input bg-card text-sm"
                      >
                        <option value="">Selecione...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {fromClassId && (
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Aluno</label>
                        <select
                          value={selectedStudentId}
                          onChange={e => setSelectedStudentId(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl border border-input bg-card text-sm"
                        >
                          <option value="">Selecione o aluno...</option>
                          {classes.find(c => c.id === fromClassId)?.students.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Para: Turma (Destino)</label>
                      <select
                        value={toClassId}
                        onChange={e => setToClassId(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-input bg-card text-sm"
                      >
                        <option value="">Selecione...</option>
                        {classes.filter(c => c.id !== fromClassId).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleTransferStudent}
                      disabled={isProcessing || !fromClassId || !toClassId || !selectedStudentId}
                      className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? 'Processando...' : <><ArrowRightLeft size={18} /> Transferir Aluno</>}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
