import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SchoolClass } from '@/types';
import { getClasses, getAssignments, getBimesters } from '@/lib/store';
import { ArrowLeft, Download, Printer, BarChart3, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { Bimester } from '@/types';

interface Props {
  onBack: () => void;
}

interface StudentReport {
  id: string; // unique combo for mapping
  name: string;
  className: string;
  discipline: string;
  completed: number;
  total: number;
  percentage: number;
}

export default function ReportsPage({ onBack }: Props) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allReports, setAllReports] = useState<StudentReport[]>([]);
  const [bimesters, setBimesters] = useState<Bimester[]>([]);
  const [activeBimesterId, setActiveBimesterId] = useState<number>(0);
  const [filter, setFilter] = useState<{classId: string, discipline: string}>({ classId: 'all', discipline: '' });

  useEffect(() => {
    const loadData = async () => {
      const [allClasses, allAssignments, bimesterList] = await Promise.all([
        getClasses(),
        getAssignments(),
        getBimesters()
      ]);
      setBimesters(bimesterList);
      
      let currentBimesterId = activeBimesterId;
      if (currentBimesterId === 0 && bimesterList.length > 0) {
        const now = new Date().toISOString().split('T')[0];
        const current = bimesterList.find(b => now >= b.startDate && now <= b.endDate) || bimesterList[0];
        currentBimesterId = current.id;
        setActiveBimesterId(currentBimesterId);
      }

      const activeBimester = bimesterList.find(b => b.id === currentBimesterId);
      
      let filteredClasses = allClasses;
      const studentReports: StudentReport[] = [];

      if (user?.role === 'gestao') {
        filteredClasses = allClasses;
      } else if (user) {
        const myAssignments = allAssignments[user.name] || [];
        const myClassIds = Array.from(new Set(myAssignments.map(a => a.classId)));
        filteredClasses = allClasses.filter(c => myClassIds.includes(c.id));
      }

      for (const cls of filteredClasses) {
        let disciplines: string[] = [];
        if (user?.role === 'gestao') {
          disciplines = Array.from(new Set(cls.activities.map(a => a.discipline)));
          if (disciplines.length === 0) disciplines = [''];
        } else {
          disciplines = allAssignments[user!.name]
            ?.filter(a => a.classId === cls.id)
            ?.map(a => a.discipline) || [];
        }

        for (const disc of disciplines) {
          cls.students.forEach(student => {
            const activities = cls.activities.filter(a => {
              const matchesDisc = !disc || a.discipline === disc;
              if (!matchesDisc) return false;
              if (!activeBimester) return true;
              const date = a.date.split('T')[0];
              return date >= activeBimester.startDate && date <= activeBimester.endDate;
            });
            const total = activities.length;
            const completed = activities.filter(a => a.completedIds.includes(student.id)).length;
            
            studentReports.push({
              id: `${cls.id}-${disc}-${student.id}`,
              name: student.name,
              className: cls.name,
              discipline: disc,
              completed,
              total,
              percentage: total > 0 ? (completed / total) * 100 : 0,
            });
          });
        }
      }

      setClasses(allClasses); // Keep all classes for reference if needed
      setAllReports(studentReports);
    };
    loadData();
  }, [user, activeBimesterId]);

  const filteredReports = filter.classId === 'all'
    ? allReports
    : allReports.filter(r => {
        // Find the class by ID to get its name for matching, or just use classId if we store it
        // To be safe, let's just match the raw data we have in StudentReport
        const targetClass = classes.find(c => c.id === filter.classId);
        return targetClass?.name === r.className && r.discipline === filter.discipline;
      });

  const sortedReports = [...filteredReports].sort((a, b) => b.percentage - a.percentage);

  // Group filter options
  const filterOptions = Array.from(new Set(allReports.map(r => JSON.stringify({ classId: classes.find(c => c.name === r.className)?.id, className: r.className, discipline: r.discipline }))))
    .map(s => JSON.parse(s))
    .sort((a, b) => a.className.localeCompare(b.className) || a.discipline.localeCompare(b.discipline));

  const exportCSV = () => {
    const header = 'Posição,Aluno,Turma,Disciplina,Concluídas,Total,Percentual\n';
    const rows = sortedReports.map((r, i) =>
      `${i + 1},"${r.name}","${r.className}","${r.discipline}",${r.completed},${r.total},"${r.percentage.toFixed(1).replace('.', ',')}%"`
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

      {/* Bimester Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {bimesters.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBimesterId(b.id)}
            className={`px-4 h-9 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeBimesterId === b.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card text-muted-foreground border border-border hover:bg-secondary'
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={JSON.stringify(filter)}
          onChange={e => setFilter(JSON.parse(e.target.value))}
          className="w-full h-11 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={JSON.stringify({ classId: 'all', discipline: '' })}>Todos os relatórios</option>
          {filterOptions.filter(opt => opt.classId).map((opt, i) => (
            <option key={i} value={JSON.stringify({ classId: opt.classId, discipline: opt.discipline })}>
              {opt.className} {opt.discipline ? ` - ${opt.discipline}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={exportCSV}
          disabled={sortedReports.length === 0}
          className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-card border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 shadow-sm"
        >
          <Download size={18} /> Exportar CSV
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePrint}
          disabled={sortedReports.length === 0}
          className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-card border border-border text-sm font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 shadow-sm"
        >
          <Printer size={18} /> Imprimir
        </motion.button>
      </div>

      {/* Table */}
      {sortedReports.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Aluno</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Turma</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Disciplina</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {sortedReports.map((r, i) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.className}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.discipline && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                          {r.discipline}
                        </span>
                      )}
                    </td>
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
