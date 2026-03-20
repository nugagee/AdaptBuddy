export interface Teacher {
  id: string;
  name: string;
  email: string;
  school: string;
  classes: string[];
  avatar?: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  neurotypes: string[];
  classId: string;
  parentEmail: string;
  joinDate: string;
  lastActive: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  students: string[];
  subject: string;
  grade: string;
  schedule: string;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  attachments?: string[];
  neuroSupport: {
    dyslexia?: boolean;
    dysgraphia?: boolean;
    adhd?: boolean;
  };
  createdAt: string;
}

export interface ProgressReport {
  studentId: string;
  week: string;
  attendance: number;
  assignmentsCompleted: number;
  emotionalCheckins: {
    happy: number;
    calm: number;
    sad: number;
    angry: number;
  };
  aiInsights: string[];
}