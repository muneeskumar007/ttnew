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

// Helper to trigger browser download of formatted .doc file
export const downloadWordDocument = (filename, htmlBody) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page SectionLandscape {
          size: 841.9pt 595.3pt;
          mso-page-orientation: landscape;
          margin: 1.2cm 1.2cm 1.2cm 1.2cm;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
        }
        div.SectionLandscape {
          page: SectionLandscape;
        }
        .page-break {
          page-break-before: always;
          mso-break-type: section-break;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          color: #000;
          background-color: #fff;
          margin: 0;
          padding: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .grid-table {
          margin-top: 6px;
          margin-bottom: 8px;
        }
        .grid-table th, .grid-table td {
          border: 1px solid #000;
          padding: 5px 3px;
          text-align: center;
          vertical-align: middle;
          font-size: 8.5pt;
        }
        .grid-table th {
          background-color: #f1f5f9;
          font-weight: bold;
        }
        .sub-table {
          margin-top: 4px;
          margin-bottom: 12px;
        }
        .sub-table th, .sub-table td {
          border: 1px solid #333;
          padding: 3px 6px;
          font-size: 8pt;
        }
        .sub-table th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: left;
        }
        .inst-title {
          text-align: center;
          font-size: 12pt;
          font-weight: bold;
          margin: 0;
        }
        .doc-title {
          text-align: center;
          font-size: 11pt;
          font-weight: bold;
          margin: 3px 0 6px 0;
        }
        .meta-bar {
          width: 100%;
          border: none;
          margin-bottom: 4px;
          font-size: 9.5pt;
          font-weight: bold;
        }
        .meta-bar td {
          border: none;
          padding: 1px 0;
        }
        .sig-bar {
          width: 100%;
          border: none;
          margin-top: 18px;
          font-size: 9.5pt;
          font-weight: bold;
          text-align: center;
        }
        .sig-bar td {
          border: none;
          padding: 6px 0;
          width: 20%;
        }
      </style>
    </head>
    <body>
      <div class="SectionLandscape">
        ${htmlBody}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + header], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 1. Export All Sections Timetable to Word (.doc) in exact uploaded format
