import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS, DAY_PERIODS, getSubjectAcronym } from '../types/constants';

export const exportSectionToPdf = (section, timetable, subjects, faculty) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  // Title & Header
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`College Timetable - ${section.name}`, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Class Mentor / Tutor: ${facultyMap[section.mentorFacultyId]?.name || 'Unassigned'}  |  Generated on ${new Date().toLocaleDateString()}`,
    14,
    22
  );

  const head = [
    [
      'Day',
      'Period 1\n09:00-09:50',
      'Period 2\n09:50-10:40',
      'Period 3\n10:55-11:45',
      'Period 4\n11:45-12:35',
      'LUNCH\n12:35-01:25',
      'Period 5\n01:25-02:15',
      'Period 6\n02:15-03:05',
      'Period 7\n03:05-03:55',
    ],
  ];

  const body = [];

  DAYS.forEach((day) => {
    const dayGrid = timetable?.[day] || {};
    const row = [day];

    // P1 to P4
    for (let p = 1; p <= 4; p++) {
      const slot = dayGrid[p];
      if (slot && slot.subjectCode) {
        const sub = subjectsMap[slot.subjectCode];
        const acronym = getSubjectAcronym(sub?.name || slot.subjectName || slot.subjectCode, slot.subjectCode);
        const facs = (slot.facultyIds || []).map((id) => facultyMap[id]?.name || id).join(', ');
        const tag = slot.type === 'lab' ? '[LAB]' : '[TH]';
        row.push(`${slot.subjectCode} (${acronym})\n${facs}`);
      } else {
        row.push('---');
      }
    }

    // Lunch
    row.push('LUNCH\nBREAK');

    // P5 to P7
    if (day === 'Saturday') {
      row.push('INACTIVE\n(HALF DAY)', 'INACTIVE\n(HALF DAY)', 'INACTIVE\n(HALF DAY)');
    } else {
      for (let p = 5; p <= 7; p++) {
        const slot = dayGrid[p];
        if (slot && slot.subjectCode) {
          const facs = (slot.facultyIds || []).map((id) => facultyMap[id]?.name || id).join(', ');
          const tag = slot.type === 'lab' ? '[LAB]' : '[TH]';
          row.push(`${slot.subjectCode} ${tag}\n${facs}`);
        } else {
          row.push('---');
        }
      }
    }

    body.push(row);
  });

  autoTable(doc, {
    startY: 28,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 25 },
      5: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' }, // Lunch
    },
  });

  doc.save(`${section.name.replace(/\s+/g, '_')}_Timetable.pdf`);
};

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

// 4. Export Individual Selected Faculty Timetable to PDF (Official Box View Schedule)
export const exportSelectedFacultyTimetableToPdf = (facultyMember, timetables, subjects, sections) => {
  if (!facultyMember) return;
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));
  const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));

  // Calculate faculty teaching hours and list of subjects taught
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
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`Faculty Individual Timetable - ${facultyMember.name}`, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Faculty ID: ${facultyMember.id}  |  Department: ${facultyMember.department}  |  Role: ${facultyMember.designation || 'Faculty'}  |  Total Weekly Load: ${totalLoad}/${facultyMember.maxHours || 20} Hours  |  Generated on ${new Date().toLocaleDateString()}`,
    14,
    22
  );

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

      // Check external locked hours
      if (facultyMember.lockedSlots) {
        const ext = facultyMember.lockedSlots.find(
          (ls) => ls.day === day && Number(ls.period) === Number(p)
        );
        if (ext) {
          commitments.push(`[LOCKED]\n${ext.dept} Dept Load`);
        }
      }

      // Check internal classes across all sections
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

    // Periods 1 to 4
    for (let p = 1; p <= 4; p++) {
      row.push(getCellContent(p));
    }

    // Lunch Break
    row.push('LUNCH\nBREAK');

    // Periods 5 to 7
    if (day === 'Saturday') {
      row.push('INACTIVE\n(HALF DAY)', 'INACTIVE\n(HALF DAY)', 'INACTIVE\n(HALF DAY)');
    } else {
      for (let p = 5; p <= 7; p++) {
        row.push(getCellContent(p));
      }
    }

    body.push(row);
  });

  // Render Main Timetable Grid
  autoTable(doc, {
    startY: 28,
    head: head,
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 24 },
      5: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' }, // Lunch
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index !== 0 && data.column.index !== 5) {
        const text = data.cell.text.join(' ');
        if (text.includes('[LOCKED]')) {
          data.cell.styles.fillColor = [255, 241, 242]; // Rose
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fontStyle = 'bold';
        } else if (text !== 'FREE' && !text.includes('INACTIVE')) {
          data.cell.styles.fillColor = [238, 242, 255]; // Indigo
          data.cell.styles.textColor = [30, 27, 75];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'FREE') {
          data.cell.styles.textColor = [148, 163, 184];
        }
      }
    },
  });

  // Workload & Subject Breakdown Table
  const subjectList = Object.values(subjectsTaughtMap);
  const summaryStartY = doc.lastAutoTable.finalY + 8;

  if (subjectList.length > 0 && summaryStartY < 165) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Assigned Teaching Load Breakdown:', 14, summaryStartY);

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
      startY: summaryStartY + 3,
      head: summaryHead,
      body: summaryBody,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
    });
  }

  // Signatures Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('__________________________________', 20, pageHeight - 12);
  doc.text('Faculty Member Signature', 32, pageHeight - 7);

  doc.text('__________________________________', 115, pageHeight - 12);
  doc.text('Timetable Coordinator', 128, pageHeight - 7);

  doc.text('__________________________________', 215, pageHeight - 12);
  doc.text('HOD / Dean Approval', 230, pageHeight - 7);

  doc.save(`${facultyMember.name.replace(/\s+/g, '_')}_Timetable.pdf`);
};
