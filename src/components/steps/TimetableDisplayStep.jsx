import React, { useState } from 'react';
import { 
  Grid, 
  Lock, 
  Sparkles, 
  Award, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Beaker, 
  Layers, 
  ArrowLeftRight,
  Printer
} from 'lucide-react';
import { DAYS, DAY_PERIODS, PERIOD_TIMINGS, SUBJECT_PALETTES, getSubjectAcronym } from '../../types/constants';
import { validateSwap } from '../../services/scheduler';

export const TimetableDisplayStep = ({
  sections,
  subjects,
  faculty,
  timetables,
  setTimetables,
  prefixedSlots,
  setActiveStep,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || '');
  const [selectedSlotForSwap, setSelectedSlotForSwap] = useState(null); // { day, period }
  const [draggedSlot, setDraggedSlot] = useState(null); // { day, period }
  const [swapAlert, setSwapAlert] = useState(null); // { message, type: 'error' | 'success' }
  const [history, setHistory] = useState([]); // For Undo

  const activeSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const activeTimetable = timetables[activeSection?.id] || {};
  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  // Execute Swap with Hard Collision Guard
  const performSwap = (day1, period1, day2, period2) => {
    // If same slot, do nothing
    if (day1 === day2 && Number(period1) === Number(period2)) {
      setSelectedSlotForSwap(null);
      return;
    }

    // Hard Collision Guard validation
    const validation = validateSwap({
      sectionId: activeSection.id,
      day1,
      period1,
      day2,
      period2,
      timetables,
      allFaculty: faculty,
    });

    if (!validation.allowed) {
      setSwapAlert({
        type: 'error',
        message: `Swap Blocked by Hard Collision Guard: ${validation.reason}`,
      });
      setSelectedSlotForSwap(null);
      return;
    }

    // Save previous state for Undo
    const previousTimetables = JSON.parse(JSON.stringify(timetables));
    setHistory((prev) => [...prev, previousTimetables]);

    // Perform swap in active section
    setTimetables((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const secGrid = copy[activeSection.id];

      const slot1 = secGrid[day1]?.[period1] || null;
      const slot2 = secGrid[day2]?.[period2] || null;

      if (!secGrid[day1]) secGrid[day1] = {};
      if (!secGrid[day2]) secGrid[day2] = {};

      secGrid[day1][period1] = slot2;
      secGrid[day2][period2] = slot1;

      return copy;
    });

    setSwapAlert({
      type: 'success',
      message: `Successfully swapped ${day1} Period ${period1} with ${day2} Period ${period2}!`,
    });
    setSelectedSlotForSwap(null);
  };

  // Undo last swap
  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setTimetables(last);
    setHistory((prev) => prev.slice(0, -1));
    setSwapAlert({
      type: 'success',
      message: 'Undo successful! Timetable reverted to previous state.',
    });
  };

  // Click-to-swap handler
  const handleSlotClick = (day, period) => {
    if (day === 'Saturday' && period > 4) return;

    if (!selectedSlotForSwap) {
      // Select first slot
      setSelectedSlotForSwap({ day, period });
    } else {
      // Select second slot and swap
      performSwap(selectedSlotForSwap.day, selectedSlotForSwap.period, day, period);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, day, period) => {
    setDraggedSlot({ day, period });
    e.dataTransfer.setData('text/plain', JSON.stringify({ day, period }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetDay, targetPeriod) => {
    e.preventDefault();
    if (!draggedSlot) return;
    performSwap(draggedSlot.day, draggedSlot.period, targetDay, targetPeriod);
    setDraggedSlot(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 no-print">
        {/* Row 1: Title, Live Badge, Subtitle & Action Controls (Undo / Print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Colorful Timetable Display & Interactive Drag-and-Swap
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Live Interactive Grid
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Same-subject matching 2px solid colored outlines, Gold Halo for Tutor hour, and Hard Collision Guard protection.
            </p>
          </div>

          {/* Action Buttons: Undo & Print */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            {history.length > 0 && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Undo last swap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Swap ({history.length})</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>Print View</span>
            </button>
          </div>
        </div>

        {/* Row 2: Section Switcher Toolbar */}
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
                  onClick={() => {
                    setSelectedSectionId(sec.id);
                    setSelectedSlotForSwap(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeSection?.id === sec.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-600/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Swap Alert Bar */}
      {swapAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all no-print ${
            swapAlert.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-medium">
            {swapAlert.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{swapAlert.message}</span>
          </div>

          <button
            onClick={() => setSwapAlert(null)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selected for Swap Pill */}
      {selectedSlotForSwap && (
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-900 no-print animate-pulse">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
            <span>
              Selected <strong>{selectedSlotForSwap.day} Period {selectedSlotForSwap.period}</strong> for swap. Click another open or un-locked slot to swap!
            </span>
          </div>
          <button
            onClick={() => setSelectedSlotForSwap(null)}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Cancel Swap
          </button>
        </div>
      )}

      {/* Main Timetable Card (Print-ready) */}
      {!activeSection ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Grid className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No Timetables Generated Yet</h3>
            <p className="text-xs text-slate-500">
              Please enter your manual data (Faculty, Subjects, Sections, Allocations), then generate your schedules in Step 6.
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-landscape">
        {/* Printable Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {activeSection?.id}
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {activeSection?.name} Timetable
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Academic Year {activeSection?.year}</span>
              <span>•</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Class Tutor: <strong>{facultyMap[activeSection?.mentorFacultyId]?.name || 'Unassigned'}</strong>
              </span>
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] no-print">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded tutor-glow bg-amber-50" />
              <span className="text-slate-600">Tutor Hour (Gold Halo)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-stripes-locked border border-rose-300" />
              <span className="text-slate-600">Locked / Prefixed</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-stripes-inactive border border-slate-300" />
              <span className="text-slate-600">Sat Inactive</span>
            </div>
          </div>
        </div>

        {/* Timetable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
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
                {/* Lunch Break */}
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
                const dayGrid = activeTimetable[day] || {};
                const isSaturday = day === 'Saturday';

                return (
                  <tr key={day} className="hover:bg-slate-50/50">
                    {/* Day Column */}
                    <td className="p-3 text-left font-bold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                      {day}
                      {isSaturday && (
                        <div className="text-[10px] text-indigo-600 font-normal">Half Day (4h)</div>
                      )}
                    </td>

                    {/* Periods 1 to 4 */}
                    {[1, 2, 3, 4].map((p) => {
                      const slot = dayGrid[p];
                      const isSelected =
                        selectedSlotForSwap &&
                        selectedSlotForSwap.day === day &&
                        selectedSlotForSwap.period === p;

                      return (
                        <td
                          key={p}
                          className={`p-1.5 border border-slate-100 align-top transition-all ${
                            isSelected ? 'ring-2 ring-indigo-600 bg-indigo-50' : ''
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day, p)}
                        >
                          {slot ? (
                            <SlotBox
                              slot={slot}
                              day={day}
                              period={p}
                              facultyMap={facultyMap}
                              subjectsMap={subjectsMap}
                              activeSection={activeSection}
                              onClick={() => handleSlotClick(day, p)}
                              onDragStart={(e) => handleDragStart(e, day, p)}
                            />
                          ) : (
                            <div
                              onClick={() => handleSlotClick(day, p)}
                              className="w-full h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-400 text-[11px] cursor-pointer"
                            >
                              Free Slot
                            </div>
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
                      <td
                        colSpan={3}
                        className="bg-stripes-inactive border border-slate-200 p-4 align-middle text-center text-slate-500 font-semibold text-xs"
                      >
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-slate-300 shadow-2xs">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Saturday Periods 5–7 Inactive (Half-Day)</span>
                        </div>
                      </td>
                    ) : (
                      [5, 6, 7].map((p) => {
                        const slot = dayGrid[p];
                        const isSelected =
                          selectedSlotForSwap &&
                          selectedSlotForSwap.day === day &&
                          selectedSlotForSwap.period === p;

                        return (
                          <td
                            key={p}
                            className={`p-1.5 border border-slate-100 align-top transition-all ${
                              isSelected ? 'ring-2 ring-indigo-600 bg-indigo-50' : ''
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day, p)}
                          >
                            {slot ? (
                              <SlotBox
                                slot={slot}
                                day={day}
                                period={p}
                                facultyMap={facultyMap}
                                subjectsMap={subjectsMap}
                                activeSection={activeSection}
                                onClick={() => handleSlotClick(day, p)}
                                onDragStart={(e) => handleDragStart(e, day, p)}
                              />
                            ) : (
                              <div
                                onClick={() => handleSlotClick(day, p)}
                                className="w-full h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-400 text-[11px] cursor-pointer"
                              >
                                Free Slot
                              </div>
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
      )}
    </div>
  );
};

// Sub-component: Individual Slot Box with Same Subject Palette & 2px Solid Border + Tutor Halo
const SlotBox = ({
  slot,
  day,
  period,
  facultyMap,
  subjectsMap,
  activeSection,
  onClick,
  onDragStart,
}) => {
  const sub = subjectsMap[slot.subjectCode];
  const palette = sub
    ? SUBJECT_PALETTES.find((p) => p.id === sub.colorId) || SUBJECT_PALETTES[0]
    : SUBJECT_PALETTES[0];

  // Tutor Hour logic
  const isTutorHour =
    slot.isTutorHour ||
    (slot.subjectName && slot.subjectName.toLowerCase().includes('mentor')) ||
    (slot.facultyIds && slot.facultyIds.includes(activeSection?.mentorFacultyId) && slot.subjectCode.includes('208'));

  const facultyNames = (slot.facultyIds || [])
    .map((id) => facultyMap[id]?.name || id)
    .join(', ');

  return (
    <div
      draggable={!slot.isLocked}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-2 rounded-xl text-left relative transition-all duration-150 cursor-pointer select-none group min-h-[78px] flex flex-col justify-between ${
        isTutorHour ? 'tutor-glow' : ''
      } ${slot.isLocked ? 'bg-stripes-locked' : ''}`}
      style={{
        backgroundColor: slot.isLocked ? undefined : palette.bg,
        border: `2px solid ${palette.border}`,
        boxShadow: isTutorHour ? undefined : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      title={`${slot.subjectCode}: ${sub?.name || ''} | Faculty: ${facultyNames} ${
        slot.isLocked ? '(LOCKED)' : '(Drag or click to swap)'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1">
          <span
            className="font-bold text-xs leading-none"
            style={{ color: palette.text }}
          >
            {slot.subjectCode}
          </span>

          <div className="flex items-center gap-1">
            {slot.type === 'lab' && (
              <span className="p-0.5 rounded bg-purple-600 text-white text-[9px] font-bold">
                LAB
              </span>
            )}
            {slot.isLocked && (
              <Lock className="w-3 h-3 text-rose-600 shrink-0" title="Prefixed & Locked" />
            )}
            {isTutorHour && (
              <span className="px-1 py-0.2 rounded bg-amber-500 text-white font-bold text-[9px] flex items-center gap-0.5 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5" /> TUTOR
              </span>
            )}
          </div>
        </div>

        <div className="my-1">
          <div
            className="font-black text-sm tracking-tight text-slate-900 group-hover:text-indigo-900 transition-colors"
            title={`${slot.subjectCode}: ${sub?.name || slot.subjectCode}`}
          >
            {getSubjectAcronym(sub?.name || slot.subjectName || slot.subjectCode, slot.subjectCode)}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-600 font-medium truncate mt-1 pt-1 border-t border-black/5">
        {facultyNames || 'Unassigned'}
      </div>
    </div>
  );
};
