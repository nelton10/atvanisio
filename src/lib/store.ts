import { SchoolClass, ProfessorAssignments, UserSession } from '@/types';

const CLASSES_KEY = 'portal_classes';
const ASSIGNMENTS_KEY = 'portal_assignments';
const SESSION_KEY = 'portal_session';
const REMEMBER_KEY = 'portal_remember';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Classes
export function getClasses(): SchoolClass[] {
  const data = localStorage.getItem(CLASSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveClasses(classes: SchoolClass[]) {
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
}

export function addClass(name: string): SchoolClass {
  const classes = getClasses();
  const newClass: SchoolClass = { id: generateId(), name, students: [], activities: [] };
  classes.push(newClass);
  saveClasses(classes);
  return newClass;
}

export function updateClass(id: string, updates: Partial<SchoolClass>) {
  const classes = getClasses();
  const idx = classes.findIndex(c => c.id === id);
  if (idx !== -1) {
    classes[idx] = { ...classes[idx], ...updates };
    saveClasses(classes);
  }
  return classes;
}

export function deleteClass(id: string) {
  const classes = getClasses().filter(c => c.id !== id);
  saveClasses(classes);
  return classes;
}

export function getClassById(id: string): SchoolClass | undefined {
  return getClasses().find(c => c.id === id);
}

// Students
export function addStudent(classId: string, name: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    cls.students.push({ id: generateId(), name });
    saveClasses(classes);
  }
  return classes;
}

export function removeStudent(classId: string, studentId: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    cls.students = cls.students.filter(s => s.id !== studentId);
    cls.activities.forEach(a => {
      a.completedIds = a.completedIds.filter(id => id !== studentId);
    });
    saveClasses(classes);
  }
  return classes;
}

// Activities
export function addActivity(classId: string, title: string, author: string, image?: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    cls.activities.push({
      id: generateId(),
      title,
      date: new Date().toISOString(),
      completedIds: [],
      image,
      author,
    });
    saveClasses(classes);
  }
  return classes;
}

export function updateActivity(classId: string, activityId: string, updates: Partial<{ title: string; image: string | undefined; completedIds: string[] }>) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    const act = cls.activities.find(a => a.id === activityId);
    if (act) {
      Object.assign(act, updates);
      saveClasses(classes);
    }
  }
  return classes;
}

export function deleteActivity(classId: string, activityId: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    cls.activities = cls.activities.filter(a => a.id !== activityId);
    saveClasses(classes);
  }
  return classes;
}

export function toggleStudentCompletion(classId: string, activityId: string, studentId: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    const act = cls.activities.find(a => a.id === activityId);
    if (act) {
      if (act.completedIds.includes(studentId)) {
        act.completedIds = act.completedIds.filter(id => id !== studentId);
      } else {
        act.completedIds.push(studentId);
      }
      saveClasses(classes);
    }
  }
  return classes;
}

export function markAllComplete(classId: string, activityId: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    const act = cls.activities.find(a => a.id === activityId);
    if (act) {
      act.completedIds = cls.students.map(s => s.id);
      saveClasses(classes);
    }
  }
  return classes;
}

export function clearAllCompletion(classId: string, activityId: string) {
  const classes = getClasses();
  const cls = classes.find(c => c.id === classId);
  if (cls) {
    const act = cls.activities.find(a => a.id === activityId);
    if (act) {
      act.completedIds = [];
      saveClasses(classes);
    }
  }
  return classes;
}

// Professor assignments
export function getAssignments(): ProfessorAssignments {
  const data = localStorage.getItem(ASSIGNMENTS_KEY);
  return data ? JSON.parse(data) : {};
}

export function saveAssignments(assignments: ProfessorAssignments) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function setProfessorClasses(name: string, classIds: string[]) {
  const assignments = getAssignments();
  assignments[name] = classIds;
  saveAssignments(assignments);
}

// Session
export function getSession(): UserSession | null {
  const data = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(REMEMBER_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveSession(session: UserSession, remember: boolean) {
  const json = JSON.stringify(session);
  sessionStorage.setItem(SESSION_KEY, json);
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, json);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

// Backup
export function exportBackup(): string {
  return JSON.stringify({
    classes: getClasses(),
    assignments: getAssignments(),
    exportDate: new Date().toISOString(),
  }, null, 2);
}

export function importBackup(json: string) {
  const data = JSON.parse(json);
  
  if (Array.isArray(data)) {
    saveClasses(data);
    return;
  }
  
  // Support for legacy system format with "alunos" array
  if (data.alunos && Array.isArray(data.alunos)) {
    const classMap = new Map<string, SchoolClass>();
    
    data.alunos.forEach((aluno: any) => {
      if (!aluno.turma) return;
      
      const className = aluno.turma.trim();
      if (!classMap.has(className)) {
        classMap.set(className, {
          id: generateId(),
          name: className,
          students: [],
          activities: []
        });
      }
      
      const studentName = aluno.nome?.trim();
      if (studentName && studentName !== '[Avaliação de Turma]') {
        const studentExists = classMap.get(className)!.students.some(s => s.name === studentName);
        if (!studentExists) {
          classMap.get(className)!.students.push({
            id: aluno.id || generateId(),
            name: studentName
          });
        }
      }
    });

    const newClasses = Array.from(classMap.values());
    if (newClasses.length === 0) {
      throw new Error('Nenhum dado de turmas ou alunos encontrado no arquivo.');
    }
    
    saveClasses(newClasses);
    return;
  }
  
  if (!data.classes && !data.assignments) {
    throw new Error('Formato de arquivo não reconhecido. Certifique-se de que é um backup válido.');
  }

  if (data.classes) saveClasses(data.classes);
  if (data.assignments) saveAssignments(data.assignments);
}

export { generateId };
