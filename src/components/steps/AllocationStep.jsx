import React, { useState } from 'react';
import { 
  UserCheck, 
  Users, 
  Beaker, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X,
  Lock,
  Maximize2,
  Minimize2,
  Layers
} from 'lucide-react';
import { SUBJECT_PALETTES } from '../../types/constants';

export const AllocationStep = ({
  sections,
  subjects,
  faculty,
  allocations,
  setAllocations,
  setActiveStep,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || '');
  const [isExpandedView, setIsExpandedView] = useState(false);

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const sectionAlloc = (activeSection && allocations[activeSection.id]) || {};

  // Subjects applicable to the active section's year
  const sectionSubjects = subjects.filter((s) => s.year === activeSection?.year);

  // Compute real-time workload for all faculty across all sections + external locked load
  const facultyWorkload = {};
  faculty.forEach((f) => {
    facultyWorkload[f.id] = {
      internalHours: 0,
      externalHours: f.lockedSlots?.length || 0,
      assignedSubjects: [],
    };
  });

  // Calculate internal hours from allocations
  Object.entries(allocations).forEach(([secId, secAlloc]) => {
    Object.entries(secAlloc).forEach(([subCode, alloc]) => {
      const sub = subjects.find((s) => s.code === subCode);
      if (!sub) return;

      // Theory hours
      if (alloc.theoryFaculty && sub.theoryHours > 0) {
        if (facultyWorkload[alloc.theoryFaculty]) {
          facultyWorkload[alloc.theoryFaculty].internalHours += sub.theoryHours;
          facultyWorkload[alloc.theoryFaculty].assignedSubjects.push(
            `${subCode} (TH - ${secId})`
          );
        }
      }

      // Lab hours (each assigned lab faculty spends labHours in the lab)
      if (alloc.labFaculty && alloc.labFaculty.length > 0 && sub.labHours > 0) {
        alloc.labFaculty.forEach((facId) => {
          if (facultyWorkload[facId]) {
            facultyWorkload[facId].internalHours += sub.labHours;
            facultyWorkload[facId].assignedSubjects.push(
              `${subCode} (LAB - ${secId})`
            );
          }
        });
      }
    });
  });

  // Handler for Theory faculty change
  const handleTheoryChange = (subjectCode, facultyId) => {
    setAllocations((prev) => {
      const secPrev = prev[activeSection.id] || {};
      const subPrev = secPrev[subjectCode] || { theoryFaculty: null, labFaculty: [] };
      return {
        ...prev,
        [activeSection.id]: {
          ...secPrev,
          [subjectCode]: {
            ...subPrev,
            theoryFaculty: facultyId || null,
          },
        },
      };
    });
  };

  // Handler for adding a lab faculty
  const handleAddLabFaculty = (subjectCode, facultyId) => {
    if (!facultyId) return;
    setAllocations((prev) => {
      const secPrev = prev[activeSection.id] || {};
      const subPrev = secPrev[subjectCode] || { theoryFaculty: null, labFaculty: [] };
      const currentLabFac = subPrev.labFaculty || [];

      if (currentLabFac.includes(facultyId)) return prev;

      return {
        ...prev,
        [activeSection.id]: {
          ...secPrev,
          [subjectCode]: {
            ...subPrev,
            labFaculty: [...currentLabFac, facultyId],
          },
        },
      };
    });
  };

  // Handler for removing a lab faculty
  const handleRemoveLabFaculty = (subjectCode, facultyId) => {
    setAllocations((prev) => {
      const secPrev = prev[activeSection.id] || {};
      const subPrev = secPrev[subjectCode] || { theoryFaculty: null, labFaculty: [] };
      return {
        ...prev,
        [activeSection.id]: {
          ...secPrev,
          [subjectCode]: {
            ...subPrev,
            labFaculty: (subPrev.labFaculty || []).filter((id) => id !== facultyId),
          },
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Faculty Allocation Matrix</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Section Mapping & Workload
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign faculty to Theory and Lab subjects. Supports multiple faculty per lab batch with live workload monitoring.
          </p>
        </div>

        {/* Section Switcher Tabs */}
        {sections.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Class Sections:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeSection?.id === sec.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-600/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!activeSection ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Prerequisites Needed</h3>
            <p className="text-xs text-slate-500">
              Please create at least one Class Section (Step 3), add Faculty (Step 1), and add Subjects (Step 2) to start mapping teachers to subjects.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {faculty.length === 0 && (
                <button
                  onClick={() => setActiveStep?.(1)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Step 1: Add Faculty
                </button>
              )}
              {subjects.length === 0 && (
                <button
                  onClick={() => setActiveStep?.(2)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Step 2: Add Subjects
                </button>
              )}
              {sections.length === 0 && (
                <button
                  onClick={() => setActiveStep?.(3)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-md shadow-indigo-100"
                >
                  Step 3: Create Section
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
      /* Main Grid: Subject Mapping (Left) & Real-time Workload Meter (Right) */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Allocation Cards for Active Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Subjects for {activeSection?.name} (Year {activeSection?.year})</span>
            </h3>
            <span className="text-xs text-slate-500">
              {sectionSubjects.length} Curriculum Subjects
            </span>
          </div>

          <div className="space-y-3">
            {sectionSubjects.map((sub) => {
              const alloc = sectionAlloc[sub.code] || {};
              const palette =
                SUBJECT_PALETTES.find((p) => p.id === sub.colorId) || SUBJECT_PALETTES[0];

              return (
                <div
                  key={sub.code}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-indigo-200 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: palette.bg,
                          color: palette.text,
                          border: `2px solid ${palette.border}`,
                        }}
                      >
                        {sub.code}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {sub.theoryHours > 0 && (
                            <span>Theory: {sub.theoryHours} hrs/wk</span>
                          )}
                          {sub.theoryHours > 0 && sub.labHours > 0 && <span>•</span>}
                          {sub.labHours > 0 && (
                            <span className="text-purple-600 font-medium">
                              Lab: {sub.labHours} hrs block
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-600">
                        Total: {(sub.theoryHours || 0) + (sub.labHours || 0)} hrs/wk
                      </span>
                    </div>
                  </div>

                  {/* Allocation controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                    {/* Theory Faculty Dropdown */}
                    {sub.theoryHours > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Theory Faculty ({sub.theoryHours}h)
                        </label>
                        <select
                          value={alloc.theoryFaculty || ''}
                          onChange={(e) => handleTheoryChange(sub.code, e.target.value)}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Theory Faculty...</option>
                          {faculty.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.department})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Lab Faculty (Multi-Faculty Support) */}
                    {sub.labHours > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                          <span>Lab Faculty Batch ({sub.labHours}h Block)</span>
                          <span className="text-purple-600 font-normal">
                            Multi-Faculty Supported
                          </span>
                        </label>

                        {/* Selected Lab Faculty Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(alloc.labFaculty || []).map((facId) => {
                            const fac = faculty.find((f) => f.id === facId);
                            return (
                              <span
                                key={facId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                <Beaker className="w-3 h-3 text-purple-500" />
                                <span>{fac?.name || facId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLabFaculty(sub.code, facId)}
                                  className="text-purple-400 hover:text-rose-600 ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>

                        {/* Add Lab Faculty Select */}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddLabFaculty(sub.code, e.target.value);
                            }
                          }}
                          className="w-full text-xs p-2 bg-purple-50/50 border border-purple-200 rounded-xl font-medium text-slate-700"
                        >
                          <option value="">+ Assign Faculty to Lab...</option>
                          {faculty
                            .filter((f) => !(alloc.labFaculty || []).includes(f.id))
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({f.department})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Real-time Faculty Workload Meter */}
        <div
          className={`lg:col-span-1 ${
            isExpandedView
              ? 'space-y-4'
              : 'lg:sticky lg:top-[7.5rem] lg:self-start flex flex-col space-y-3 lg:h-[calc(100vh-8.5rem)] lg:min-h-[520px]'
          }`}
        >
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">
                Real-Time Workload Meter
              </h3>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {faculty.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden xl:inline">
                Department + Other Load
              </span>
              <button
                type="button"
                onClick={() => setIsExpandedView(!isExpandedView)}
                title={
                  isExpandedView
                    ? 'Switch to Sticky Full-Height Scrollable View'
                    : 'Expand All Faculty (Match Left Side Full Length)'
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors"
              >
                {isExpandedView ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sticky View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Full Length</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 ${
              isExpandedView
                ? ''
                : 'flex-1 min-h-0 overflow-y-auto max-h-[500px] lg:max-h-none pr-1.5'
            }`}
          >
            {faculty.map((f) => {
              const wl = facultyWorkload[f.id] || { internalHours: 0, externalHours: 0 };
              const totalLoad = wl.internalHours + wl.externalHours;
              const percent = Math.min(100, Math.round((totalLoad / f.maxHours) * 100));
              const isOverloaded = totalLoad > f.maxHours;
              const isOptimal = totalLoad === f.maxHours;

              return (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isOverloaded
                      ? 'bg-rose-50/50 border-rose-200'
                      : isOptimal
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{f.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {f.department} • Max: {f.maxHours} hrs/wk
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold ${
                          isOverloaded
                            ? 'text-rose-600'
                            : isOptimal
                            ? 'text-emerald-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {totalLoad} / {f.maxHours} hrs
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2 flex">
                    {/* Internal Hours bar */}
                    <div
                      className={`h-full ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : isOptimal
                          ? 'bg-emerald-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (wl.internalHours / f.maxHours) * 100)}%`,
                      }}
                      title={`Internal Dept Load: ${wl.internalHours} hrs`}
                    />
                    {/* External Locked Hours bar */}
                    {wl.externalHours > 0 && (
                      <div
                        className="h-full bg-amber-500"
                        style={{
                          width: `${Math.min(
                            100 - (wl.internalHours / f.maxHours) * 100,
                            (wl.externalHours / f.maxHours) * 100
                          )}%`,
                        }}
                        title={`Other Dept Locked: ${wl.externalHours} hrs`}
                      />
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center justify-between text-[10px] mt-2">
                    <span className="text-slate-500">
                      Dept: <strong className="text-slate-800">{wl.internalHours}h</strong>
                      {wl.externalHours > 0 && (
                        <span className="ml-1 text-amber-700">
                          | Ext: <strong>{wl.externalHours}h</strong>
                        </span>
                      )}
                    </span>

                    {isOverloaded && (
                      <span className="font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Overloaded (+{totalLoad - f.maxHours}h)
                      </span>
                    )}
                    {isOptimal && (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 100% Balanced
                      </span>
                    )}
                    {!isOverloaded && !isOptimal && (
                      <span className="text-slate-400">
                        {f.maxHours - totalLoad}h available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
