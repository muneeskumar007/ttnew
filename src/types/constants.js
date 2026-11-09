// Days of the week
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Working days with period counts
export const DAY_PERIODS = {
  Monday: 7,
  Tuesday: 7,
  Wednesday: 7,
  Thursday: 7,
  Friday: 7,
  Saturday: 4 // Periods 5, 6, 7 are strictly disabled
};

export const TOTAL_WEEKLY_PERIODS = 39; // (5 * 7) + 4

// Standard timings for college periods
export const PERIOD_TIMINGS = [
  { period: 1, label: 'Period 1', time: '09:00 - 09:50 AM', session: 'Morning' },
  { period: 2, label: 'Period 2', time: '09:50 - 10:40 AM', session: 'Morning' },
  { period: 3, label: 'Period 3', time: '10:55 - 11:45 AM', session: 'Morning' },
  { period: 4, label: 'Period 4', time: '11:45 - 12:35 PM', session: 'Morning' },
  { period: 'LUNCH', label: 'Lunch Break', time: '12:35 - 01:25 PM', isBreak: true },
  { period: 5, label: 'Period 5', time: '01:25 - 02:15 PM', session: 'Afternoon' },
  { period: 6, label: 'Period 6', time: '02:15 - 03:05 PM', session: 'Afternoon' },
  { period: 7, label: 'Period 7', time: '03:05 - 03:55 PM', session: 'Afternoon' },
];

export const YEARS = [1, 2, 3, 4];

export const YEAR_LABELS = {
  1: '1st Year (B.Tech)',
  2: '2nd Year (B.Tech)',
  3: '3rd Year (B.Tech)',
  4: '4th Year (B.Tech)'
};

// Vibrant, distinct color palettes for subjects (Same subject = same background tint + 2px solid border)
export const SUBJECT_PALETTES = [
  { id: 'indigo', bg: '#e0e7ff', border: '#4f46e5', text: '#312e81', badge: 'bg-indigo-100 text-indigo-800 border-indigo-500' },
  { id: 'emerald', bg: '#d1fae5', border: '#059669', text: '#064e3b', badge: 'bg-emerald-100 text-emerald-800 border-emerald-500' },
  { id: 'amber', bg: '#fef3c7', border: '#d97706', text: '#78350f', badge: 'bg-amber-100 text-amber-800 border-amber-500' },
  { id: 'rose', bg: '#ffe4e6', border: '#e11d48', text: '#881337', badge: 'bg-rose-100 text-rose-800 border-rose-500' },
  { id: 'sky', bg: '#e0f2fe', border: '#0284c7', text: '#0c4a6e', badge: 'bg-sky-100 text-sky-800 border-sky-500' },
  { id: 'purple', bg: '#f3e8ff', border: '#9333ea', text: '#581c87', badge: 'bg-purple-100 text-purple-800 border-purple-500' },
  { id: 'teal', bg: '#ccfbf1', border: '#0d9488', text: '#134e4a', badge: 'bg-teal-100 text-teal-800 border-teal-500' },
  { id: 'orange', bg: '#ffedd5', border: '#ea580c', text: '#7c2d12', badge: 'bg-orange-100 text-orange-800 border-orange-500' },
  { id: 'cyan', bg: '#cffafe', border: '#0891b2', text: '#164e63', badge: 'bg-cyan-100 text-cyan-800 border-cyan-500' },
  { id: 'fuchsia', bg: '#fae8ff', border: '#c026d3', text: '#701a75', badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-500' },
  { id: 'lime', bg: '#ecfccb', border: '#65a30d', text: '#365314', badge: 'bg-lime-100 text-lime-800 border-lime-500' },
  { id: 'blue', bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a', badge: 'bg-blue-100 text-blue-800 border-blue-500' },
];

export const STEP_NAMES = [
  { id: 1, key: 'faculty', label: '1. Faculty', desc: 'CRUD & External Locked Hours' },
  { id: 2, key: 'subjects', label: '2. Curriculum', desc: '1st - 4th Year Subjects' },
  { id: 3, key: 'sections', label: '3. Sections', desc: 'Classes & Mentor Allocation' },
  { id: 4, key: 'allocation', label: '4. Faculty Mapping', desc: 'Subject-Teacher Assignment' },
  { id: 5, key: 'prefixing', label: '5. Prefix & Tally', desc: 'Lock Slots & 39h Gatekeeper' },
  { id: 6, key: 'generate', label: '6. CSP Generator', desc: 'Constraint Backtracking Engine' },
  { id: 7, key: 'timetable', label: '7. Timetable Grid', desc: 'Display & Drag-and-Swap' },
  { id: 8, key: 'workload', label: '8. Faculty Matrix', desc: 'Weekly Box View & Load' },
  { id: 9, key: 'free-faculty', label: '9. Free Faculty', desc: 'Substitution & Free Hours' },
  { id: 10, key: 'export', label: '10. Export', desc: 'Excel (.xlsx) & PDF Reports' },
];

/**
 * Generates clean subject acronyms from subject names:
 * E.g. "Data Structures" -> "DS"
 * E.g. "Object Oriented Programming" -> "OOP"
 * E.g. "Operating Systems" -> "OS"
 * E.g. "Discrete Mathematics" -> "DM"
 */
export const getSubjectAcronym = (name, code = '') => {
  if (!name) return code || '';
  const trimmed = name.trim();
  if (trimmed.length <= 4 && !trimmed.includes(' ')) return trimmed;

  const isLab = /\b(lab|laboratory)\b/i.test(trimmed);
  const cleanName = trimmed.replace(/\b(laboratory|lab)\b/gi, '').trim();

  const stopWords = new Set(['and', 'with', 'of', 'in', 'for', 'the', 'to', 'on', 'at', 'by', 'a', 'an', '&']);
  const words = cleanName
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return isLab ? 'LAB' : code;
  if (words.length === 1) {
    const single = words[0].length <= 4 ? words[0].toUpperCase() : words[0].slice(0, 3).toUpperCase();
    return isLab ? `${single} LAB` : single;
  }

  const significantWords = words.filter((w) => !stopWords.has(w.toLowerCase()));
  const targetWords = significantWords.length >= 2 ? significantWords : words;
  const acronym = targetWords.map((w) => w[0].toUpperCase()).join('');
  return isLab ? `${acronym} LAB` : acronym;
};
