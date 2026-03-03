"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { LevelContent } from '@/types/learning-world';

export interface LearningWorld {
  id: string;
  theme: string;
  days: LevelContent[];
  title?: string;
  pedagogy?: {
    topic: string;
    pda: string;
    ejes: string[];
    grade: string;
  };
  createdAt: string;
  classrooms?: { id: string; name?: string }[];
  classroomIds?: string[];
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
}

export interface Student {
  id: string;
  name: string;
  avatar: string; // Emoji
  progress: number; // 0-100 (Overall)
  status: "active" | "idle" | "needs_help";
  lastActivity: string; // Or Date
  lives: number;
  gems: number;
  streak: number;
  xp: number;
  classroomId?: string | null;
  activeFrame?: string | null;
  studentCode?: string | null;
  assignedWorlds?: { id: string, title?: string, theme: string }[];
}

// Progress Map: studentId -> worldId -> completedLevels[]
type ProgressMap = Record<string, Record<string, number[]>>;

interface LearningContextType {
  // World Management (Teacher)
  worlds: LearningWorld[];
  activeWorldId: string | null;
  addWorld: (world: LearningWorld) => void;
  updateWorld: (world: LearningWorld) => void;
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
  purchaseItem: (studentId: string, itemId: string, cost: number) => boolean;
  consumeItem: (studentId: string, itemId: string) => Promise<boolean>;

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

  const { data: session, status } = useSession();

  // -- Persistence via Prisma APIs --
  // -- Persistence via Prisma APIs --
  useEffect(() => {
    let isMounted = true;
    const role = (session?.user as any)?.role;

    const loadData = async () => {
      if (status !== 'authenticated' || !isMounted) return;

      try {
        // Fetch Users (Students)
        let dbUsers: any[] = [];
        const usersRes = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
        if (usersRes.ok && isMounted) {
          dbUsers = await usersRes.json();
          // Map them to the Student interface 
          const mappedStudents: Student[] = dbUsers.map((u: DBUser) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar || '🧑🏻',
            status: u.status as Student['status'],
            lastActivity: 'Activo recientemente',
            progress: 0,
            lives: u.lives,
            gems: u.gems,
            streak: u.streak,
            xp: u.xp,
            classroomId: u.classroomId || null,
            activeFrame: u.activeFrame,
            studentCode: u.studentCode,
            assignedWorlds: u.assignedWorlds
          }));
          setStudents(mappedStudents);
        }

        // Fetch Worlds
        const worldsRes = await fetch(`/api/worlds?t=${Date.now()}`, { cache: 'no-store' });
        if (worldsRes.ok && isMounted) {
          const dbWorlds = await worldsRes.json();
          setWorlds(dbWorlds);
          if (dbWorlds.length > 0 && !activeWorldId) {
            setActiveWorldId(dbWorlds[0].id);
          }

          if (role === 'STUDENT') {
            const currentUserId = (session?.user as any)?.id;
            const userMatch = dbUsers?.find((u: any) => u.id === currentUserId || u.name === session?.user?.name);
            if (userMatch?.assignedWorlds?.length > 0) {
              const parsedAssignedWorlds = userMatch.assignedWorlds.map((w: any) => ({
                ...w,
                days: w.daysJson ? JSON.parse(w.daysJson) : (w.days || []),
                pedagogy: w.pedagogyJson ? JSON.parse(w.pedagogyJson) : undefined
              }));
              setWorlds(parsedAssignedWorlds);
              if (!activeWorldId && parsedAssignedWorlds.length > 0) {
                setActiveWorldId(parsedAssignedWorlds[0].id);
              }
            }
          }
        }

        // Fetch Progress and Inventory
        const progRes = await fetch(`/api/progress?t=${Date.now()}`, { cache: 'no-store' });
        if (progRes.ok && isMounted) setProgress(await progRes.json());

        const invRes = await fetch(`/api/inventory?t=${Date.now()}`, { cache: 'no-store' });
        if (invRes.ok && isMounted) setInventory(await invRes.json());
      } catch (err) {
        console.error("Failed to load initial data from DB", err);
      }
    };

