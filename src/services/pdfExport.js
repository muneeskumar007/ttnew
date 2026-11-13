import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS, DAY_PERIODS, getSubjectAcronym } from '../types/constants';

// Helper to extract clean metadata for a section matching user's uploaded template
const getSectionMeta = (section) => {
  const name = section.name || section.id;
  let secLetter = 'A';
  const matchLetter = name.match(/Section\s+([A-Za-z])/i) || section.id.match(/-(\d+)?([A-Za-z])/);
  if (matchLetter) {
    secLetter = (matchLetter[1] || matchLetter[2]).toUpperCase();
  }

  const romanYearMap = {
    1: 'I/I',
    2: 'II/III',
    3: 'III/V',
    4: 'IV/VII',
  };
  const yearSem = `${romanYearMap[section.year] || 'II/III'} ${secLetter} SEC`;

  const defaultRooms = {
    '2_A': '114',
    '2_B': '115',
    '2_C': '116',
    '3_A': '109',
    '3_B': '110',
    '3_C': '113',
    '4_A': '103',
    '4_B': '104',
    '4_C': '107',
  };
  const key = `${section.year}_${secLetter}`;
  const roomNo = section.roomNo || defaultRooms[key] || `1${section.year}${secLetter.charCodeAt(0) - 64}`;

  return { secLetter, yearSem, roomNo };
};

// Helper to get formatted cell acronym
const getCellAcronym = (slot, subjectsMap) => {
  if (!slot || !slot.subjectCode) return '';
  const sub = subjectsMap[slot.subjectCode];
  const name = sub?.name || slot.subjectName || slot.subjectCode;
  let acronym = getSubjectAcronym(name, slot.subjectCode);
  if (slot.type === 'lab' && !acronym.toLowerCase().includes('lab')) {
    acronym += ' LAB';
  }
  return acronym;
};

// Helper to build the 6-day timetable body with merged lab colSpans
const buildSectionGridBody = (timetable, subjectsMap, facultyMap) => {
  const body = [];

  DAYS.forEach((day) => {
    const dayUpper = day.toUpperCase();
    const dayGrid = timetable[day] || {};
    const row = [dayUpper];

    const p1 = dayGrid[1];
    const p2 = dayGrid[2];
    const p3 = dayGrid[3];
    const p4 = dayGrid[4];

    // Check for continuous 3-period or 2-period morning lab blocks
    const isLab123 = p1 && p2 && p3 && p1.subjectCode && p1.subjectCode === p2.subjectCode && p2.subjectCode === p3.subjectCode && p1.type === 'lab';
    const isLab234 = p2 && p3 && p4 && p2.subjectCode && p2.subjectCode === p3.subjectCode && p3.subjectCode === p4.subjectCode && p2.type === 'lab';
    const isBlock12 = p1 && p2 && p1.subjectCode && p1.subjectCode === p2.subjectCode;
    const isBlock34 = p3 && p4 && p3.subjectCode && p3.subjectCode === p4.subjectCode && (p3.type === 'lab' || isBlock12);

    if (isLab123) {
      row.push({ content: getCellAcronym(p1, subjectsMap), colSpan: 3, styles: { fontStyle: 'bold' } });
      row.push(getCellAcronym(p4, subjectsMap));
    } else if (isLab234) {
      row.push(getCellAcronym(p1, subjectsMap));
      row.push({ content: getCellAcronym(p2, subjectsMap), colSpan: 3, styles: { fontStyle: 'bold' } });
    } else if (isBlock12 && isBlock34) {
      row.push({ content: getCellAcronym(p1, subjectsMap), colSpan: 2, styles: { fontStyle: 'bold' } });
      row.push({ content: getCellAcronym(p3, subjectsMap), colSpan: 2, styles: { fontStyle: 'bold' } });
    } else if (isBlock12) {
      row.push({ content: getCellAcronym(p1, subjectsMap), colSpan: 2, styles: { fontStyle: 'bold' } });
      row.push(getCellAcronym(p3, subjectsMap));
      row.push(getCellAcronym(p4, subjectsMap));
    } else if (isBlock34) {
      row.push(getCellAcronym(p1, subjectsMap));
      row.push(getCellAcronym(p2, subjectsMap));
      row.push({ content: getCellAcronym(p3, subjectsMap), colSpan: 2, styles: { fontStyle: 'bold' } });
    } else {
      row.push(getCellAcronym(p1, subjectsMap));
      row.push(getCellAcronym(p2, subjectsMap));
      row.push(getCellAcronym(p3, subjectsMap));
      row.push(getCellAcronym(p4, subjectsMap));
    }

    // Lunch Break column
    row.push({ content: '', colSpan: 1, styles: { fillColor: [248, 250, 252] } });

    // Afternoon session (P5 to P7)
    if (day === 'Saturday') {
      row.push({ content: '', colSpan: 3, styles: { fillColor: [248, 250, 252] } });
    } else {
      const p5 = dayGrid[5];
      const p6 = dayGrid[6];
      const p7 = dayGrid[7];

      const isLab567 = p5 && p6 && p7 && p5.subjectCode && p5.subjectCode === p6.subjectCode && p6.subjectCode === p7.subjectCode && p5.type === 'lab';
      const isBlock56 = p5 && p6 && p5.subjectCode && p5.subjectCode === p6.subjectCode && p5.type === 'lab';

      if (isLab567) {
        row.push({ content: getCellAcronym(p5, subjectsMap), colSpan: 3, styles: { fontStyle: 'bold' } });
      } else if (isBlock56) {
        row.push({ content: getCellAcronym(p5, subjectsMap), colSpan: 2, styles: { fontStyle: 'bold' } });
        row.push(getCellAcronym(p7, subjectsMap));
      } else {
        row.push(getCellAcronym(p5, subjectsMap));
        row.push(getCellAcronym(p6, subjectsMap));
        row.push(getCellAcronym(p7, subjectsMap));
      }
    }

    body.push(row);
  });

  return body;
};

