import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  ShieldCheck,
  UserPlus,
  X
} from 'lucide-react';
import { DAYS, DAY_PERIODS, PERIOD_TIMINGS } from '../../types/constants';

export const FreeFacultyStep = ({
  faculty,
  timetables,
  sections,
  subjects,
  setTimetables,
  setActiveStep,
}) => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [showBusyList, setShowBusyList] = useState(false);
  const [copied, setCopied] = useState(false);

  // Substitute modal state
  const [substituteModal, setSubstituteModal] = useState(null); // { faculty }

  const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));

  // Handle Saturday period switch
  const handleDayChange = (day) => {
    setSelectedDay(day);
    if (day === 'Saturday' && selectedPeriod > 4) {
      setSelectedPeriod(1);
    }
  };

  // Determine free vs busy faculty for selected (day, period)
  const freeFaculty = [];
  const busyFaculty = [];

  faculty.forEach((fac) => {
    // 1. Calculate faculty's current total weekly load
    let currentLoad = 0;
    // Internal hours
    Object.values(timetables).forEach((secGrid) => {
      DAYS.forEach((d) => {
        const maxP = DAY_PERIODS[d];
        for (let p = 1; p <= maxP; p++) {
          const slot = secGrid[d]?.[p];
          if (slot && slot.facultyIds && slot.facultyIds.includes(fac.id)) {
            currentLoad++;
          }
        }
      });
    });
    // External locked hours
    currentLoad += fac.lockedSlots?.length || 0;

    // 2. Check if fac is busy at selectedDay, selectedPeriod
    let isBusy = false;
    let busyReason = '';

    // Check Other Dept Locked Load
    if (fac.lockedSlots) {
      const ext = fac.lockedSlots.find(
        (ls) => ls.day === selectedDay && Number(ls.period) === Number(selectedPeriod)
      );
      if (ext) {
        isBusy = true;
        busyReason = `Locked: ${ext.dept} Dept Load (${ext.reason})`;
      }
    }

    // Check Departmental Timetable
    if (!isBusy) {
      for (const [secId, secGrid] of Object.entries(timetables)) {
        const slot = secGrid[selectedDay]?.[selectedPeriod];
        if (slot && slot.facultyIds && slot.facultyIds.includes(fac.id)) {
          isBusy = true;
          const secName = sectionsMap[secId]?.name || secId;
          busyReason = `Teaching ${slot.subjectCode} (${slot.type === 'lab' ? 'Lab' : 'Theory'}) in ${secName}`;
          break;
        }
      }
    }

    if (isBusy) {
      busyFaculty.push({ ...fac, currentLoad, reason: busyReason });
    } else {
      freeFaculty.push({ ...fac, currentLoad });
    }
  });

  // Copy Free Faculty List to Clipboard
  const handleCopyList = () => {
    const text = freeFaculty
      .map(
        (f) =>
          `• ${f.name} (${f.department}) - Current Load: ${f.currentLoad}/${f.maxHours}h`
      )
      .join('\n');
    const header = `Free Faculty for ${selectedDay} Period ${selectedPeriod}:\n\n${text}`;
    navigator.clipboard.writeText(header);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find all sections having a class in this period to allow substitution assignment
  const targetClassesForSubstitution = [];
  sections.forEach((sec) => {
    const slot = timetables[sec.id]?.[selectedDay]?.[selectedPeriod];
    if (slot && slot.subjectCode) {
      targetClassesForSubstitution.push({
        section: sec,
        slot,
      });
    }
  });

  // Assign faculty as substitute
  const handleConfirmSubstitute = (sectionId) => {
    if (!substituteModal) return;
    const fac = substituteModal.faculty;

    setTimetables((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const secGrid = copy[sectionId];
      if (secGrid?.[selectedDay]?.[selectedPeriod]) {
        secGrid[selectedDay][selectedPeriod].facultyIds = [fac.id];
        secGrid[selectedDay][selectedPeriod].isSubstitute = true;
        secGrid[selectedDay][selectedPeriod].substituteNote = `Substituted by ${fac.name}`;
      }
      return copy;
    });

    alert(`Faculty ${fac.name} assigned as substitute for ${sectionsMap[sectionId]?.name} on ${selectedDay} Period ${selectedPeriod}!`);
    setSubstituteModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Free Faculty Finder & Substitution Tool
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Instant Lookup
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Instantly lookup which faculty members have 0 commitments in any specific slot for substitution and workload balancing.
          </p>
        </div>

        {/* Copy list action */}
        <button
          onClick={handleCopyList}
          disabled={freeFaculty.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Free Faculty List</span>
            </>
          )}
        </button>
      </div>

      {faculty.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No Faculty Added Yet</h3>
            <p className="text-xs text-slate-500">
              Please add your department's teachers and professors in Step 1 to look up real-time free faculty and substitute assignments.
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
      <>
      {/* Selector Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Day Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Day of Week
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDayChange(d)}
                className={`py-2 px-1 text-xs font-semibold rounded-xl text-center transition-all ${
                  selectedDay === d
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {d.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Period {selectedDay === 'Saturday' && '(Periods 5–7 Inactive)'}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
              const isDisabled = selectedDay === 'Saturday' && p > 4;
              return (
                <button
                  key={p}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedPeriod(p)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl text-center transition-all ${
                    isDisabled
                      ? 'bg-stripes-inactive text-slate-300 border border-slate-200 cursor-not-allowed'
                      : selectedPeriod === p
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  P{p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Results Card */}
      <div className="space-y-4">
        {/* Available Faculty Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Free Faculty Available ({freeFaculty.length} of {faculty.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              {selectedDay} • Period {selectedPeriod}
            </span>
          </div>

          <div className="p-5">
            {freeFaculty.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No faculty members are completely free in this slot. All faculty are engaged in internal teaching or other department loads.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {freeFaculty.map((f) => {
                  const percent = Math.min(100, Math.round((f.currentLoad / f.maxHours) * 100));

                  return (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              {f.id}
                            </span>
                            <h4 className="font-bold text-xs text-slate-900">{f.name}</h4>
                            <div className="text-[11px] text-slate-500">
                              {f.designation} • {f.department}
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            FREE
                          </span>
                        </div>

                        {/* Current Workload Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                            <span>Weekly Workload:</span>
                            <span className="font-bold text-slate-900">
                              {f.currentLoad} / {f.maxHours} Hours
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick Action: Assign as substitute */}
                      <button
                        onClick={() => setSubstituteModal({ faculty: f })}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Assign as Substitute</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Busy Faculty Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            onClick={() => setShowBusyList(!showBusyList)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-xs text-slate-700">
                Busy Faculty in This Slot ({busyFaculty.length})
              </span>
            </div>
            {showBusyList ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showBusyList && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
              {busyFaculty.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 font-bold text-[11px]">
                      {f.id}
                    </span>
                    <span className="font-bold text-slate-900">{f.name}</span>
                    <span className="text-slate-400 text-[11px]">({f.department})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                      {f.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* SUBSTITUTE ASSIGNMENT MODAL */}
      {substituteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Assign as Substitute</h3>
                <p className="text-xs text-slate-400">
                  {substituteModal.faculty.name} ({substituteModal.faculty.id})
                </p>
              </div>
              <button
                onClick={() => setSubstituteModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Select which section running a class during <strong>{selectedDay} Period {selectedPeriod}</strong> to assign {substituteModal.faculty.name} as a substitute:
              </p>

              {targetClassesForSubstitution.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No classes are currently scheduled in this period to substitute into.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {targetClassesForSubstitution.map(({ section, slot }) => (
                    <div
                      key={section.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{section.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Subject: <strong>{slot.subjectCode}</strong> ({slot.subjectName})
                        </div>
                      </div>

                      <button
                        onClick={() => handleConfirmSubstitute(section.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSubstituteModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
