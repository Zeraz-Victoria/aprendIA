"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { LevelContent } from '@/types/learning-world';

export interface LearningWorld {
  id: string;
  theme: string;
  days: LevelContent[];
  title?: string;
  color?: string;
  pedagogy?: {
    topic: string;
    pda: string;
    ejes: string[];
    grade: string;
    camposFormativos?: string[];
    proposito?: string;
    diagnostico?: string;
    contenidos?: string;
    planoOficial?: any;
  };
  createdAt: string;
  classrooms?: { id: string; name?: string }[];
  classroomIds?: string[];
  assignedStudents?: { id: string; name?: string }[];
  studentIds?: string[];
}

export interface StudentStats {
  lives: number;
  gems: number;
  streak: number;
  xp: number;
}

export interface SessionUser {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface DBUser {
  id: string;
  name: string;
  avatar: string | null;
  status: string;
  lives: number;
  gems: number;
  streak: number;
  xp: number;
  classroomId: string | null;
  activeFrame?: string | null;
  studentCode?: string | null;
  assignedWorlds?: { id: string, title?: string, theme: string }[];
  projectGrades?: { id: string, worldId: string, grade: number, feedback?: string | null }[];
  automaticProjectGrades?: { worldId: string, averageGrade: number }[];
  globalActivityAverage?: number | null;
  lastSeen?: string | null;
}

export interface Student {
  id: string;
  name: string;
  avatar: string; // Emoji
  progress: number; // 0-100 (Overall)
  status: "active" | "idle" | "needs_help";
  lastActivity: string; // Or Date
  lastSeen?: string; // Add this line
  lives: number;
  gems: number;
  streak: number;
  xp: number;
  classroomId?: string | null;
  activeFrame?: string | null;
  studentCode?: string | null;
  assignedWorlds?: { id: string, title?: string, theme: string }[];
  projectGrades?: { id: string, worldId: string, grade: number, feedback?: string | null }[];
  automaticProjectGrades?: { worldId: string, averageGrade: number }[];
  globalActivityAverage?: number | null;
}

// Progress Map: studentId -> worldId -> completedLevels[]
type ProgressMap = Record<string, Record<string, number[]>>;

interface LearningContextType {
  // World Management (Teacher)
  worlds: LearningWorld[];
  activeWorldId: string | null;
  addWorld: (world: LearningWorld) => Promise<boolean>;
  updateWorld: (world: LearningWorld) => Promise<boolean>;
  deleteWorld: (worldId: string) => void;
  setActiveWorld: (worldId: string) => void;

  // Student Session
  currentUser: Student | null;
  login: (name: string) => boolean;
  logout: () => void;

  // Gamification & Progress
  stats: StudentStats; // Current user stats
  setStats: React.Dispatch<React.SetStateAction<StudentStats>>;
  progress: ProgressMap;
  inventory: Record<string, string[]>;
  markLevelComplete: (studentId: string, worldId: string, levelId: number, isBoss: boolean) => void;
  purchaseItem: (studentId: string, itemId: string, cost: number) => Promise<boolean>;
  consumeItem: (studentId: string, itemId: string) => Promise<boolean>;

  // Bootstrap extras (pre-fetched for students)
  bootstrapExtras: { hints: any[]; evaluations: any[]; messages: any[] } | null;