export const exportAllSectionsToWord = (sections, timetables, subjects, faculty) => {
  if (!sections || sections.length === 0) return;

  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  let docContent = '';

  sections.forEach((section, idx) => {
    const { secLetter, yearSem, roomNo } = getSectionMeta(section);
    const timetable = timetables[section.id] || {};

    const pageBreakHtml = idx > 0 ? '<br clear="all" class="page-break" />' : '';

    // Collect subjects for this section
    const subjectMap = new Map();
    DAYS.forEach((day) => {
      const maxP = DAY_PERIODS[day];
      for (let p = 1; p <= maxP; p++) {
        const slot = timetable[day]?.[p];
        if (slot && slot.subjectCode) {
          if (!subjectMap.has(slot.subjectCode)) {
            const sub = subjectsMap[slot.subjectCode];
            const facNames = (slot.facultyIds || []).map((id) => {
              const raw = facultyMap[id]?.name || id;
              return raw.startsWith('Dr.') || raw.startsWith('Prof.') ? raw : `Prof. ${raw}`;
            });
            subjectMap.set(slot.subjectCode, {
              code: slot.subjectCode,
              name: (sub?.name || slot.subjectName || slot.subjectCode).toUpperCase(),
              facultyName: facNames.join(' / ') || 'Unassigned',
              type: slot.type || 'theory',
            });
          }
        }
      }
    });

    const subjectList = Array.from(subjectMap.values());
    subjectList.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'theory' ? -1 : 1;
      return a.code.localeCompare(b.code);
    });

    const mentor = facultyMap[section?.mentorFacultyId];
    const mentorName = mentor?.name
      ? mentor.name.startsWith('Dr.') || mentor.name.startsWith('Prof.')
        ? mentor.name
        : `Prof. ${mentor.name}`
      : 'Faculty Incharge';

    subjectList.push({
      code: '',
      name: 'LIBRARY',
      facultyName: mentorName,
      type: 'library',
    });

    // Build Table Rows for Grid
    let gridRowsHtml = '';
    DAYS.forEach((day) => {
      const dayUpper = day.toUpperCase();
      const dayGrid = timetable[day] || {};

      const getAcronym = (slot) => {
        if (!slot || !slot.subjectCode) return '';
        const sub = subjectsMap[slot.subjectCode];
        const name = sub?.name || slot.subjectName || slot.subjectCode;
        let acronym = getSubjectAcronym(name, slot.subjectCode);
        if (slot.type === 'lab' && !acronym.toLowerCase().includes('lab')) {
          acronym += ' LAB';
        }
        return acronym;
      };

      // Morning session (P1-P4)
      const p1 = dayGrid[1];
      const p2 = dayGrid[2];
      const p3 = dayGrid[3];
      const p4 = dayGrid[4];

      let morningCells = '';

      // Check 3-hour lab block P1-P3
      const isLab123 = p1 && p2 && p3 && p1.subjectCode && p1.subjectCode === p2.subjectCode && p2.subjectCode === p3.subjectCode && p1.type === 'lab';
      const isLab234 = p2 && p3 && p4 && p2.subjectCode && p2.subjectCode === p3.subjectCode && p3.subjectCode === p4.subjectCode && p2.type === 'lab';
      const isBlock12 = p1 && p2 && p1.subjectCode && p1.subjectCode === p2.subjectCode;
      const isBlock34 = p3 && p4 && p3.subjectCode && p3.subjectCode === p4.subjectCode && (p3.type === 'lab' || isBlock12);

      if (isLab123) {
        morningCells += `<td colspan="3" style="font-weight:bold;">${getAcronym(p1)}</td>`;
        morningCells += `<td>${getAcronym(p4)}</td>`;
      } else if (isLab234) {
        morningCells += `<td>${getAcronym(p1)}</td>`;
        morningCells += `<td colspan="3" style="font-weight:bold;">${getAcronym(p2)}</td>`;
      } else if (isBlock12 && isBlock34) {
        morningCells += `<td colspan="2" style="font-weight:bold;">${getAcronym(p1)}</td>`;
        morningCells += `<td colspan="2" style="font-weight:bold;">${getAcronym(p3)}</td>`;
      } else if (isBlock12) {
        morningCells += `<td colspan="2" style="font-weight:bold;">${getAcronym(p1)}</td>`;
        morningCells += `<td>${getAcronym(p3)}</td>`;
        morningCells += `<td>${getAcronym(p4)}</td>`;
      } else if (isBlock34) {
        morningCells += `<td>${getAcronym(p1)}</td>`;
        morningCells += `<td>${getAcronym(p2)}</td>`;
        morningCells += `<td colspan="2" style="font-weight:bold;">${getAcronym(p3)}</td>`;
      } else {
        morningCells += `<td>${getAcronym(p1)}</td>`;
        morningCells += `<td>${getAcronym(p2)}</td>`;
        morningCells += `<td>${getAcronym(p3)}</td>`;
        morningCells += `<td>${getAcronym(p4)}</td>`;
      }

      // Afternoon session (P5-P7)
      let afternoonCells = '';
      if (day === 'Saturday') {
        afternoonCells = `<td colspan="3" style="background-color:#f8fafc;"></td>`;
      } else {
        const p5 = dayGrid[5];
        const p6 = dayGrid[6];
        const p7 = dayGrid[7];

        const isLab567 = p5 && p6 && p7 && p5.subjectCode && p5.subjectCode === p6.subjectCode && p6.subjectCode === p7.subjectCode && p5.type === 'lab';
        const isBlock56 = p5 && p6 && p5.subjectCode && p5.subjectCode === p6.subjectCode && p5.type === 'lab';

        if (isLab567) {
          afternoonCells = `<td colspan="3" style="font-weight:bold;">${getAcronym(p5)}</td>`;
        } else if (isBlock56) {
          afternoonCells = `<td colspan="2" style="font-weight:bold;">${getAcronym(p5)}</td><td>${getAcronym(p7)}</td>`;
        } else {
          afternoonCells = `<td>${getAcronym(p5)}</td><td>${getAcronym(p6)}</td><td>${getAcronym(p7)}</td>`;
        }
      }

      gridRowsHtml += `
        <tr>
          <td style="font-weight:bold; background-color:#f8fafc; text-align:left; padding-left:8px;">${dayUpper}</td>
          ${morningCells}
          <td style="background-color:#f8fafc; font-size:7.5pt; font-weight:bold;"></td>
          ${afternoonCells}
        </tr>
      `;
    });

    // Build Subject Table Rows
    let subjectRowsHtml = '';
    subjectList.forEach((sub) => {
      subjectRowsHtml += `
        <tr>
          <td style="font-weight:bold; width:15%;">${sub.code}</td>
          <td style="width:55%; text-align:left; padding-left:8px;">${sub.name}</td>
          <td style="width:30%; text-align:left; padding-left:8px;">${sub.facultyName}</td>
        </tr>
      `;
    });

    docContent += `
      ${pageBreakHtml}
      <div style="margin-bottom: 15px;">
        <table style="width:100%; border:none; margin-bottom:2px;">
          <tr>
            <td style="border:none; text-align:left; font-size:12pt; font-weight:bold; width:75%;">
              ADHIYAMAAN COLLEGE OF ENGINEERING (An Autonomous Institution)
            </td>
            <td style="border:none; text-align:right; font-size:11pt; font-weight:bold; width:25%;">
              AY: 2026-2027
            </td>
          </tr>
        </table>
        
        <div class="doc-title">CLASS TIME TABLE (WEEK PLAN)</div>

        <table class="meta-bar">
          <tr>
            <td style="text-align:left; width:33%;">PROGRAM:&nbsp;&nbsp;B.E-CSE</td>
            <td style="text-align:center; width:34%;">Year/Semester:${yearSem}</td>
            <td style="text-align:right; width:33%;">Room No:&nbsp;&nbsp;${roomNo}</td>
          </tr>
        </table>

        <table class="grid-table">
          <thead>
            <tr>
              <th style="width:12%;">DAY / PERIOD</th>
              <th style="width:11%;">1<br/>8.30am-9.25am</th>
              <th style="width:11%;">2<br/>9.25am- 10.20am</th>
              <th style="width:11%;">3<br/>10.30am-11.25am</th>
              <th style="width:11%;">4<br/>11.25am-12.20Pm</th>
              <th style="width:6%;">Lunch<br/>break</th>
              <th style="width:11%;">5<br/>1.20pm-2.15pm</th>
              <th style="width:11%;">6<br/>2.15pm-3.10pm</th>
              <th style="width:11%;">7<br/>3.10pm-4.05pm</th>
            </tr>
          </thead>
          <tbody>
            ${gridRowsHtml}
          </tbody>
        </table>

        <table class="sub-table">
          <thead>
            <tr>
              <th style="width:15%;">Subject code</th>
              <th style="width:55%;">Subject</th>
              <th style="width:30%;">Faculty Name</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHtml}
          </tbody>
        </table>

        <table class="sig-bar">
          <tr>
            <td>Class Advisor</td>
            <td>Time Table Incharge</td>
            <td>HOD</td>
            <td>Dean (Academics)</td>
            <td>Principal</td>
          </tr>
        </table>
      </div>
    `;
  });

  downloadWordDocument('Overall_All_Sections_Timetable.doc', docContent);
};

