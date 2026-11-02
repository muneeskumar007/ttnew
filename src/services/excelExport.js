import * as XLSX from 'xlsx';
import { DAYS, DAY_PERIODS, PERIOD_TIMINGS } from '../types/constants';

// Format cell text
const getSlotDisplay = (slot, facultyMap, subjectsMap) => {
  if (!slot || !slot.subjectCode) return 'FREE';
  const sub = subjectsMap[slot.subjectCode];
  const facNames = (slot.facultyIds || [])
    .map((id) => facultyMap[id]?.name || id)
    .join(' & ');
  const typeTag = slot.type === 'lab' ? '[LAB]' : '[TH]';
  const lockTag = slot.isLocked ? (slot.isTutorHour ? '[TUTOR]' : '[LOCKED]') : '';
  return `${slot.subjectCode} ${typeTag}\n${sub?.name || ''}\nFac: ${facNames || 'N/A'}${lockTag ? ' ' + lockTag : ''}`;
};

// 1. Export Single Section Timetable to Excel
export const exportSectionToExcel = (section, timetable, subjects, faculty) => {
  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  const headers = ['Day', 'P1\n09:00-09:50', 'P2\n09:50-10:40', 'P3\n10:55-11:45', 'P4\n11:45-12:35', 'LUNCH\n12:35-01:25', 'P5\n01:25-02:15', 'P6\n02:15-03:05', 'P7\n03:05-03:55'];

  const rows = [
    [`COLLEGE TIMETABLE - ${section.name.toUpperCase()}`],
    [`Mentor / Tutor: ${facultyMap[section.mentorFacultyId]?.name || 'Not Assigned'}`],
    [],
    headers,
  ];

  DAYS.forEach((day) => {
    const dayGrid = timetable?.[day] || {};
    const row = [day];

    // P1 to P4
    for (let p = 1; p <= 4; p++) {
      row.push(getSlotDisplay(dayGrid[p], facultyMap, subjectsMap));
    }

    // Lunch
    row.push('LUNCH BREAK');

    // P5 to P7
    if (day === 'Saturday') {
      row.push('INACTIVE (HALF DAY)', 'INACTIVE (HALF DAY)', 'INACTIVE (HALF DAY)');
    } else {
      for (let p = 5; p <= 7; p++) {
        row.push(getSlotDisplay(dayGrid[p], facultyMap, subjectsMap));
      }
    }

    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, section.name.substring(0, 31));
  XLSX.writeFile(wb, `${section.name.replace(/\s+/g, '_')}_Timetable.xlsx`);
};

// 2. Export Master Grid (All Sections) to Excel
export const exportMasterGridToExcel = (sections, timetables, subjects, faculty) => {
  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));
  const wb = XLSX.utils.book_new();

  sections.forEach((sec) => {
    const timetable = timetables[sec.id] || {};
    const rows = [
      [`MASTER SCHEDULE - ${sec.name.toUpperCase()}`],
      [`Class Mentor: ${facultyMap[sec.mentorFacultyId]?.name || 'N/A'}`],
      [],
      ['Day', 'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Lunch', 'Period 5', 'Period 6', 'Period 7'],
    ];

    DAYS.forEach((day) => {
      const dayGrid = timetable[day] || {};
      const row = [day];
      for (let p = 1; p <= 4; p++) {
        row.push(getSlotDisplay(dayGrid[p], facultyMap, subjectsMap));
      }
      row.push('LUNCH BREAK');
      if (day === 'Saturday') {
        row.push('INACTIVE', 'INACTIVE', 'INACTIVE');
      } else {
        for (let p = 5; p <= 7; p++) {
          row.push(getSlotDisplay(dayGrid[p], facultyMap, subjectsMap));
        }
      }
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = Array(9).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, ws, sec.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 31));
  });

  XLSX.writeFile(wb, 'Department_Master_Timetables.xlsx');
};

// 3. Export Faculty Workload Sheets
export const exportFacultyWorkloadToExcel = (faculty, timetables, subjects, sections) => {
  const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    ['FACULTY WORKLOAD SUMMARY MATRIX'],
    [],
    ['Faculty ID', 'Faculty Name', 'Department', 'Max Allowed Hours', 'Internal Dept Hours', 'Other Dept Locked Hours', 'Total Load Hours', 'Status'],
  ];

  faculty.forEach((fac) => {
    let deptHours = 0;
    // Count internal hours
    Object.values(timetables).forEach((secGrid) => {
      DAYS.forEach((d) => {
        const maxP = DAY_PERIODS[d];
        for (let p = 1; p <= maxP; p++) {
          const slot = secGrid[d]?.[p];
          if (slot && slot.facultyIds && slot.facultyIds.includes(fac.id)) {
            deptHours++;
          }
        }
      });
    });

    const externalHours = fac.lockedSlots?.length || 0;
    const totalLoad = deptHours + externalHours;
    const status = totalLoad > fac.maxHours ? 'OVERLOAD' : totalLoad === fac.maxHours ? 'OPTIMAL' : 'AVAILABLE';

    summaryRows.push([
      fac.id,
      fac.name,
      fac.department,
      fac.maxHours,
      deptHours,
      externalHours,
      totalLoad,
      status,
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Workload Summary');

  XLSX.writeFile(wb, 'Faculty_Workload_Sheets.xlsx');
};

// 4. Export Free Faculty Report
export const exportFreeFacultyReportToExcel = (day, period, freeFaculty, busyFaculty) => {
  const rows = [
    [`FACULTY AVAILABILITY REPORT: ${day.toUpperCase()} - PERIOD ${period}`],
    [],
    ['FREE / AVAILABLE FACULTY (READY FOR SUBSTITUTION)'],
    ['Faculty ID', 'Name', 'Department', 'Current Weekly Load'],
  ];

  freeFaculty.forEach((f) => {
    rows.push([f.id, f.name, f.department, `${f.currentLoad} / ${f.maxHours} Hours`]);
  });

  rows.push([]);
  rows.push(['BUSY / COMMITTED FACULTY']);
  rows.push(['Faculty ID', 'Name', 'Department', 'Commitment Details']);

  busyFaculty.forEach((f) => {
    rows.push([f.id, f.name, f.department, f.reason || 'Teaching Class']);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 35 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Free Faculty Report');
  XLSX.writeFile(wb, `Free_Faculty_${day}_P${period}.xlsx`);
};