// Helper to extract clean subject and faculty list for a section
const extractSectionSubjectList = (timetable, subjectsMap, facultyMap, section) => {
  const map = new Map();

  DAYS.forEach((day) => {
    const maxP = DAY_PERIODS[day];
    for (let p = 1; p <= maxP; p++) {
      const slot = timetable[day]?.[p];
      if (slot && slot.subjectCode) {
        if (!map.has(slot.subjectCode)) {
          const sub = subjectsMap[slot.subjectCode];
          const facNames = (slot.facultyIds || []).map((id) => {
            const raw = facultyMap[id]?.name || id;
            return raw.startsWith('Dr.') || raw.startsWith('Prof.') ? raw : `Prof.${raw}`;
          });
          map.set(slot.subjectCode, {
            code: slot.subjectCode,
            name: (sub?.name || slot.subjectName || slot.subjectCode).toUpperCase(),
            facultyName: facNames.join(' / ') || 'Unassigned',
            type: slot.type || 'theory',
          });
        }
      }
    }
  });

  const list = Array.from(map.values());
  list.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'theory' ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  const mentor = facultyMap[section?.mentorFacultyId];
  const mentorName = mentor?.name
    ? mentor.name.startsWith('Dr.') || mentor.name.startsWith('Prof.')
      ? mentor.name
      : `Prof.${mentor.name}`
    : 'Faculty Incharge';

  list.push({
    code: '',
    name: 'LIBRARY',
    facultyName: mentorName,
    type: 'library',
  });

  return list;
};

