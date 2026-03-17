export interface Student {
  id: string;
  name: string;
  prohibitedFromExit?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  completedIds: string[];
  image?: string;
  author: string;
  discipline: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  students: Student[];
  activities: Activity[];
}

export type UserRole = 'gestao' | 'prof';

export interface UserSession {
  name: string;
  role: UserRole;
}

export interface Bimester {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Assignment {
  classId: string;
  discipline: string;
}

export interface ProfessorAssignments {
  [professorName: string]: Assignment[];
}
