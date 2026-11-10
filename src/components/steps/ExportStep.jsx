import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Check, 
  Layers, 
  Users, 
  Search,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { 
  exportSectionToExcel, 
  exportMasterGridToExcel, 
  exportFacultyWorkloadToExcel, 
  exportFreeFacultyReportToExcel,
  exportSelectedFacultyTimetableToExcel 
} from '../../services/excelExport';
import { 
  exportSectionToPdf, 
  exportFacultyWorkloadToPdf, 
  exportFreeFacultyToPdf,
  exportSelectedFacultyTimetableToPdf 
} from '../../services/pdfExport';
import { DAYS, DAY_PERIODS } from '../../types/constants';

export const ExportStep = ({
  sections,
  subjects,
  faculty,
  timetables,
  setActiveStep,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || '');
  const [selectedFacultyId, setSelectedFacultyId] = useState(faculty[0]?.id || '');
  const [reportDay, setReportDay] = useState('Monday');
  const [reportPeriod, setReportPeriod] = useState(2);

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const activeTimetable = timetables[activeSection?.id] || {};
  const activeFaculty = faculty.find((f) => f.id === selectedFacultyId) || faculty[0];

  // Export handlers
  const handleExportSectionExcel = () => {
    exportSectionToExcel(activeSection, activeTimetable, subjects, faculty);
  };

  const handleExportSectionPdf = () => {
    exportSectionToPdf(activeSection, activeTimetable, subjects, faculty);
  };

  const handleExportMasterExcel = () => {
    exportMasterGridToExcel(sections, timetables, subjects, faculty);
  };

  const handleExportSelectedFacultyPdf = () => {
    if (activeFaculty) {
      exportSelectedFacultyTimetableToPdf(activeFaculty, timetables, subjects, sections);
    }
  };

  const handleExportSelectedFacultyExcel = () => {
    if (activeFaculty) {
      exportSelectedFacultyTimetableToExcel(activeFaculty, timetables, subjects, sections);
    }
  };

  const handleExportFacultyExcel = () => {
    exportFacultyWorkloadToExcel(faculty, timetables, subjects, sections);
  };

  const handleExportFacultyPdf = () => {
    exportFacultyWorkloadToPdf(faculty, timetables, sections);
  };

  const handleExportFreeFacultyExcel = () => {
    const { free, busy } = calculateFreeBusy(reportDay, reportPeriod);
    exportFreeFacultyReportToExcel(reportDay, reportPeriod, free, busy);
  };

  const handleExportFreeFacultyPdf = () => {
    const { free, busy } = calculateFreeBusy(reportDay, reportPeriod);
    exportFreeFacultyToPdf(reportDay, reportPeriod, free, busy);
  };

  // Helper to compute free and busy faculty for reports
  const calculateFreeBusy = (day, period) => {
    const free = [];
    const busy = [];
    const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));

    faculty.forEach((fac) => {
      let currentLoad = 0;
      Object.values(timetables).forEach((secGrid) => {
        DAYS.forEach((d) => {
          for (let p = 1; p <= DAY_PERIODS[d]; p++) {
            const slot = secGrid[d]?.[p];
            if (slot && slot.facultyIds && slot.facultyIds.includes(fac.id)) {
              currentLoad++;
            }
          }
        });
      });
      currentLoad += fac.lockedSlots?.length || 0;

      let isBusy = false;
      let reason = '';

      if (fac.lockedSlots) {
        const ext = fac.lockedSlots.find(
          (ls) => ls.day === day && Number(ls.period) === Number(period)
        );
        if (ext) {
          isBusy = true;
          reason = `Locked: ${ext.dept} Dept Load (${ext.reason})`;
        }
      }

      if (!isBusy) {
        for (const [secId, secGrid] of Object.entries(timetables)) {
          const slot = secGrid[day]?.[period];
          if (slot && slot.facultyIds && slot.facultyIds.includes(fac.id)) {
            isBusy = true;
            reason = `Teaching in ${sectionsMap[secId]?.name || secId} (${slot.subjectCode})`;
            break;
          }
        }
      }

      if (isBusy) {
        busy.push({ ...fac, currentLoad, reason });
      } else {
        free.push({ ...fac, currentLoad });
      }
    });

    return { free, busy };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Timetable Export Center
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SheetJS (.xlsx) & jsPDF
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            One-click publication of official Section Timetables, Master Department Grids, Faculty Workload Reports, and Free Faculty Substitution Lists.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Native Print View</span>
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No Data Available for Export</h3>
            <p className="text-xs text-slate-500">
              Please enter your manual data (Faculty, Subjects, Sections), generate timetables in Step 6, and return here to export Excel workbooks and print-ready PDFs.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveStep?.(1)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-md shadow-indigo-100"
              >
                Go to Step 1: Faculty Management &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : (
      /* Grid of 4 Export Cards */
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Section Timetable Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Section Timetable (Individual Class)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete weekly 39-period schedule with Subject codes, full titles, assigned Faculty, and designated Tutor Hours.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Choose Section:
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Year {s.year})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportSectionExcel}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportSectionPdf}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Card 2: Master Department Grid Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Department Master Grid (All Sections)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Multi-sheet Excel workbook bundling all {sections.length} class sections into a single master departmental file for the Dean / HOD office.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleExportMasterExcel}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export All Sections Master Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 3: Selected Faculty Timetable Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Selected Faculty Timetable (PDF / Excel)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Personalized weekly teaching box schedule for any selected teacher with allocated classes, subjects, external locked hours, and official signature blocks.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Choose Faculty Member:
              </label>
              <select
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              >
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department}) - {f.designation || 'Faculty'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportSelectedFacultyExcel}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportSelectedFacultyPdf}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Export Faculty PDF</span>
            </button>
          </div>
        </div>

        {/* Card 3: Faculty Workload Matrix Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Faculty Workload & Collision Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Detailed teaching workload analysis for all {faculty.length} faculty members, broken down by internal hours, external department locked load, and max limits.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportFacultyExcel}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Workload Excel</span>
            </button>
            <button
              onClick={handleExportFacultyPdf}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors"
            >
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Workload PDF</span>
            </button>
          </div>
        </div>

        {/* Card 4: Free Faculty Substitution Report */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Free Faculty Substitution Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Extract free & available teachers ready for emergency classroom substitution in any selected slot.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Day:
                </label>
                <select
                  value={reportDay}
                  onChange={(e) => setReportDay(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Period:
                </label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {[1, 2, 3, 4, ...(reportDay === 'Saturday' ? [] : [5, 6, 7])].map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportFreeFacultyExcel}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Report Excel</span>
            </button>
            <button
              onClick={handleExportFreeFacultyPdf}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200 transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Report PDF</span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
