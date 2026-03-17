import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolClass } from '@/types';
import { getClasses, getAssignments } from '@/lib/store';
import { ArrowLeft, Download, Printer, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

interface StudentReport {
  name: string;
  className: string;
  completed: number;
  total: number;
  percentage: number;
}

export default function ReportsPage({ onBack }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      const [allClasses, allAssignments] = await Promise.all([
        getClasses(),
        getAssignments()
      ]);
      
      if (user?.role === 'gestao') {
        setClasses(allClasses);
      } else if (user) {
        const myClassIds = allAssignments[user.name] || [];
        setClasses(allClasses.filter(c => myClassIds.includes(c.id)));
      }
    };
    loadData();
  }, [user]);

  const targetClasses = selectedClassId === 'all'
    ? classes
    : classes.filter(c => c.id === selectedClassId);

  const studentReports: StudentReport[] = [];
  targetClasses.forEach(cls => {
    cls.students.forEach(student => {
      const totalActivities = cls.activities.length;
      const completedActivities = cls.activities.filter(a =>
        a.completedIds.includes(student.id)
      ).length;
      studentReports.push({
        name: student.name,
        className: cls.name,
        completed: completedActivities,
        total: totalActivities,
        percentage: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0,
      });
    });
  });

  studentReports.sort((a, b) => b.percentage - a.percentage);

  const exportCSV = () => {
    const header = 'Posição,Aluno,Turma,Concluídas,Total,Percentual\n';
    const rows = studentReports.map((r, i) =>
      `${i + 1},"${r.name}","${r.className}",${r.completed},${r.total},"${r.percentage.toFixed(1).replace('.', ',')}%"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-card border border-border text-foreground"
        >
          <ArrowLeft size={20} />
        </motion.button>
        <h2 className="text-xl font-bold text-foreground font-display">Relatórios</h2>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="w-full h-11 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todas as turmas</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={exportCSV}
          disabled={studentReports.length === 0}
          className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-card border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 shadow-sm"
        >
          <Download size={18} /> Exportar CSV
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePrint}
          disabled={studentReports.length === 0}
          className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-card border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 shadow-sm"
        >
          <Printer size={18} /> Imprimir
        </motion.button>
      </div>

      {/* Table */}
      {studentReports.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Aluno</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Turma</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {studentReports.map((r, i) => (
                  <tr key={`${r.name}-${r.className}-${i}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.className}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${r.percentage}%` }}
                          />
                        </div>
                        <span className="tabular-nums font-bold text-foreground w-12 text-right">
                          {r.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum dado disponível para o relatório.</p>
        </div>
      )}
    </div>
  );
}