// 2. Export All Faculty Timetables to Word (.doc)
export const exportAllFacultyToWord = (faculty, timetables, subjects, sections) => {
  if (!faculty || faculty.length === 0) return;

  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));
  const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));

  let docContent = '';

  faculty.forEach((facultyMember, idx) => {
    const pageBreakHtml = idx > 0 ? '<br clear="all" class="page-break" />' : '';

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

    let gridRowsHtml = '';
    DAYS.forEach((day) => {
      const getCommitments = (p) => {
        const parts = [];
        if (facultyMember.lockedSlots) {
          const ext = facultyMember.lockedSlots.find(
            (ls) => ls.day === day && Number(ls.period) === Number(p)
          );
          if (ext) {
            parts.push(`[LOCKED ${ext.dept}]`);
          }
        }
        Object.entries(timetables).forEach(([secId, secGrid]) => {
          const slot = secGrid[day]?.[p];
          if (slot && slot.facultyIds && slot.facultyIds.includes(facultyMember.id)) {
            const sub = subjectsMap[slot.subjectCode];
            const acronym = getSubjectAcronym(sub?.name || slot.subjectName || slot.subjectCode, slot.subjectCode);
            const secName = sectionsMap[secId]?.name || secId;
            parts.push(`${slot.subjectCode} (${acronym}) - ${secName}`);
          }
        });
        return parts.length > 0 ? parts.join('<br/>') : 'FREE';
      };

      let cells = '';
      for (let p = 1; p <= 4; p++) {
        const c = getCommitments(p);
        const style = c.includes('[LOCKED') ? 'background-color:#fee2e2; font-weight:bold;' : c !== 'FREE' ? 'background-color:#e0e7ff; font-weight:bold;' : 'color:#94a3b8;';
        cells += `<td style="${style}">${c}</td>`;
      }

      cells += `<td style="background-color:#fef3c7; font-weight:bold; font-size:7.5pt;">LUNCH</td>`;

      if (day === 'Saturday') {
        cells += `<td colspan="3" style="background-color:#f1f5f9; color:#94a3b8;">INACTIVE</td>`;
      } else {
        for (let p = 5; p <= 7; p++) {
          const c = getCommitments(p);
          const style = c.includes('[LOCKED') ? 'background-color:#fee2e2; font-weight:bold;' : c !== 'FREE' ? 'background-color:#e0e7ff; font-weight:bold;' : 'color:#94a3b8;';
          cells += `<td style="${style}">${c}</td>`;
        }
      }

      gridRowsHtml += `
        <tr>
          <td style="font-weight:bold; background-color:#f8fafc;">${day.toUpperCase()}</td>
          ${cells}
        </tr>
      `;
    });

    let breakdownRowsHtml = '';
    Object.values(subjectsTaughtMap).forEach((item) => {
      breakdownRowsHtml += `
        <tr>
          <td style="font-weight:bold;">${item.code}</td>
          <td style="text-align:left; padding-left:8px;">${item.name}</td>
          <td>${item.sectionName}</td>
          <td>${item.type}</td>
          <td style="font-weight:bold;">${item.hours} hrs/week</td>
        </tr>
      `;
    });

    docContent += `
      ${pageBreakHtml}
      <div style="margin-bottom: 20px;">
        <table style="width:100%; border:none; margin-bottom:4px;">
          <tr>
            <td style="border:none; text-align:left; font-size:12pt; font-weight:bold; width:70%;">
              ADHIYAMAAN COLLEGE OF ENGINEERING - FACULTY SCHEDULE
            </td>
            <td style="border:none; text-align:right; font-size:10pt; font-weight:bold; width:30%;">
              AY: 2026-2027
            </td>
          </tr>
        </table>

        <div style="font-size:13pt; font-weight:bold; text-align:center; margin:4px 0 8px 0; color:#1e293b;">
          ${facultyMember.name.toUpperCase()} (${facultyMember.department})
        </div>

        <table style="width:100%; border:none; margin-bottom:8px; font-size:9.5pt; font-weight:bold;">
          <tr>
            <td style="border:none; text-align:left; width:33%;">Faculty ID: ${facultyMember.id}</td>
            <td style="border:none; text-align:center; width:34%;">Designation: ${facultyMember.designation || 'Faculty'}</td>
            <td style="border:none; text-align:right; width:33%;">Total Load: ${totalLoad}/${facultyMember.maxHours || 20} Hours</td>
          </tr>
        </table>

        <table class="grid-table">
          <thead>
            <tr>
              <th style="width:12%;">Day</th>
              <th style="width:11%;">Period 1<br/>09:00 - 09:50</th>
              <th style="width:11%;">Period 2<br/>09:50 - 10:40</th>
              <th style="width:11%;">Period 3<br/>10:55 - 11:45</th>
              <th style="width:11%;">Period 4<br/>11:45 - 12:35</th>
              <th style="width:6%;">Lunch</th>
              <th style="width:11%;">Period 5<br/>01:25 - 02:15</th>
              <th style="width:11%;">Period 6<br/>02:15 - 03:05</th>
              <th style="width:11%;">Period 7<br/>03:05 - 03:55</th>
            </tr>
          </thead>
          <tbody>
            ${gridRowsHtml}
          </tbody>
        </table>

        ${
          Object.keys(subjectsTaughtMap).length > 0
            ? `
          <div style="font-size:9.5pt; font-weight:bold; margin-top:10px; margin-bottom:4px;">Teaching Load Breakdown:</div>
          <table class="sub-table">
            <thead>
              <tr>
                <th style="width:15%;">Subject Code</th>
                <th style="width:40%;">Subject Title</th>
                <th style="width:20%;">Class Section</th>
                <th style="width:12%;">Type</th>
                <th style="width:13%;">Weekly Load</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRowsHtml}
              <tr style="font-weight:bold; background-color:#f1f5f9;">
                <td colspan="4" style="text-align:right; padding-right:12px;">TOTAL TEACHING LOAD (${internalHours}h Internal + ${externalHours}h Other Dept):</td>
                <td>${totalLoad} / ${facultyMember.maxHours || 20} hrs</td>
              </tr>
            </tbody>
          </table>
          `
            : ''
        }

        <table class="sig-bar" style="margin-top:25px;">
          <tr>
            <td style="width:33%;">Faculty Member Signature</td>
            <td style="width:33%;">Timetable Coordinator</td>
            <td style="width:34%;">HOD / Dean Approval</td>
          </tr>
        </table>
      </div>
    `;
  });

  downloadWordDocument('Overall_All_Faculty_Timetables.doc', docContent);
};
