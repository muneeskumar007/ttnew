import { SUBJECT_PALETTES } from '../types/constants';

// Clean initial empty slate so the user puts everything manually!
export const INITIAL_DEPARTMENT = 'Computer Science & Engineering';
export const INITIAL_FACULTY = [];
export const INITIAL_SUBJECTS = [];
export const INITIAL_SECTIONS = [];
export const INITIAL_ALLOCATIONS = {};
export const INITIAL_PREFIXED_SLOTS = {};

// Optional Demo Template (loaded only if user clicks "Load Sample" for reference)
export const DEMO_DEPARTMENT = 'Computer Science & Engineering';

export const DEMO_FACULTY = [
  {
    id: 'FAC-01',
    name: 'Dr. Anand Sharma',
    department: 'CSE',
    designation: 'Professor & HOD',
    maxHours: 18,
    lockedSlots: [
      { day: 'Tuesday', period: 2, dept: 'ECE', reason: 'Microprocessors Guest Load' },
      { day: 'Thursday', period: 4, dept: 'ECE', reason: 'VLSI Inter-Dept Lecture' },
    ],
  },
  {
    id: 'FAC-02',
    name: 'Dr. Priya Sundaram',
    department: 'CSE',
    designation: 'Associate Professor',
    maxHours: 20,
    lockedSlots: [
      { day: 'Wednesday', period: 3, dept: 'IT', reason: 'Advanced Algorithms Shared Load' },
    ],
  },
  {
    id: 'FAC-03',
    name: 'Prof. Rajesh Iyer',
    department: 'CSE',
    designation: 'Associate Professor',
    maxHours: 20,
    lockedSlots: [
      { day: 'Monday', period: 4, dept: 'MECH', reason: 'CAD/CAM Computational Lab' },
    ],
  },
  {
    id: 'FAC-04',
    name: 'Dr. Sunita Verma',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [
      { day: 'Friday', period: 1, dept: 'EEE', reason: 'Embedded Systems Lecture' },
      { day: 'Friday', period: 2, dept: 'EEE', reason: 'Embedded Systems Lecture' },
    ],
  },
  {
    id: 'FAC-05',
    name: 'Prof. Vikram Malhotra',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [],
  },
  {
    id: 'FAC-06',
    name: 'Dr. Kavita Nair',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [
      { day: 'Thursday', period: 6, dept: 'AIML', reason: 'Neural Networks Cross-Dept' },
    ],
  },
  {
    id: 'FAC-07',
    name: 'Prof. Manoj Deshmukh',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [],
  },
  {
    id: 'FAC-08',
    name: 'Prof. Deepa Krishnan',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [],
  },
  {
    id: 'FAC-09',
    name: 'Prof. Karthik Raman',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [],
  },
  {
    id: 'FAC-10',
    name: 'Prof. Shalini Gupta',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 22,
    lockedSlots: [],
  },
];

export const DEMO_SUBJECTS = [
  // 2nd Year (B.Tech) - Exactly 39 Hours: 27 Theory + 12 Lab
  {
    code: 'CS201',
    name: 'Data Structures & Algorithms',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 3,
    isLab: false,
    colorId: 'indigo',
  },
  {
    code: 'CS202',
    name: 'Computer Organization & Architecture',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 0,
    isLab: false,
    colorId: 'emerald',
  },
  {
    code: 'CS203',
    name: 'Discrete Mathematics',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 0,
    isLab: false,
    colorId: 'sky',
  },
  {
    code: 'CS204',
    name: 'Object Oriented Programming with Java',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 3,
    isLab: false,
    colorId: 'amber',
  },
  {
    code: 'CS205',
    name: 'Software Engineering Principles',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 0,
    isLab: false,
    colorId: 'rose',
  },
  {
    code: 'CS206',
    name: 'Database Management Systems',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 3,
    isLab: false,
    colorId: 'purple',
  },
  {
    code: 'CS207',
    name: 'Web Technology Laboratory',
    year: 2,
    department: 'CSE',
    theoryHours: 0,
    labHours: 3,
    isLab: true,
    colorId: 'cyan',
  },
  {
    code: 'CS208',
    name: 'Class Tutor & Academic Mentoring',
    year: 2,
    department: 'CSE',
    theoryHours: 3,
    labHours: 0,
    isLab: false,
    colorId: 'teal',
  },
];

export const DEMO_SECTIONS = [
  { id: 'SEC-2A', year: 2, name: 'Year 2 - Section A', mentorFacultyId: 'FAC-02' },
  { id: 'SEC-2B', year: 2, name: 'Year 2 - Section B', mentorFacultyId: 'FAC-05' },
];

export const DEMO_ALLOCATIONS = {
  'SEC-2A': {
    CS201: { theoryFaculty: 'FAC-01', labFaculty: ['FAC-01', 'FAC-05'] },
    CS202: { theoryFaculty: 'FAC-03', labFaculty: [] },
    CS203: { theoryFaculty: 'FAC-04', labFaculty: [] },
    CS204: { theoryFaculty: 'FAC-02', labFaculty: ['FAC-02', 'FAC-07'] },
    CS205: { theoryFaculty: 'FAC-06', labFaculty: [] },
    CS206: { theoryFaculty: 'FAC-07', labFaculty: ['FAC-07', 'FAC-09'] },
    CS207: { theoryFaculty: null, labFaculty: ['FAC-08', 'FAC-10'] },
    CS208: { theoryFaculty: 'FAC-02', labFaculty: [] },
  },
  'SEC-2B': {
    CS201: { theoryFaculty: 'FAC-05', labFaculty: ['FAC-05', 'FAC-01'] },
    CS202: { theoryFaculty: 'FAC-03', labFaculty: [] },
    CS203: { theoryFaculty: 'FAC-09', labFaculty: [] },
    CS204: { theoryFaculty: 'FAC-02', labFaculty: ['FAC-02', 'FAC-08'] },
    CS205: { theoryFaculty: 'FAC-06', labFaculty: [] },
    CS206: { theoryFaculty: 'FAC-07', labFaculty: ['FAC-07', 'FAC-04'] },
    CS207: { theoryFaculty: null, labFaculty: ['FAC-10', 'FAC-08'] },
    CS208: { theoryFaculty: 'FAC-05', labFaculty: [] },
  },
};

export const DEMO_PREFIXED_SLOTS = {
  'SEC-2A': {
    Monday: {
      1: { type: 'theory', subjectCode: 'CS208', isLocked: true, isTutorHour: true },
    },
    Wednesday: {
      5: { type: 'lab', subjectCode: 'CS201', isLocked: true, labBlockId: 'CS201_WED_PM' },
      6: { type: 'lab', subjectCode: 'CS201', isLocked: true, labBlockId: 'CS201_WED_PM' },
      7: { type: 'lab', subjectCode: 'CS201', isLocked: true, labBlockId: 'CS201_WED_PM' },
    },
    Friday: {
      2: { type: 'lab', subjectCode: 'CS206', isLocked: true, labBlockId: 'CS206_FRI_AM' },
      3: { type: 'lab', subjectCode: 'CS206', isLocked: true, labBlockId: 'CS206_FRI_AM' },
      4: { type: 'lab', subjectCode: 'CS206', isLocked: true, labBlockId: 'CS206_FRI_AM' },
    },
    Tuesday: {
      1: { type: 'theory', subjectCode: 'CS203', isLocked: true },
    },
    Thursday: {
      3: { type: 'theory', subjectCode: 'CS205', isLocked: true },
    },
  },
};
