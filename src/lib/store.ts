import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  FieldValue,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { SchoolClass, ProfessorAssignments, UserSession, Activity } from '@/types';

const CLASSES_COLLECTION = 'classes';
const ASSIGNMENTS_COLLECTION = 'assignments';
const SESSION_KEY = 'portal_session';
const REMEMBER_KEY = 'portal_remember';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function cleanObject<T extends object>(obj: T): T {
  const newObj = { ...obj } as any;
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
}

// Classes
export async function getClasses(): Promise<SchoolClass[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CLASSES_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
  } catch (error) {
    console.error("Firestore getClasses error:", error);
    throw error;
  }
}

export async function addClass(name: string): Promise<SchoolClass> {
  try {
    const id = generateId();
    const newClass: SchoolClass = { id, name, students: [], activities: [] };
    await setDoc(doc(db, CLASSES_COLLECTION, id), newClass);
    return newClass;
  } catch (error) {
    console.error("Firestore addClass error:", error);
    throw error;
  }
}

export async function updateClass(id: string, updates: Partial<SchoolClass>) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, id);
    await updateDoc(classRef, updates);
  } catch (error) {
    console.error("Firestore updateClass error:", error);
    throw error;
  }
}

export async function deleteClass(id: string) {
  try {
    await deleteDoc(doc(db, CLASSES_COLLECTION, id));
  } catch (error) {
    console.error("Firestore deleteClass error:", error);
    throw error;
  }
}

export async function getClassById(id: string): Promise<SchoolClass | undefined> {
  try {
    const docRef = doc(db, CLASSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SchoolClass;
    }
    return undefined;
  } catch (error) {
    console.error("Firestore getClassById error:", error);
    throw error;
  }
}

// Students
export async function addStudent(classId: string, name: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const newStudent = { id: generateId(), name };
    await updateDoc(classRef, {
      students: arrayUnion(newStudent)
    });
  } catch (error) {
    console.error("Firestore addStudent error:", error);
    throw error;
  }
}

export async function removeStudent(classId: string, studentId: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const cls = await getClassById(classId);
    if (cls) {
      const studentToRemove = cls.students.find(s => s.id === studentId);
      if (studentToRemove) {
        // Also clean up completedIds in activities
        const updatedActivities = cls.activities.map(a => ({
          ...a,
          completedIds: a.completedIds.filter(id => id !== studentId)
        }));
        
        await updateDoc(classRef, {
          students: arrayRemove(studentToRemove),
          activities: updatedActivities
        });
      }
    }
  } catch (error) {
    console.error("Firestore removeStudent error:", error);
    throw error;
  }
}

// Activities
export async function addActivity(classId: string, title: string, author: string, image?: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const newActivity = cleanObject({
      id: generateId(),
      title,
      date: new Date().toISOString(),
      completedIds: [],
      image,
      author,
    });
    await updateDoc(classRef, {
      activities: arrayUnion(newActivity)
    });
  } catch (error) {
    console.error("Firestore addActivity error:", error);
    throw error;
  }
}

export async function updateActivity(classId: string, activityId: string, updates: Partial<{ title: string; image: string | undefined; completedIds: string[] }>) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const cls = await getClassById(classId);
    if (cls) {
      const updatedActivities = cls.activities.map(a => 
        a.id === activityId ? cleanObject({ ...a, ...updates }) : a
      );
      await updateDoc(classRef, { activities: updatedActivities });
    }
  } catch (error) {
    console.error("Firestore updateActivity error:", error);
    throw error;
  }
}

export async function deleteActivity(classId: string, activityId: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const cls = await getClassById(classId);
    if (cls) {
      const updatedActivities = cls.activities.filter(a => a.id !== activityId);
      await updateDoc(classRef, { activities: updatedActivities });
    }
  } catch (error) {
    console.error("Firestore deleteActivity error:", error);
    throw error;
  }
}

export async function toggleStudentCompletion(classId: string, activityId: string, studentId: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const cls = await getClassById(classId);
    if (cls) {
      const updatedActivities = cls.activities.map(a => {
        if (a.id === activityId) {
          const completedIds = a.completedIds.includes(studentId)
            ? a.completedIds.filter(id => id !== studentId)
            : [...a.completedIds, studentId];
          return { ...a, completedIds };
        }
        return a;
      });
      await updateDoc(classRef, { activities: updatedActivities });
    }
  } catch (error) {
    console.error("Firestore toggleStudentCompletion error:", error);
    throw error;
  }
}

export async function markAllComplete(classId: string, activityId: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const cls = await getClassById(classId);
    if (cls) {
      const updatedActivities = cls.activities.map(a => {
        if (a.id === activityId) {
          return { ...a, completedIds: cls.students.map(s => s.id) };
        }
        return a;
      });
      await updateDoc(classRef, { activities: updatedActivities });
    }
  } catch (error) {
    console.error("Firestore markAllComplete error:", error);
    throw error;
  }
}

export async function clearAllCompletion(classId: string, activityId: string) {
  try {
    const classRef = doc(db, CLASSES_COLLECTION, classId);
    const cls = await getClassById(classId);
    if (cls) {
      const updatedActivities = cls.activities.map(a => {
        if (a.id === activityId) {
          return { ...a, completedIds: [] };
        }
        return a;
      });
      await updateDoc(classRef, { activities: updatedActivities });
    }
  } catch (error) {
    console.error("Firestore clearAllCompletion error:", error);
    throw error;
  }
}

// Professor assignments
export async function getAssignments(): Promise<ProfessorAssignments> {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, 'global');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as ProfessorAssignments;
  }
  return {};
}

export async function setProfessorClasses(name: string, classIds: string[]) {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, 'global');
  await setDoc(docRef, { [name]: classIds }, { merge: true });
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
export async function exportBackup(): Promise<string> {
  const classes = await getClasses();
  const assignments = await getAssignments();
  return JSON.stringify({
    classes,
    assignments,
    exportDate: new Date().toISOString(),
  }, null, 2);
}

export async function importBackup(json: string) {
  const data = JSON.parse(json);
  
  if (Array.isArray(data)) {
    for (const cls of data) {
      await setDoc(doc(db, CLASSES_COLLECTION, cls.id), cls);
    }
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
    
    for (const cls of newClasses) {
      await setDoc(doc(db, CLASSES_COLLECTION, cls.id), cls);
    }
    return;
  }
  
  if (!data.classes && !data.assignments) {
    throw new Error('Formato de arquivo não reconhecido. Certifique-se de que é um backup válido.');
  }

  if (data.classes) {
    for (const cls of data.classes) {
      await setDoc(doc(db, CLASSES_COLLECTION, cls.id), cls);
    }
  }
  if (data.assignments) {
    await setDoc(doc(db, ASSIGNMENTS_COLLECTION, 'global'), data.assignments);
  }
}

export { generateId };
