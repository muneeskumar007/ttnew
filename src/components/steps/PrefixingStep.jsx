import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  X, 
  Sparkles,
  Info,
  ShieldCheck,
  Beaker
} from 'lucide-react';
import { DAYS, DAY_PERIODS, PERIOD_TIMINGS, TOTAL_WEEKLY_PERIODS, SUBJECT_PALETTES } from '../../types/constants';
import { computeSectionTally, isFacultyBusy } from '../../services/scheduler';

export const PrefixingStep = ({
  sections,
  subjects,
  faculty,
  allocations,
  prefixedSlots,
  setPrefixedSlots,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || '');
  const [modalSlot, setModalSlot] = useState(null); // { day, period }

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const secAlloc = allocations[activeSection?.id] || {};
  const secPrefixed = prefixedSlots[activeSection?.id] || {};

  // Subjects assigned to this section
  const assignedSubjects = subjects.filter(
    (s) => s.year === activeSection?.year && secAlloc[s.code]
  );

  // Compute live tally & reconciliation
  const tally = computeSectionTally(
    activeSection?.id,
    subjects,
    allocations,
    prefixedSlots
  );

  // Prefix a Theory Hour
  const handlePrefixTheory = (subjectCode, isTutor = false) => {
    if (!modalSlot) return;
    const { day, period } = modalSlot;

    // Check faculty availability for this slot
    const alloc = secAlloc[subjectCode];
    if (alloc?.theoryFaculty) {
      const busy = isFacultyBusy(alloc.theoryFaculty, day, period, {}, faculty);
      if (busy.busy) {
        alert(`Cannot prefix slot: Assigned faculty is busy (${busy.reason}).`);
        return;
      }
    }

    setPrefixedSlots((prev) => {
      const secData = prev[activeSection.id] || {};
      const dayData = secData[day] || {};
      return {
        ...prev,
        [activeSection.id]: {
          ...secData,
          [day]: {
            ...dayData,
            [period]: {
              type: 'theory',
              subjectCode,
              isLocked: true,
              isTutorHour: isTutor,
            },
          },
        },
      };
    });

    setModalSlot(null);
  };

  // Prefix a Continuous Lab Block (2 or 3 periods)
  const handlePrefixLabBlock = (subjectCode, blockSize = 3) => {
    if (!modalSlot) return;
    const { day, period } = modalSlot;

    // Determine target periods
    const maxP = DAY_PERIODS[day];
    let periodsToLock = [];

    if (blockSize === 3) {
      if (period <= 2) periodsToLock = [1, 2, 3];
      else if (period <= 4) periodsToLock = [2, 3, 4];
      else if (day !== 'Saturday' && period <= 7) periodsToLock = [5, 6, 7];
    } else {
      // 2 periods
      if (period < 4) periodsToLock = [period, period + 1];
      else if (period === 4) periodsToLock = [3, 4];
      else if (day !== 'Saturday') periodsToLock = [period, Math.min(7, period + 1)];
    }

    if (periodsToLock.length === 0) {
      alert('Invalid starting period for lab block.');
      return;
    }

    // Check if any of target periods are already locked or inactive
    const dayData = secPrefixed[day] || {};
    const conflict = periodsToLock.some((p) => dayData[p] || (day === 'Saturday' && p > 4));
    if (conflict) {
      alert(`Cannot place continuous ${blockSize}-period lab block: some slots are already occupied or inactive.`);
      return;
    }

    const alloc = secAlloc[subjectCode];
    const labFacs = alloc?.labFaculty || [];

    // Check faculty availability for all target periods
    for (const p of periodsToLock) {
      for (const facId of labFacs) {
        const busy = isFacultyBusy(facId, day, p, {}, faculty);
        if (busy.busy) {
          const facName = faculty.find((f) => f.id === facId)?.name || facId;
          alert(`Cannot prefix lab block: Faculty ${facName} is busy at ${day} P${p} (${busy.reason}).`);
          return;
        }
      }
    }

    // Lock all periods in this lab block
    const blockId = `${subjectCode}_PRE_${day}_${periodsToLock[0]}`;
    setPrefixedSlots((prev) => {
      const secData = prev[activeSection.id] || {};
      const updatedDay = { ...(secData[day] || {}) };

      periodsToLock.forEach((p) => {
        updatedDay[p] = {
          type: 'lab',
          subjectCode,
          isLocked: true,
          labBlockId: blockId,
        };
      });

      return {
        ...prev,
        [activeSection.id]: {
          ...secData,
          [day]: updatedDay,
        },
      };
    });

    setModalSlot(null);
  };

  // Remove / Unlock a prefixed slot
  const handleUnlockSlot = (day, period) => {
    setPrefixedSlots((prev) => {
      const secData = prev[activeSection.id] || {};
      const dayData = { ...(secData[day] || {}) };
      const current = dayData[period];

      if (current?.labBlockId) {
        // If it's part of a lab block, unlock all companion periods in this block
        Object.keys(dayData).forEach((p) => {
          if (dayData[p]?.labBlockId === current.labBlockId) {
            delete dayData[p];
          }
        });
      } else {
        delete dayData[period];
      }

      return {
        ...prev,
        [activeSection.id]: {
          ...secData,
          [day]: dayData,
        },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Schedule Grid, Prefixing & Live Tally Engine
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              39 Periods Standard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pre-allocate fixed Theory hours and continuous Lab blocks. The automated generator schedules only remaining open hours.
          </p>
        </div>

        {/* Section Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setSelectedSectionId(sec.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection?.id === sec.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sec.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Tally & Reconciliation Engine Banner (Gatekeeper) */}
      <div
        className={`rounded-2xl p-5 border transition-all ${
          tally.isBalanced
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
            : 'bg-amber-50/70 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                tally.isBalanced
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-amber-600 text-white shadow-md shadow-amber-200'
              }`}
            >
              {tally.isBalanced ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Live Tally Gatekeeper:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    tally.isBalanced
                      ? 'bg-emerald-200 text-emerald-800'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {tally.isBalanced ? 'Balanced & Ready' : 'Reconciliation Required'}
                </span>
              </div>
              <p className="text-xs font-semibold mt-0.5">{tally.statusMessage}</p>
            </div>
          </div>

          {/* Quick Metrics Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 font-semibold shadow-2xs">
              Curriculum: <strong>{tally.totalCurriculumHours}h</strong> / 39h
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 font-semibold shadow-2xs">
              Prefixed: <strong className="text-rose-600">{tally.totalPrefixedSlots}h</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 font-semibold shadow-2xs">
              Remaining Open: <strong className="text-indigo-600">{tally.remainingOpenSlots}h</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Grid Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Pre-Allocation Grid ({activeSection?.name})
            </h3>
            <p className="text-xs text-slate-500">
              Click any open slot to prefix a Theory hour or continuous Lab block.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stripes-locked border border-rose-300" />
              <span className="text-slate-600">Prefixed & Locked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stripes-inactive border border-slate-300" />
              <span className="text-slate-600">Sat Inactive (P5-7)</span>
            </div>
          </div>
        </div>

        {/* Weekly Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 w-28 text-left font-bold border-r border-slate-200">Day</th>
                <th className="p-2.5 font-semibold">
                  <div>Period 1</div>
                  <div className="text-[10px] text-slate-400 font-normal">09:00 - 09:50</div>
                </th>
                <th className="p-2.5 font-semibold">
                  <div>Period 2</div>
                  <div className="text-[10px] text-slate-400 font-normal">09:50 - 10:40</div>
                </th>
                <th className="p-2.5 font-semibold">
                  <div>Period 3</div>
                  <div className="text-[10px] text-slate-400 font-normal">10:55 - 11:45</div>
                </th>
                <th className="p-2.5 font-semibold">
                  <div>Period 4</div>
                  <div className="text-[10px] text-slate-400 font-normal">11:45 - 12:35</div>
                </th>
                {/* Lunch Break Column */}
                <th className="p-2 w-16 bg-amber-50 text-amber-800 font-bold border-x border-amber-200">
                  <div>LUNCH</div>
                  <div className="text-[9px] font-normal">50 min</div>
                </th>
                <th className="p-2.5 font-semibold">
                  <div>Period 5</div>
                  <div className="text-[10px] text-slate-400 font-normal">01:25 - 02:15</div>
                </th>
                <th className="p-2.5 font-semibold">
                  <div>Period 6</div>
                  <div className="text-[10px] text-slate-400 font-normal">02:15 - 03:05</div>
                </th>
                <th className="p-2.5 font-semibold">
                  <div>Period 7</div>
                  <div className="text-[10px] text-slate-400 font-normal">03:05 - 03:55</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS.map((day) => {
                const daySlots = secPrefixed[day] || {};
                const isSaturday = day === 'Saturday';

                return (
                  <tr key={day} className="hover:bg-slate-50/50">
                    {/* Day label */}
                    <td className="p-3 text-left font-bold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                      {day}
                      {isSaturday && (
                        <div className="text-[10px] text-indigo-600 font-normal">Half Day (4h)</div>
                      )}
                    </td>

                    {/* Periods 1 to 4 */}
                    {[1, 2, 3, 4].map((p) => {
                      const slot = daySlots[p];
                      const sub = slot ? subjects.find((s) => s.code === slot.subjectCode) : null;
                      const palette = sub
                        ? SUBJECT_PALETTES.find((pal) => pal.id === sub.colorId) || SUBJECT_PALETTES[0]
                        : null;

                      return (
                        <td key={p} className="p-2 border border-slate-100 align-top">
                          {slot ? (
                            <div
                              className="p-2 rounded-xl text-left relative group border bg-stripes-locked transition-all shadow-xs"
                              style={{
                                borderColor: palette ? palette.border : '#fda4af',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">
                                  {slot.subjectCode}
                                </span>
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1 rounded">
                                  LOCKED
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                {sub?.name}
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[10px]">
                                <span className="font-semibold text-rose-800">
                                  {slot.type === 'lab' ? 'Lab Block' : 'Theory'}
                                </span>
                                <button
                                  onClick={() => handleUnlockSlot(day, p)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                  title="Unlock / Remove slot"
                                >
                                  <Unlock className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setModalSlot({ day, period: p })}
                              className="w-full h-16 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all text-[11px]"
                            >
                              <Plus className="w-4 h-4 mb-0.5" />
                              <span>Prefix Slot</span>
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Lunch Break Cell */}
                    <td className="bg-amber-50/70 border-x border-amber-200 p-2 text-amber-900 font-bold text-[11px] align-middle">
                      <div className="rotate-90 sm:rotate-0 tracking-wider">LUNCH</div>
                    </td>

                    {/* Periods 5 to 7 */}
                    {isSaturday ? (
                      // Saturday Periods 5-7 strictly disabled / inactive
                      <td
                        colSpan={3}
                        className="bg-stripes-inactive border border-slate-200 p-4 align-middle text-center text-slate-500 font-semibold text-xs"
                      >
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-300 shadow-2xs">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Periods 5, 6, & 7 Inactive — Saturday Strictly 4 Hours Only</span>
                        </div>
                      </td>
                    ) : (
                      [5, 6, 7].map((p) => {
                        const slot = daySlots[p];
                        const sub = slot ? subjects.find((s) => s.code === slot.subjectCode) : null;
                        const palette = sub
                          ? SUBJECT_PALETTES.find((pal) => pal.id === sub.colorId) || SUBJECT_PALETTES[0]
                          : null;

                        return (
                          <td key={p} className="p-2 border border-slate-100 align-top">
                            {slot ? (
                              <div
                                className="p-2 rounded-xl text-left relative group border bg-stripes-locked transition-all shadow-xs"
                                style={{
                                  borderColor: palette ? palette.border : '#fda4af',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900">
                                    {slot.subjectCode}
                                  </span>
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1 rounded">
                                    LOCKED
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                  {sub?.name}
                                </div>
                                <div className="flex items-center justify-between mt-1 text-[10px]">
                                  <span className="font-semibold text-rose-800">
                                    {slot.type === 'lab' ? 'Lab Block' : 'Theory'}
                                  </span>
                                  <button
                                    onClick={() => handleUnlockSlot(day, p)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                    title="Unlock / Remove slot"
                                  >
                                    <Unlock className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setModalSlot({ day, period: p })}
                                className="w-full h-16 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all text-[11px]"
                              >
                                <Plus className="w-4 h-4 mb-0.5" />
                                <span>Prefix Slot</span>
                              </button>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREFIX MODAL (Choose Theory or Continuous Lab Block) */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">
                  Prefix & Lock Slot for {activeSection?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {modalSlot.day} — Period {modalSlot.period} ({modalSlot.period <= 4 ? 'Morning' : 'Afternoon'})
                </p>
              </div>
              <button
                onClick={() => setModalSlot(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Option A: Prefix a Theory Hour */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Prefix Theory Hour (1 Period)</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {assignedSubjects
                    .filter((s) => s.theoryHours > 0)
                    .map((sub) => {
                      const isMentorSubject = sub.name.toLowerCase().includes('mentor');
                      return (
                        <div
                          key={sub.code}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-xs text-slate-900 mr-2">
                              {sub.code}
                            </span>
                            <span className="text-xs text-slate-600">{sub.name}</span>
                          </div>
                          <button
                            onClick={() => handlePrefixTheory(sub.code, isMentorSubject)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                          >
                            Lock 1h
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Option B: Prefix a Continuous Lab Block (2 or 3 Periods) */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Beaker className="w-3.5 h-3.5 text-purple-600" />
                  <span>Prefix Continuous Lab Block</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {assignedSubjects
                    .filter((s) => s.labHours > 0)
                    .map((sub) => (
                      <div
                        key={sub.code}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-purple-200 bg-purple-50/30 hover:bg-purple-50 transition-colors"
                      >
                        <div>
                          <span className="font-bold text-xs text-purple-900 mr-2">
                            {sub.code}
                          </span>
                          <span className="text-xs text-slate-700">{sub.name}</span>
                          <div className="text-[10px] text-purple-600 font-medium">
                            Requires {sub.labHours} continuous periods block
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePrefixLabBlock(sub.code, sub.labHours >= 3 ? 3 : 2)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-2xs"
                          >
                            Lock {sub.labHours}h Block
                          </button>
                        </div>
                      </div>
                    ))}
                  {assignedSubjects.filter((s) => s.labHours > 0).length === 0 && (
                    <div className="text-xs text-slate-400 italic">
                      No lab subjects assigned to this section.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalSlot(null)}
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