// Helper to render one official section page
const renderOfficialSectionPage = (doc, section, timetable, subjectsMap, facultyMap) => {
  const { yearSem, roomNo } = getSectionMeta(section);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Institution Header
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);

  // Line 1: College Title & Academic Year
  doc.text('ADHIYAMAAN COLLEGE OF ENGINEERING (An Autonomous Institution)', 14, 13);
  doc.text('AY: 2026-2027', pageWidth - 14, 13, { align: 'right' });

  // Line 2: Document Title
  doc.setFontSize(12);
  doc.text('CLASS TIME TABLE (WEEK PLAN)', pageWidth / 2, 20, { align: 'center' });

  // Line 3: Meta bar
  doc.setFontSize(10);
  const programText = `PROGRAM:  B.E-${section.department || 'CSE'}`;
  const yearSemText = `Year/Semester:${yearSem}`;
  const roomText = `Room No:  ${roomNo}`;

  doc.text(programText, 14, 27);
  doc.text(yearSemText, pageWidth / 2, 27, { align: 'center' });
  doc.text(roomText, pageWidth - 14, 27, { align: 'right' });

  // 2. Main Timetable Grid
  const head = [
    [
      'DAY /PERIOD',
      '1  8.30am-9.25am',
      '2  9.25am-  10.20am',
      '3  10.30am-11.25am',
      '4  11.25am-12.20Pm',
      'Lunch  break',
      '5  1.20pm-2.15pm',
      '6  2.15pm-3.10pm',
      '7  3.10pm-4.05pm',
    ],
  ];

  const body = buildSectionGridBody(timetable, subjectsMap, facultyMap);

  autoTable(doc, {
    startY: 31,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      textColor: [0, 0, 0],
      font: 'times',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 28 },
      5: { fillColor: [248, 250, 252], width: 14 },
    },
    margin: { left: 14, right: 14 },
  });

  const timetableFinalY = doc.lastAutoTable.finalY;

  // 3. Subject Code | Subject | Faculty Name Table
  const subjectList = extractSectionSubjectList(timetable, subjectsMap, facultyMap, section);
  const subjectHead = [['Subject code', 'Subject', 'Faculty Name']];
  const subjectBody = subjectList.map((item) => [
    item.code || '',
    item.name || '',
    item.facultyName || '',
  ]);

  autoTable(doc, {
    startY: timetableFinalY + 4,
    head: subjectHead,
    body: subjectBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      font: 'times',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 34 },
      1: { width: 140 },
      2: { width: 95 },
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Signatures Row at the bottom
  const sigY = pageHeight - 8;
  doc.setFontSize(9.5);
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);

  const sigCols = [
    { title: 'Class Advisor', x: 25 },
    { title: 'Time Table Incharge', x: 80 },
    { title: 'HOD', x: 148 },
    { title: 'Dean (Academics)', x: 206 },
    { title: 'Principal', x: 268 },
  ];

  sigCols.forEach((sig) => {
    doc.text(sig.title, sig.x, sigY, { align: 'center' });
  });
};

// 1. Export All Sections Timetable to PDF (Consolidated single-click download in exact uploaded format)
export const exportAllSectionsToPdf = (sections, timetables, subjects, faculty) => {
  if (!sections || sections.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  sections.forEach((section, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'landscape');
    }
    const timetable = timetables[section.id] || {};
    renderOfficialSectionPage(doc, section, timetable, subjectsMap, facultyMap);
  });

  doc.save('Overall_All_Sections_Timetable.pdf');
};