  // Teacher Data
  students: Student[];
  addStudent: (name: string, avatar: string, classroomId?: string | null) => Promise<boolean>;
  updateStudent: (id: string, name: string, avatar: string, classroomId?: string | null) => Promise<boolean>;
  updateStudentAvatar: (newAvatar: string) => Promise<boolean>;
  updateStudentFrame: (newFrame: string | null) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  grades: Grade[];
  addGrade: (name: string, description?: string) => Promise<boolean>;
  updateGrade: (id: string, name: string, description?: string) => Promise<boolean>;
  deleteGrade: (id: string) => Promise<boolean>;
  classrooms: Classroom[];
  addClassroom: (name: string, emoji: string, gradeId?: string | null, description?: string) => Promise<boolean>;
  updateClassroom: (id: string, name: string, emoji: string, gradeId?: string | null, description?: string) => Promise<boolean>;
  deleteClassroom: (id: string) => Promise<boolean>;
  assignStudentToClassroom: (studentId: string, classroomId: string | null) => Promise<boolean>;
  toggleWorldAssignment: (studentId: string, worldId: string, action: 'assign' | 'unassign') => Promise<boolean>;
  setProjectGrade: (studentId: string, worldId: string, grade: number, feedback?: string) => Promise<boolean>;
}

export interface Grade {
  id: string;
  name: string;
  description?: string | null;
  teacherId: string;
  classrooms?: Classroom[];
}

export interface Classroom {
  id: string;
  name: string;
  description?: string | null;
  emoji: string;
  teacherId: string;
  gradeId?: string | null;
  accessCode?: string | null;
  _count?: { students: number };
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: ReactNode }) {
  // -- State --
  const [worlds, setWorlds] = useState<LearningWorld[]>([]);
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);

  // Progress Tracking: { studentId: { worldId: [1, 2] } }
  const [progress, setProgress] = useState<ProgressMap>({});

  // Inventory Tracking: { studentId: ["item_1", "item_2"] }
  const [inventory, setInventory] = useState<Record<string, string[]>>({});

  // Gamification Session & Students
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    lives: 3,
    gems: 0,
    streak: 0,
    xp: 0
  });
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [bootstrapExtras, setBootstrapExtras] = useState<{ hints: any[]; evaluations: any[]; messages: any[] } | null>(null);

  const { data: session, status } = useSession();

  // -- Persistence via Prisma APIs --
  // -- Persistence via Prisma APIs --
  useEffect(() => {
    let isMounted = true;
    const role = (session?.user as any)?.role;

    const loadData = async () => {
      if (status !== 'authenticated' || !isMounted) return;

      try {
        // === FAST PATH: Students use a single bootstrap endpoint ===
        if (role === 'STUDENT') {
          const res = await fetch(`/api/student/bootstrap?t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok && isMounted) {
            const data = await res.json();

            // Set student as the only student in the list
            const u = data.user;
            const mappedStudent: Student = {
              id: u.id,
              name: u.name,
              avatar: u.avatar || '🧑🏻',
              status: u.status as Student['status'],
              lastActivity: 'Activo recientemente',
              lastSeen: u.lastSeen,
              progress: 0,
              lives: u.lives,
              gems: u.gems,
              streak: u.streak,
              xp: u.xp,
              classroomId: u.classroomId || null,
              activeFrame: u.activeFrame,
              studentCode: u.studentCode,
              assignedWorlds: u.assignedWorlds,
              projectGrades: u.projectGrades,
              automaticProjectGrades: u.automaticProjectGrades,
              globalActivityAverage: u.globalActivityAverage
            };
            setStudents([mappedStudent]);

            // Set worlds
            if (data.worlds?.length > 0) {
              setWorlds(data.worlds);
              setActiveWorldId(prev => prev || data.worlds[0].id);
            }

            // Set progress and inventory
            setProgress(data.progress || {});
            setInventory(data.inventory || {});

            // Store extras so the student page doesn't need separate fetches
            setBootstrapExtras({
              hints: data.hints || [],
              evaluations: data.evaluations || [],
              messages: data.messages || []
            });
          }
          return;
        }

        // === TEACHER / ADMIN PATH: Unified bootstrap endpoint ===
        const res = await fetch(`/api/teacher/bootstrap?t=${Date.now()}`, { cache: 'no-store' });
        
        if (res.ok && isMounted) {
          const data = await res.json();
          
          setStudents(data.students || []);
          setWorlds(data.worlds || []);
          setClassrooms(data.classrooms || []);
          setGrades(data.grades || []);
          setProgress(data.progress || {});
          setInventory(data.inventory || {});
          
          if (data.worlds?.length > 0) {
            setActiveWorldId(prev => prev || data.worlds[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load initial data from DB", err);
      }
    };

    loadData();

    // Poll for fresh data every 5 minutes
    const interval = setInterval(loadData, 300000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [status, session]);


  // -- Actions --

  const addWorld = async (newWorld: LearningWorld): Promise<boolean> => {
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorld)
      });

      if (res.ok) {
        const savedWorld = await res.json();
        setWorlds(prev => {
          if (prev.length === 0) setActiveWorldId(savedWorld.id);
          return [...prev, savedWorld];
        });
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to add world:", errorData);
        return false;
      }
    } catch (e) {
      console.error("Network error adding world:", e);
      return false;
    }
  };

  const updateWorld = async (updatedWorld: LearningWorld): Promise<boolean> => {
    try {
      const res = await fetch(`/api/worlds/${updatedWorld.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWorld)
      });
      if (res.ok) {
        const parsed = await res.json();
        setWorlds(prev => prev.map(w => w.id === parsed.id ? parsed : w));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Network error updating world:", e);
      return false;
    }
  };

  const deleteWorld = async (worldId: string) => {
    try {
      const res = await fetch(`/api/worlds/${worldId}`, { method: 'DELETE' });
      if (res.ok) {
        setWorlds(prev => prev.filter(w => w.id !== worldId));
        if (activeWorldId === worldId) setActiveWorldId(null);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Error al borrar el mapa: ${errorData.error || res.statusText}`);
      }
    } catch (e) {
      alert(`Error de conexión al borrar mapa: ${e}`);
    }
  };

  const setActiveWorld = (id: string) => {
    setActiveWorldId(id);
  };

  // Sync NextAuth session with LearningContext's currentUser
  useEffect(() => {
    if (session?.user && students.length > 0) {
      const found = students.find(s => s.id === (session.user as SessionUser)?.id || s.name === session.user?.name);

      if (found) {
        setCurrentUser(found);
        setStats({
          lives: found.lives,
          gems: found.gems,
          streak: found.streak,
          xp: found.xp
        });
      }
    } else if (status === 'unauthenticated') {
      setCurrentUser(null);
    }
  }, [session, status, students]);

  const login = () => {
    // Deprecated: Handled by NextAuth credentials provider now
    return false;
  };

  const logout = () => {
    nextAuthSignOut({ callbackUrl: '/' });
  };

  // -- Student CRUD --
  const addStudent = async (name: string, avatar: string, classroomId?: string | null): Promise<boolean> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, classroomId })
      });
      if (res.ok) {
        const newUser = await res.json();
        const mapped: Student = {
          id: newUser.id,
          name: newUser.name,
          avatar: newUser.avatar || '🧑🏻',
          status: newUser.status,
          lastActivity: 'Nuevo',
          progress: 0,
          lives: newUser.lives,
          gems: newUser.gems,
          streak: newUser.streak,
          xp: newUser.xp,
          classroomId: newUser.classroomId || null,
          assignedWorlds: newUser.assignedWorlds || [],
          projectGrades: newUser.projectGrades || []
        };
        setStudents(prev => [...prev, mapped]);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const updateStudent = async (id: string, name: string, avatar: string, classroomId?: string | null): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, classroomId })
      });
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, name, avatar, classroomId: classroomId ?? s.classroomId } : s));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const updateStudentAvatar = async (newAvatar: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/users/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser.id, avatar: newAvatar })
      });
      if (res.ok) {
        setCurrentUser({ ...currentUser, avatar: newAvatar });
        setStudents(prev => prev.map(s => s.id === currentUser.id ? { ...s, avatar: newAvatar } : s));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const updateStudentFrame = async (newFrame: string | null): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/users/frame', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: currentUser.id, frame: newFrame })
      });
      if (res.ok) {
        setCurrentUser({ ...currentUser, activeFrame: newFrame });
        setStudents(prev => prev.map(s => s.id === currentUser.id ? { ...s, activeFrame: newFrame } : s));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const deleteStudent = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id));
        return true;
      }
      const data = await res.json().catch(() => ({}));
      alert(`Error al borrar alumno: ${data.error || res.statusText}`);
      return false;
    } catch {
      alert("Error de red al borrar alumno.");
      return false;
    }
  };

  const addGrade = async (name: string, description?: string): Promise<boolean> => {
    try {
      const teacherId = (session?.user as SessionUser)?.id;
      if (!teacherId) return false;

      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, teacherId })
      });
      if (res.ok) {
        const newGrade = await res.json();
        setGrades(prev => [...prev, newGrade]);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const updateGrade = async (id: string, name: string, description?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/grades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if (res.ok) {
        const updatedGrade = await res.json();
        setGrades(prev => prev.map(g => g.id === id ? { ...g, name: updatedGrade.name, description: updatedGrade.description } : g));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const deleteGrade = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/grades?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGrades(prev => prev.filter(g => g.id !== id));
        // Update local classrooms to remove gradeId
        setClassrooms(prev => prev.map(c => c.gradeId === id ? { ...c, gradeId: null } : c));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const addClassroom = async (name: string, emoji: string, gradeId?: string | null, description?: string): Promise<boolean> => {
    try {
      const teacherId = (session?.user as SessionUser)?.id;
      if (!teacherId) return false;

      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, teacherId, gradeId, description })
      });
      if (res.ok) {
        const newClass = await res.json();
        if (newClass) setClassrooms(prev => [newClass, ...prev]);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const updateClassroom = async (id: string, name: string, emoji: string, gradeId?: string | null, description?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/classrooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, gradeId, description })
      });
      if (res.ok) {
        const updatedClass = await res.json();
        setClassrooms(prev => prev.map(c => c.id === id ? { ...c, name: updatedClass.name, emoji: updatedClass.emoji, description: updatedClass.description, gradeId: updatedClass.gradeId } : c));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const deleteClassroom = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/classrooms?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClassrooms(prev => prev.filter(c => c.id !== id));
        // Update local students state
        setStudents(prev => prev.map(s => s.classroomId === id ? { ...s, classroomId: null } : s));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const assignStudentToClassroom = async (studentId: string, classroomId: string | null): Promise<boolean> => {
    try {
      const res = await fetch('/api/classrooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classroomId })
      });
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, classroomId } : s));
        return true;
      }
      return false;
    } catch { return false; }
  };

  const toggleWorldAssignment = async (studentId: string, worldId: string, action: 'assign' | 'unassign'): Promise<boolean> => {
    try {
      const res = await fetch('/api/teacher/assign-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, worldId, action })
      });
      if (res.ok) {
        const data = await res.json();
        // API now returns lightweight world refs (id, title, theme) — no parsing needed
        const assignedWorlds = data.assignedWorlds || [];
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, assignedWorlds } : s));
        setCurrentUser(prev => prev && prev.id === studentId ? { ...prev, assignedWorlds } : prev);
        return true;
      }
      return false;
    } catch { return false; }
  };

    const setProjectGrade = async (studentId: string, worldId: string, grade: number, feedback?: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/teacher/project-grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, worldId, grade, feedback })
        });
        if (res.ok) {
          const newGradeObj = await res.json();
          setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
              const currentGrades = (s as any).projectGrades || [];
              const exists = currentGrades.find((g: any) => g.worldId === worldId);
              const updatedGrades = exists 
                ? currentGrades.map((g: any) => g.worldId === worldId ? newGradeObj : g)
                : [...currentGrades, newGradeObj];
              return { ...s, projectGrades: updatedGrades };
            }
            return s;
          }));
          return true;
        }
        return false;
      } catch { return false; }
    };

    const markLevelComplete = async (studentId: string, worldId: string, levelId: number, isBoss: boolean) => {
    // Optimistic Update
    const xpReward = isBoss ? 100 : 50;
    const gemsReward = isBoss ? 25 : 10;

    setProgress(prev => {
      const studentProgress = prev[studentId] || {};
      const worldProgress = studentProgress[worldId] || [];

      if (!worldProgress.includes(levelId)) {
        const newWorldProgress = [...worldProgress, levelId];
        setStats(s => ({ ...s, xp: s.xp + xpReward, gems: s.gems + gemsReward }));
        return {
          ...prev,
          [studentId]: {
            ...studentProgress,
            [worldId]: newWorldProgress
          }
        };
      }
      return prev;
    });

    // Submits to DB
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, worldId, levelId, isBoss })
    });
  };

  const purchaseItem = async (studentId: string, itemId: string, cost: number): Promise<boolean> => {
    if (stats.gems < cost) return false;

    if (itemId === "potion_life") {
      // Optimistic update
      setStats(s => ({ ...s, gems: s.gems - cost, lives: s.lives + 1 }));
      try {
        const res = await fetch('/api/users/sync-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, gemsToAdd: -cost, livesToAdd: 1 })
        });
        if (!res.ok) {
          // Rollback en caso de error
          setStats(s => ({ ...s, gems: s.gems + cost, lives: s.lives - 1 }));
          return false;
        }
      } catch {
        setStats(s => ({ ...s, gems: s.gems + cost, lives: s.lives - 1 }));
        return false;
      }
      return true;
    }

    // Ítem estándar persistente
    setStats(s => ({ ...s, gems: s.gems - cost }));
    setInventory(prev => ({
      ...prev,
      [studentId]: [...(prev[studentId] || []), itemId]
    }));

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, itemId, cost })
      });
      if (!res.ok) {
        // Rollback
        setStats(s => ({ ...s, gems: s.gems + cost }));
        setInventory(prev => {
          const items = [...(prev[studentId] || [])];
          const idx = items.lastIndexOf(itemId);
          if (idx > -1) items.splice(idx, 1);
          return { ...prev, [studentId]: items };
        });
        return false;
      }
    } catch {
      setStats(s => ({ ...s, gems: s.gems + cost }));
      setInventory(prev => {
        const items = [...(prev[studentId] || [])];
        const idx = items.lastIndexOf(itemId);
        if (idx > -1) items.splice(idx, 1);
        return { ...prev, [studentId]: items };
      });
      return false;
    }

    return true;
  };

  const consumeItem = async (studentId: string, itemId: string) => {
    // Optimistic removal from inventory
    setInventory(prev => {
      const userItems = prev[studentId] || [];
      const index = userItems.indexOf(itemId);
      if (index > -1) {
        const newItems = [...userItems];
        newItems.splice(index, 1);
        return { ...prev, [studentId]: newItems };
      }
      return prev;
    });

    try {
      const res = await fetch('/api/users/consume-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, itemId })
      });
      return res.ok;
    } catch (e) {
      console.error("Failed to consume item", e);
      return false;
    }
  };

  return (
    <LearningContext.Provider value={{
      worlds, activeWorldId, addWorld, updateWorld, deleteWorld, setActiveWorld,
      currentUser, login, logout,
      stats, setStats, progress, inventory, markLevelComplete, purchaseItem, consumeItem,
      bootstrapExtras,
      students, addStudent, updateStudent, updateStudentAvatar, updateStudentFrame, deleteStudent, toggleWorldAssignment, setProjectGrade,
      classrooms, addClassroom, updateClassroom, deleteClassroom, assignStudentToClassroom,
      grades, addGrade, updateGrade, deleteGrade
    }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (context === undefined) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}