    loadData();

    // Poll for fresh data every 30 seconds so students see map changes without refresh
    const interval = setInterval(loadData, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [status, session]);

  // Fetch Teacher specific data once authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user && (session.user as SessionUser).role === 'TEACHER') {
      const teacherId = (session.user as SessionUser).id;
      const fetchTeacherData = async () => {
        try {
          const classRes = await fetch(`/api/classrooms?teacherId=${teacherId}`);
          if (classRes.ok) setClassrooms(await classRes.json());

          const gradesRes = await fetch(`/api/grades?teacherId=${teacherId}`);
          if (gradesRes.ok) setGrades(await gradesRes.json());
        } catch (e) {
          console.error("Failed to load teacher data", e);
        }
      };
      fetchTeacherData();
    }
  }, [session, status]);


  // -- Actions --

  const addWorld = async (newWorld: LearningWorld) => {
    // DB Sync
    const res = await fetch('/api/worlds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWorld)
    });

    if (res.ok) {
      const savedWorld = await res.json();
      setWorlds(prev => [...prev, savedWorld]);
      if (worlds.length === 1) setActiveWorldId(savedWorld.id); // Auto select if it's the first one created
    }
  };

  const updateWorld = async (updatedWorld: LearningWorld) => {
    const res = await fetch(`/api/worlds/${updatedWorld.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedWorld)
    });
    if (res.ok) {
      const parsed = await res.json();
      setWorlds(prev => prev.map(w => w.id === parsed.id ? parsed : w));
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
      let found = students.find(s => s.id === (session.user as SessionUser)?.id || s.name === session.user?.name);

      const role = (session.user as SessionUser)?.role;
      // If the user is a teacher and wants to test the student view, impersonate Jimena
      if (!found && role === 'TEACHER') {
        found = students.find(s => s.name === 'Jimena') || students[0];
      }

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
  const addStudent = async (name: string, avatar: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar })
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
          xp: newUser.xp
        };
        setStudents(prev => [...prev, mapped]);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const updateStudent = async (id: string, name: string, avatar: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar })
      });
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, name, avatar } : s));
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
        // Parse daysJson/pedagogyJson from raw DB objects so they're usable as LearningWorld data
        const parsedWorlds = (data.assignedWorlds || []).map((w: any) => ({
          ...w,
          days: w.daysJson ? JSON.parse(w.daysJson) : (w.days || []),
          pedagogy: w.pedagogyJson ? JSON.parse(w.pedagogyJson) : undefined
        }));
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, assignedWorlds: parsedWorlds } : s));
        setCurrentUser(prev => prev && prev.id === studentId ? { ...prev, assignedWorlds: parsedWorlds } : prev);
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

  const purchaseItem = (studentId: string, itemId: string, cost: number) => {
    if (stats.gems >= cost) {
      if (itemId === "potion_life") {
        // Optimistic Life Potion
        setStats(s => ({ ...s, gems: s.gems - cost, lives: s.lives + 1 }));

        // Async DB Sync specifically for consumibles that modify stats
        fetch('/api/users/sync-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, gemsToAdd: -cost, livesToAdd: 1 })
        }).catch(console.error);

        return true;
      }

      // Standard Persistent Item (Avatar, Frame, Shield, etc)
      // Optimistic
      setStats(s => ({ ...s, gems: s.gems - cost }));
      setInventory(prev => ({
        ...prev,
        [studentId]: [...(prev[studentId] || []), itemId]
      }));
      // Async DB Sync
      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, itemId, cost })
      }).catch(console.error);

      return true;
    }
    return false;
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
      students, addStudent, updateStudent, updateStudentAvatar, updateStudentFrame, deleteStudent, toggleWorldAssignment,
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