// 2. Export All Faculty Timetables to PDF (Consolidated single-click download)
export const exportAllFacultyToPdf = (faculty, timetables, subjects, sections) => {
  if (!faculty || faculty.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));
  const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  faculty.forEach((facultyMember, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'landscape');
    }

    let internalHours = 0;
    const externalHours = facultyMember.lockedSlots?.length || 0;
    const subjectsTaughtMap = {};

    DAYS.forEach((day) => {
      const maxP = DAY_PERIODS[day];
      for (let p = 1; p <= maxP; p++) {
        Object.entries(timetables).forEach(([secId, secGrid]) => {
          const slot = secGrid[day]?.[p];
          if (slot && slot.facultyIds && slot.facultyIds.includes(facultyMember.id)) {
            internalHours++;
            const key = `${slot.subjectCode}_${secId}`;
            if (!subjectsTaughtMap[key]) {
              const sub = subjectsMap[slot.subjectCode];
              subjectsTaughtMap[key] = {
                code: slot.subjectCode,
                name: sub?.name || slot.subjectName || slot.subjectCode,
                sectionName: sectionsMap[secId]?.name || secId,
                type: slot.type === 'lab' ? 'Laboratory' : 'Theory',
                hours: 0,
              };
            }
            subjectsTaughtMap[key].hours++;
          }
        });
      }
    });

    const totalLoad = internalHours + externalHours;

    // Header & Title Block
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text(`ADHIYAMAAN COLLEGE OF ENGINEERING - FACULTY SCHEDULE`, 14, 13);
    doc.setFontSize(11);
    doc.text('AY: 2026-2027', pageWidth - 14, 13, { align: 'right' });

    doc.setFontSize(13);
    doc.text(`FACULTY: ${facultyMember.name.toUpperCase()} (${facultyMember.department})`, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9.5);
    doc.setFont('times', 'normal');
    doc.text(`Faculty ID: ${facultyMember.id}  |  Designation: ${facultyMember.designation || 'Faculty'}`, 14, 27);
    doc.text(`Total Weekly Load: ${totalLoad}/${facultyMember.maxHours || 20} Hours`, pageWidth - 14, 27, { align: 'right' });

    // Grid Columns & Head
    const head = [
      [
        'Day',
        'Period 1\n09:00 - 09:50',
        'Period 2\n09:50 - 10:40',
        'Period 3\n10:55 - 11:45',
        'Period 4\n11:45 - 12:35',
        'LUNCH\n12:35 - 01:25',
        'Period 5\n01:25 - 02:15',
        'Period 6\n02:15 - 03:05',
        'Period 7\n03:05 - 03:55',
      ],
    ];

    const body = [];
    DAYS.forEach((day) => {
      const row = [day];

      const getCellContent = (p) => {
        const commitments = [];
        if (facultyMember.lockedSlots) {
          const ext = facultyMember.lockedSlots.find(
            (ls) => ls.day === day && Number(ls.period) === Number(p)
          );
          if (ext) {
            commitments.push(`[LOCKED]\n${ext.dept} Dept Load`);
          }
        }
        Object.entries(timetables).forEach(([secId, secGrid]) => {
          const slot = secGrid[day]?.[p];
          if (slot && slot.facultyIds && slot.facultyIds.includes(facultyMember.id)) {
            const sub = subjectsMap[slot.subjectCode];
            const acronym = getSubjectAcronym(sub?.name || slot.subjectName || slot.subjectCode, slot.subjectCode);
            const secName = sectionsMap[secId]?.name || secId;
            const tag = slot.type === 'lab' ? '[LAB]' : '[TH]';
            commitments.push(`${slot.subjectCode} (${acronym}) ${tag}\n${secName}`);
          }
        });
        if (commitments.length === 0) return 'FREE';
        return commitments.join('\n---\n');
      };

      for (let p = 1; p <= 4; p++) {
        row.push(getCellContent(p));
      }

      row.push('LUNCH\nBREAK');

      if (day === 'Saturday') {
        row.push('INACTIVE', 'INACTIVE', 'INACTIVE');
      } else {
        for (let p = 5; p <= 7; p++) {
          row.push(getCellContent(p));
        }
      }

      body.push(row);
    });

    autoTable(doc, {
      startY: 31,
      head: head,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
        lineColor: [203, 213, 225],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 22 },
        5: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold', width: 14 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index !== 0 && data.column.index !== 5) {
          const text = data.cell.text.join(' ');
          if (text.includes('[LOCKED]')) {
            data.cell.styles.fillColor = [255, 241, 242];
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fontStyle = 'bold';
          } else if (text !== 'FREE' && !text.includes('INACTIVE')) {
            data.cell.styles.fillColor = [238, 242, 255];
            data.cell.styles.textColor = [30, 27, 75];
            data.cell.styles.fontStyle = 'bold';
          } else if (text === 'FREE') {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      },
    });

    // Workload breakdown table
    const subjectList = Object.values(subjectsTaughtMap);
    const summaryStartY = doc.lastAutoTable.finalY + 4;

    if (subjectList.length > 0 && summaryStartY < 170) {
      doc.setFontSize(8.5);
      doc.setFont('times', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Teaching Load Breakdown:', 14, summaryStartY);

      const summaryHead = [['Subject Code', 'Subject Title', 'Class Section', 'Type', 'Weekly Hours']];
      const summaryBody = subjectList.map((item) => [
        item.code,
        item.name,
        item.sectionName,
        item.type,
        `${item.hours} hrs/week`,
      ]);

      summaryBody.push([
        'TOTAL',
        `Teaching: ${internalHours}h Internal + ${externalHours}h Other Dept = ${totalLoad}h`,
        '',
        '',
        `${totalLoad} / ${facultyMember.maxHours || 20} hrs`,
      ]);

      autoTable(doc, {
        startY: summaryStartY + 2,
        head: summaryHead,
        body: summaryBody,
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    // Signatures
    const sigY = pageHeight - 8;
    doc.setFontSize(8.5);
    doc.setFont('times', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Faculty Member Signature', 30, sigY, { align: 'center' });
    doc.text('Timetable Coordinator', 148, sigY, { align: 'center' });
    doc.text('HOD / Dean Approval', 250, sigY, { align: 'center' });
  });

  doc.save('Overall_All_Faculty_Timetables.pdf');
};

// 3. Export Single Section Timetable (Legacy helper)
export const exportSectionToPdf = (section, timetable, subjects, faculty) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  renderOfficialSectionPage(doc, section, timetable, subjectsMap, facultyMap);
  doc.save(`${section.name.replace(/\s+/g, '_')}_Timetable.pdf`);
};

// 4. Export Faculty Workload Matrix
export const exportFacultyWorkloadToPdf = (faculty, timetables, sections) => {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('Faculty Teaching Workload Matrix', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Department Load Summary & Collision Analysis - ${new Date().toLocaleDateString()}`, 14, 22);

  const head = [['Faculty ID', 'Faculty Name', 'Dept', 'Max Hrs', 'Internal Load', 'Locked Ext.', 'Total Load', 'Status']];
  const body = [];

  faculty.forEach((fac) => {
    let deptHours = 0;
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

    body.push([
      fac.id,
      fac.name,
      fac.department,
      `${fac.maxHours}h`,
      `${deptHours}h`,
      `${externalHours}h`,
      `${totalLoad}h`,
      status,
    ]);
  });

  autoTable(doc, {
    startY: 28,
    head: head,
    body: body,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.save('Faculty_Workload_Report.pdf');
};

// 5. Export Free Faculty Report
export const exportFreeFacultyToPdf = (day, period, freeFaculty, busyFaculty) => {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`Free Faculty Substitution Report`, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Slot: ${day} - Period ${period} | Report Generated: ${new Date().toLocaleTimeString()}`, 14, 22);

  // Free faculty table
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105);
  doc.text('Available Faculty (0 Active Teaching Commitments)', 14, 32);

  const headFree = [['Faculty ID', 'Name', 'Department', 'Weekly Workload']];
  const bodyFree = freeFaculty.map((f) => [
    f.id,
    f.name,
    f.department,
    `${f.currentLoad} / ${f.maxHours} Hours`,
  ]);

  autoTable(doc, {
    startY: 36,
    head: headFree,
    body: bodyFree.length ? bodyFree : [['-', 'No faculty free in this slot', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105] },
  });

  const finalY = doc.lastAutoTable.finalY + 12;

  // Busy faculty table
  doc.setFontSize(12);
  doc.setTextColor(225, 29, 72);
  doc.text('Busy Faculty (Currently Engaged)', 14, finalY);

  const headBusy = [['Faculty ID', 'Name', 'Department', 'Reason / Class']];
  const bodyBusy = busyFaculty.map((f) => [
    f.id,
    f.name,
    f.department,
    f.reason || 'Teaching Class',
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: headBusy,
    body: bodyBusy,
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72] },
  });

  doc.save(`Free_Faculty_${day}_P${period}.pdf`);
};

// 6. Export Selected Individual Faculty Timetable
export const exportSelectedFacultyTimetableToPdf = (facultyMember, timetables, subjects, sections) => {
  exportAllFacultyToPdf([facultyMember], timetables, subjects, sections);
};
