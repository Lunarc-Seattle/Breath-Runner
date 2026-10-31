/**
 * Type declarations for AppContext.jsx so .tsx consumers get proper types
 * without converting the full context to TypeScript.
 */
import type { JSX, ReactNode } from 'react';

export interface TrainingMap {
  id: string;
  name: string;
  kpa: number;
  targetL: number;
  color: string;
  unlocked: boolean;
  tag: string;
  desc: string;
}

export interface LastMap {
  id: string;
  name: string;
  progressPct: number;
  lastPlayed: string;
  valveKpa: number;
  targetL: number;
  stars: number;
}

export interface Friend {
  name: string;
  initials: string;
  tone: string;
  coins: number;
}

export interface HygienePart {
  part: string;
  clean: number;
  state: string;
}

export interface AppState {
  userName: string;
  userRole: string;
  hospital: string;
  enrolledDate: string;
  birthDate: string;
  email: string;
  phone: string;
  bleConnected: boolean;
  bleScanning: boolean;
  bleError: string | null;
  batteryPct: number | null;
  deviceName: string | null;
  lastMap: LastMap;
  maps: TrainingMap[];
  friendsThisWeek: Friend[];
  hygiene: { daysSince: number; cleanPct: number; parts: HygienePart[] };
  disinfectionBooking: { date: Date; slot: string } | null;
  scheduleTasks: { id: string; time: string; title: string; done: boolean }[];
  spirometryLogs: { date: string; fvc: number; fev1: number; pef: number; ratio: string }[];
}

export interface Trainer {
  pair: () => void;
  disconnect: () => void;
}

export interface AppContextValue {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  toast: string | null;
  notify: (message: string) => void;
  navigate: (slug: string) => void;
  selectMap: (map: TrainingMap, play?: boolean) => void;
  trainer: Trainer;
}

export function AppProvider(props: { navigate: (slug: string) => void; children: ReactNode }): JSX.Element;
export function useApp(): AppContextValue;
