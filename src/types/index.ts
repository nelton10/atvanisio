export interface Student {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  completedIds: string[];
  image?: string;
  author: string;
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

export interface ProfessorAssignments {
  [professorName: string]: string[]; // class ids
}
