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
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  exportSectionToExcel, 
  exportMasterGridToExcel, 
  exportFacultyWorkloadToExcel, 
  exportFreeFacultyReportToExcel,
  exportSelectedFacultyTimetableToExcel,
  exportAllFacultyToExcel
} from '../../services/excelExport';
import { 
  exportSectionToPdf, 
  exportAllSectionsToPdf,
  exportFacultyWorkloadToPdf, 
  exportFreeFacultyToPdf,
  exportSelectedFacultyTimetableToPdf,
  exportAllFacultyToPdf 
} from '../../services/pdfExport';
import {
  exportAllSectionsToWord,
  exportAllFacultyToWord
} from '../../services/wordExport';
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
  const [showSingleSection, setShowSingleSection] = useState(false);
  const [showSingleFaculty, setShowSingleFaculty] = useState(false);

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const activeTimetable = timetables[activeSection?.id] || {};
  const activeFaculty = faculty.find((f) => f.id === selectedFacultyId) || faculty[0];

  // 1. Overall All Sections Handlers (Single-click)
  const handleExportAllSectionsPdf = () => {
    exportAllSectionsToPdf(sections, timetables, subjects, faculty);
  };

  const handleExportAllSectionsWord = () => {
    exportAllSectionsToWord(sections, timetables, subjects, faculty);
  };

  const handleExportMasterExcel = () => {
    exportMasterGridToExcel(sections, timetables, subjects, faculty);
  };

  // 2. Overall All Faculty Handlers (Single-click)
  const handleExportAllFacultyPdf = () => {
    exportAllFacultyToPdf(faculty, timetables, subjects, sections);
  };

  const handleExportAllFacultyWord = () => {
    exportAllFacultyToWord(faculty, timetables, subjects, sections);
  };

  const handleExportAllFacultyExcel = () => {
    exportAllFacultyToExcel(faculty, timetables, subjects, sections);
  };

  // 3. Single Section Handlers (Secondary / Optional)
  const handleExportSingleSectionPdf = () => {
    if (activeSection) {
      exportSectionToPdf(activeSection, activeTimetable, subjects, faculty);
    }
  };

  const handleExportSingleSectionExcel = () => {
    if (activeSection) {
      exportSectionToExcel(activeSection, activeTimetable, subjects, faculty);
    }
  };

  // 4. Single Faculty Handlers (Secondary / Optional)
  const handleExportSingleFacultyPdf = () => {
    if (activeFaculty) {
      exportSelectedFacultyTimetableToPdf(activeFaculty, timetables, subjects, sections);
    }
  };

  const handleExportSingleFacultyExcel = () => {
    if (activeFaculty) {
      exportSelectedFacultyTimetableToExcel(activeFaculty, timetables, subjects, sections);
    }
  };

  // 5. Workload & Free Faculty Handlers
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
              PDF, Word (.doc) & Excel (.xlsx)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Single-click publication of official All-Sections Timetables (Adhiyamaan College format), All-Faculty Schedules, Workload Analysis, and Free Faculty Reports.
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
        {/* Card 1: All Sections Timetable Export (Overall All Years & Sections) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                All Sections Timetable (Overall Department)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {sections.length} Sections
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Single-click download for all {sections.length} class sections (Years 2, 3, 4) in the official <strong>Adhiyamaan College format</strong>: Header with AY 2026-2027, weekly period grid, subject-faculty mapping, and 5-authority signatures.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Primary Action Buttons: PDF and Word format in exact uploaded template */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExportAllSectionsPdf}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-colors"
                title="Download consolidated PDF for all sections in uploaded college format"
              >
                <FileText className="w-4 h-4" />
                <span>Export All Sections PDF</span>
              </button>

              <button
                onClick={handleExportAllSectionsWord}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-colors"
                title="Download editable Microsoft Word (.doc) for all sections in uploaded college format"
              >
                <FileText className="w-4 h-4" />
                <span>Export All Sections Word (.doc)</span>
              </button>
            </div>

            {/* Master Excel Button */}
            <button
              onClick={handleExportMasterExcel}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export All Sections Master Excel (.xlsx)</span>
            </button>

            {/* Collapsible Single Section Drawer (if specific class download is ever needed) */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSingleSection(!showSingleSection)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
              >
                <span>Need individual section download?</span>
                {showSingleSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSingleSection && (
                <div className="mt-2 space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Year {s.year})
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportSingleSectionPdf}
                      className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 text-center"
                    >
                      Single PDF
                    </button>
                    <button
                      onClick={handleExportSingleSectionExcel}
                      className="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 text-center"
                    >
                      Single Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: All Faculty Timetables Export (Overall Department) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                All Faculty Timetables (Overall Department)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                {faculty.length} Faculty
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Single-click download for all {faculty.length} teachers. Bundles personalized weekly schedules, allocated curriculum classes, other department locked commitments, and official signature blocks.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Primary Action Buttons: PDF and Word format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExportAllFacultyPdf}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-colors"
                title="Download consolidated PDF containing all faculty schedules"
              >
                <FileText className="w-4 h-4" />
                <span>Export All Faculty PDF</span>
              </button>

              <button
                onClick={handleExportAllFacultyWord}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-colors"
                title="Download editable Microsoft Word (.doc) for all faculty schedules"
              >
                <FileText className="w-4 h-4" />
                <span>Export All Faculty Word (.doc)</span>
              </button>
            </div>

            {/* Master Faculty Excel Button */}
            <button
              onClick={handleExportAllFacultyExcel}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export All Faculty Excel Workbook (.xlsx)</span>
            </button>

            {/* Collapsible Single Faculty Drawer (if specific teacher download is needed) */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSingleFaculty(!showSingleFaculty)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
              >
                <span>Need individual teacher schedule?</span>
                {showSingleFaculty ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSingleFaculty && (
                <div className="mt-2 space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <select
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department}) - {f.designation || 'Faculty'}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportSingleFacultyPdf}
                      className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 text-center"
                    >
                      Single Faculty PDF
                    </button>
                    <button
                      onClick={handleExportSingleFacultyExcel}
                      className="py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 text-center"
                    >
                      Single Faculty Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
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
