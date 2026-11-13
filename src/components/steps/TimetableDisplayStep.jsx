import React, { useState, useMemo, useEffect } from 'react';
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

  // Active source slot (either held via drag or selected via click)
  const activeSourceSlot = draggedSlot || selectedSlotForSwap;

  // Compute all collision-free valid swap/move destination slots in real time (<0.5ms)
  const validSwapTargets = useMemo(() => {
    if (!activeSourceSlot || !activeSection) return new Set();

    const validKeys = new Set();
    const sourceSlot = activeTimetable[activeSourceSlot.day]?.[activeSourceSlot.period];
    // A locked slot cannot be moved
    if (sourceSlot?.isLocked) return validKeys;

    for (const day of DAYS) {
      const maxP = day === 'Saturday' ? 4 : 7;
      for (let p = 1; p <= maxP; p++) {
        // Skip self
        if (day === activeSourceSlot.day && Number(p) === Number(activeSourceSlot.period)) {
          continue;
        }

        const res = validateSwap({
          sectionId: activeSection.id,
          day1: activeSourceSlot.day,
          period1: activeSourceSlot.period,
          day2: day,
          period2: p,
          timetables,
          allFaculty: faculty,
        });

        if (res.allowed) {
          validKeys.add(`${day}_${p}`);
        }
      }
    }
    return validKeys;
  }, [activeSourceSlot, activeSection, activeTimetable, timetables, faculty]);

  // Keyboard shortcut: Press Escape to cancel active slot selection or drag
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedSlotForSwap(null);
        setDraggedSlot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Click-to-swap handler with interactive green lighting validation
  const handleSlotClick = (day, period) => {
    if (day === 'Saturday' && period > 4) return;

    if (!selectedSlotForSwap) {
      // Nothing currently selected: check if clicked slot is eligible to be a source
      const slot = activeTimetable[day]?.[period];
      if (!slot) {
        setSwapAlert({
          type: 'error',
          message: 'Please select an assigned subject slot first to move or swap it.',
        });
        return;
      }
      if (slot.isLocked) {
        setSwapAlert({
          type: 'error',
          message: `Slot (${day} P${period}: ${slot.subjectCode}) is locked/prefixed and cannot be moved.`,
        });
        return;
      }
      // Set as active source slot
      setSelectedSlotForSwap({ day, period });
      setSwapAlert(null);
    } else {
      // Slot already selected
      // If clicking the same slot again, toggle/deselect
      if (selectedSlotForSwap.day === day && Number(selectedSlotForSwap.period) === Number(period)) {
        setSelectedSlotForSwap(null);
        return;
      }

      // Check if target slot is among the valid collision-free targets
      const targetKey = `${day}_${period}`;
      if (validSwapTargets.has(targetKey)) {
        performSwap(selectedSlotForSwap.day, selectedSlotForSwap.period, day, period);
      } else {
        // Target is invalid / resting: show exact collision guard reason
        const validation = validateSwap({
          sectionId: activeSection.id,
          day1: selectedSlotForSwap.day,
          period1: selectedSlotForSwap.period,
          day2: day,
          period2: period,
          timetables,
          allFaculty: faculty,
        });
        setSwapAlert({
          type: 'error',
          message: `Swap Blocked: ${validation.reason || 'Resting slot cannot be moved to.'}`,
        });
      }
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, day, period) => {
    const slot = activeTimetable[day]?.[period];
    if (slot?.isLocked) {
      e.preventDefault();
      return;
    }
    setDraggedSlot({ day, period });
    e.dataTransfer.setData('text/plain', JSON.stringify({ day, period }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
  };

  const handleDragOver = (e, day, period) => {
    e.preventDefault();
    if (day === 'Saturday' && period > 4) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    const key = `${day}_${period}`;
    if (validSwapTargets.has(key)) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
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

      {/* Selected for Swap Live Guidance Banner */}
      {selectedSlotForSwap && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800 shadow-sm no-print">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Moving:</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[11px]">
                  {activeTimetable[selectedSlotForSwap.day]?.[selectedSlotForSwap.period]?.subjectCode || 'Period'} ({selectedSlotForSwap.day} P{selectedSlotForSwap.period})
                </span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  {validSwapTargets.size} Valid Destination{validSwapTargets.size === 1 ? '' : 's'} Available
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                All collision-free target periods are <strong>blinking with green lighting</strong>. Click or drop on any green slot to swap safely. Resting (dimmed) slots are blocked by collisions or locks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedSlotForSwap(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors"
            >
              Cancel Swap (Esc)
            </button>
          </div>
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
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-500 shadow-xs animate-pulse" />
              <span className="text-slate-700 font-semibold">Available Swap (Green Glow)</span>
            </div>
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
                      const isSource =
                        activeSourceSlot &&
                        activeSourceSlot.day === day &&
                        Number(activeSourceSlot.period) === Number(p);
                      const isValidTarget = validSwapTargets.has(`${day}_${p}`);
                      const isResting = activeSourceSlot && !isSource && !isValidTarget;

                      return (
                        <td
                          key={p}
                          className={`p-1.5 border align-top transition-all ${
                            isSource
                              ? 'border-indigo-400 bg-indigo-50/50'
                              : isValidTarget
                              ? 'border-emerald-300 bg-emerald-50/30'
                              : isResting
                              ? 'border-slate-100 opacity-40'
                              : 'border-slate-100'
                          }`}
                          onDragOver={(e) => handleDragOver(e, day, p)}
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
                              isSource={isSource}
                              isValidTarget={isValidTarget}
                              isResting={isResting}
                              onClick={() => handleSlotClick(day, p)}
                              onDragStart={(e) => handleDragStart(e, day, p)}
                              onDragEnd={handleDragEnd}
                            />
                          ) : (
                            <div
                              onClick={() => handleSlotClick(day, p)}
                              className={`w-full h-20 rounded-xl flex flex-col items-center justify-center text-xs transition-all select-none ${
                                isValidTarget
                                  ? 'valid-swap-glow border-2 border-emerald-500 bg-emerald-50/90 text-emerald-800 font-bold shadow-md cursor-pointer'
                                  : isResting
                                  ? 'border-2 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed'
                                  : 'border-2 border-dashed border-slate-200 hover:border-slate-300 text-slate-400 cursor-pointer'
                              }`}
                              title={
                                isValidTarget
                                  ? '✓ Available Free Slot: Click or drop here to move subject into this period'
                                  : isResting
                                  ? '✕ Resting: Collision prevents moving here'
                                  : 'Free Slot'
                              }
                            >
                              {isValidTarget ? (
                                <>
                                  <div className="flex items-center gap-1 text-emerald-700">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                    <span className="text-[10px] uppercase tracking-wider font-extrabold">Available</span>
                                  </div>
                                  <span className="text-[10px] text-emerald-600 font-medium">Free Slot</span>
                                </>
                              ) : (
                                <span className="text-[11px]">Free Slot</span>
                              )}
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
                        const isSource =
                          activeSourceSlot &&
                          activeSourceSlot.day === day &&
                          Number(activeSourceSlot.period) === Number(p);
                        const isValidTarget = validSwapTargets.has(`${day}_${p}`);
                        const isResting = activeSourceSlot && !isSource && !isValidTarget;

                        return (
                          <td
                            key={p}
                            className={`p-1.5 border align-top transition-all ${
                              isSource
                                ? 'border-indigo-400 bg-indigo-50/50'
                                : isValidTarget
                                ? 'border-emerald-300 bg-emerald-50/30'
                                : isResting
                                ? 'border-slate-100 opacity-40'
                                : 'border-slate-100'
                            }`}
                            onDragOver={(e) => handleDragOver(e, day, p)}
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
                                isSource={isSource}
                                isValidTarget={isValidTarget}
                                isResting={isResting}
                                onClick={() => handleSlotClick(day, p)}
                                onDragStart={(e) => handleDragStart(e, day, p)}
                                onDragEnd={handleDragEnd}
                              />
                            ) : (
                              <div
                                onClick={() => handleSlotClick(day, p)}
                                className={`w-full h-20 rounded-xl flex flex-col items-center justify-center text-xs transition-all select-none ${
                                  isValidTarget
                                    ? 'valid-swap-glow border-2 border-emerald-500 bg-emerald-50/90 text-emerald-800 font-bold shadow-md cursor-pointer'
                                    : isResting
                                    ? 'border-2 border-dashed border-slate-200 text-slate-300 opacity-40 cursor-not-allowed'
                                    : 'border-2 border-dashed border-slate-200 hover:border-slate-300 text-slate-400 cursor-pointer'
                                }`}
                                title={
                                  isValidTarget
                                    ? '✓ Available Free Slot: Click or drop here to move subject into this period'
                                    : isResting
                                    ? '✕ Resting: Collision prevents moving here'
                                    : 'Free Slot'
                                }
                              >
                                {isValidTarget ? (
                                  <>
                                    <div className="flex items-center gap-1 text-emerald-700">
                                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                      <span className="text-[10px] uppercase tracking-wider font-extrabold">Available</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 font-medium">Free Slot</span>
                                  </>
                                ) : (
                                  <span className="text-[11px]">Free Slot</span>
                                )}
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

// Sub-component: Individual Slot Box with Same Subject Palette & 2px Solid Border + Tutor Halo + Green Swap Glow
const SlotBox = ({
  slot,
  day,
  period,
  facultyMap,
  subjectsMap,
  activeSection,
  isSource,
  isValidTarget,
  isResting,
  onClick,
  onDragStart,
  onDragEnd,
}) => {
  const sub = subjectsMap[slot.subjectCode];
  const palette = sub
    ? SUBJECT_PALETTES.find((p) => p.id === sub.colorId) || SUBJECT_PALETTES[0]
    : SUBJECT_PALETTES[0];

  // Tutor Hour logic
  const isTutorHour =
    slot.isTutorHour ||
    (slot.subjectName && slot.subjectName.toLowerCase().includes('mentor')) ||
    (slot.facultyIds &&
      slot.facultyIds.includes(activeSection?.mentorFacultyId) &&
      slot.subjectCode.includes('208'));

  const facultyNames = (slot.facultyIds || [])
    .map((id) => facultyMap[id]?.name || id)
    .join(', ');

  return (
    <div
      draggable={!slot.isLocked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`p-2 rounded-xl text-left relative transition-all duration-150 select-none group min-h-[78px] flex flex-col justify-between ${
        isTutorHour ? 'tutor-glow' : ''
      } ${slot.isLocked ? 'bg-stripes-locked' : ''} ${
        isSource
          ? 'ring-2 ring-indigo-600 ring-offset-2 scale-[1.02] shadow-md z-30'
          : isValidTarget
          ? 'valid-swap-glow cursor-pointer'
          : isResting
          ? 'opacity-40 grayscale-[25%] cursor-not-allowed hover:opacity-50'
          : 'cursor-pointer hover:shadow-md'
      }`}
      style={{
        backgroundColor: isValidTarget
          ? '#ecfdf5'
          : slot.isLocked
          ? undefined
          : palette.bg,
        border: isValidTarget
          ? '2px solid #059669'
          : isSource
          ? '2px solid #4f46e5'
          : `2px solid ${palette.border}`,
        boxShadow: isValidTarget
          ? undefined
          : isTutorHour
          ? undefined
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
      title={
        isValidTarget
          ? `✓ Available Period! Click or drop here to swap with ${slot.subjectCode}`
          : isResting
          ? `✕ Resting Period: Cannot move here due to collision or lock`
          : `${slot.subjectCode}: ${sub?.name || ''} | Faculty: ${facultyNames} ${
              slot.isLocked ? '(LOCKED)' : '(Drag or click to swap)'
            }`
      }
    >
      {/* Visual Badges for Swap status */}
      {isSource && (
        <div className="absolute -top-2 -right-1 bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 z-30 pointer-events-none">
          <ArrowLeftRight className="w-2.5 h-2.5" /> SOURCE
        </div>
      )}
      {isValidTarget && (
        <div className="absolute -top-2 -right-1 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 z-30 pointer-events-none animate-pulse">
          <Sparkles className="w-2.5 h-2.5" /> CAN SWAP
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-1">
          <span
            className="font-bold text-xs leading-none"
            style={{ color: isValidTarget ? '#065f46' : palette.text }}
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
            className={`font-black text-sm tracking-tight transition-colors ${
              isValidTarget
                ? 'text-emerald-950'
                : 'text-slate-900 group-hover:text-indigo-900'
            }`}
            title={`${slot.subjectCode}: ${sub?.name || slot.subjectCode}`}
          >
            {getSubjectAcronym(sub?.name || slot.subjectName || slot.subjectCode, slot.subjectCode)}
          </div>
        </div>
      </div>

      <div className={`text-[10px] font-medium truncate mt-1 pt-1 border-t ${
        isValidTarget ? 'text-emerald-800 border-emerald-200' : 'text-slate-600 border-black/5'
      }`}>
        {facultyNames || 'Unassigned'}
      </div>
    </div>
  );
};
