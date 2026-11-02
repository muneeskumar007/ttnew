import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download,
  Building2,
  Calendar
} from 'lucide-react';
import { DAYS, DAY_PERIODS, SUBJECT_PALETTES } from '../../types/constants';

export const FacultyMatrixStep = ({
  faculty,
  timetables,
  subjects,
  sections,
}) => {
  const [selectedFacultyId, setSelectedFacultyId] = useState(faculty[0]?.id || '');
  const activeFaculty = faculty.find((f) => f.id === selectedFacultyId) || faculty[0];

  const sectionsMap = Object.fromEntries(sections.map((s) => [s.id, s]));
  const subjectsMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  // Build faculty schedule grid: { [day]: { [period]: slotInfo } }
  const facultyGrid = {};
  let totalAssignedHours = 0;
  let totalCollisions = 0;

  DAYS.forEach((day) => {
    facultyGrid[day] = {};
    const maxP = DAY_PERIODS[day];

    for (let p = 1; p <= maxP; p++) {
      const commitments = [];

      // 1. Check Other Department Locked Slots
      if (activeFaculty?.lockedSlots) {
        const ext = activeFaculty.lockedSlots.find(
          (ls) => ls.day === day && Number(ls.period) === Number(p)
        );
        if (ext) {
          commitments.push({
            type: 'external',
            dept: ext.dept,
            reason: ext.reason,
          });
        }
      }

      // 2. Check Internal Department Schedules
      Object.entries(timetables).forEach(([secId, secGrid]) => {
        const slot = secGrid[day]?.[p];
        if (slot && slot.facultyIds && slot.facultyIds.includes(activeFaculty?.id)) {
          commitments.push({
            type: 'internal',
            sectionId: secId,
            sectionName: sectionsMap[secId]?.name || secId,
            subjectCode: slot.subjectCode,
            subjectName: slot.subjectName,
            isLab: slot.type === 'lab',
          });
        }
      });

      if (commitments.length > 0) {
        totalAssignedHours += 1;
        if (commitments.length > 1) {
          totalCollisions += commitments.length - 1;
        }
      }

      facultyGrid[day][p] = commitments;
    }
  });

  const externalCount = activeFaculty?.lockedSlots?.length || 0;
  const internalCount = totalAssignedHours - externalCount;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Faculty Workload Matrix (Box View)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Schedule & Clash Detection
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dedicated weekly box schedule per faculty member with explicit Other Department Locked blocks.
          </p>
        </div>

        {/* Faculty Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Select Faculty:</label>
          <select
            value={selectedFacultyId}
            onChange={(e) => setSelectedFacultyId(e.target.value)}
            className="text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 max-w-xs"
          >
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Faculty Summary Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm">
            {activeFaculty?.id}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">{activeFaculty?.name}</h3>
            <p className="text-xs text-slate-500">
              {activeFaculty?.designation} • Department of {activeFaculty?.department}
            </p>
          </div>
        </div>

        {/* Load & Clash Counter Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">
              Total Weekly Load
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {totalAssignedHours} / {activeFaculty?.maxHours} Hours
            </span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            <span className="text-indigo-600 block text-[10px] uppercase font-bold">
              Internal Classes
            </span>
            <span className="font-bold text-sm">{internalCount} Periods</span>
          </div>

          <div className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
            <span className="text-rose-600 block text-[10px] uppercase font-bold">
              Locked Other Dept
            </span>
            <span className="font-bold text-sm">{externalCount} Periods</span>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border text-xs flex items-center gap-2 ${
              totalCollisions === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {totalCollisions === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">0 Clashes Detected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="font-bold">{totalCollisions} Clashes Detected!</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Schedule Grid (Vertical: Mon-Sat, Horizontal: P1-P7) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Weekly Teaching Box View ({activeFaculty?.name})
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-300" />
              <span className="text-slate-600">Internal Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stripes-locked border border-rose-300" />
              <span className="text-slate-600">Other Dept (Locked)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
              <span className="text-slate-600">Free / Available</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="p-3 w-28 text-left font-bold border-r border-slate-200">Day</th>
                <th className="p-2.5 font-semibold">Period 1</th>
                <th className="p-2.5 font-semibold">Period 2</th>
                <th className="p-2.5 font-semibold">Period 3</th>
                <th className="p-2.5 font-semibold">Period 4</th>
                <th className="p-2 w-16 bg-amber-50 text-amber-800 font-bold border-x border-amber-200">
                  LUNCH
                </th>
                <th className="p-2.5 font-semibold">Period 5</th>
                <th className="p-2.5 font-semibold">Period 6</th>
                <th className="p-2.5 font-semibold">Period 7</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS.map((day) => {
                const daySlots = facultyGrid[day] || {};
                const isSaturday = day === 'Saturday';

                return (
                  <tr key={day} className="hover:bg-slate-50/50">
                    <td className="p-3 text-left font-bold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                      {day}
                      {isSaturday && (
                        <div className="text-[10px] text-indigo-600 font-normal">Half Day</div>
                      )}
                    </td>

                    {/* Periods 1 to 4 */}
                    {[1, 2, 3, 4].map((p) => {
                      const commitments = daySlots[p] || [];
                      return (
                        <td key={p} className="p-2 border border-slate-100 align-top">
                          <FacultySlotCell commitments={commitments} />
                        </td>
                      );
                    })}

                    {/* Lunch Break */}
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
                          <span>Saturday Periods 5–7 Inactive</span>
                        </div>
                      </td>
                    ) : (
                      [5, 6, 7].map((p) => {
                        const commitments = daySlots[p] || [];
                        return (
                          <td key={p} className="p-2 border border-slate-100 align-top">
                            <FacultySlotCell commitments={commitments} />
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
    </div>
  );
};

// Subcomponent: Faculty Slot Box
const FacultySlotCell = ({ commitments }) => {
  if (!commitments || commitments.length === 0) {
    return (
      <div className="h-16 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[11px]">
        Free
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {commitments.map((c, idx) => {
        if (c.type === 'external') {
          return (
            <div
              key={idx}
              className="p-2 rounded-xl text-left border bg-stripes-locked border-rose-300 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] text-rose-800 bg-rose-100 px-1 rounded">
                  OTHER DEPT LOAD (LOCKED)
                </span>
                <Lock className="w-3 h-3 text-rose-600" />
              </div>
              <div className="font-bold text-xs text-rose-950 mt-1">Target: {c.dept}</div>
              <div className="text-[10px] text-slate-600 truncate">{c.reason}</div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="p-2 rounded-xl text-left border border-indigo-200 bg-indigo-50/70 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-950">{c.subjectCode}</span>
              {c.isLab && (
                <span className="px-1 py-0.2 rounded bg-purple-600 text-white font-bold text-[9px]">
                  LAB
                </span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-800 truncate mt-0.5">
              {c.sectionName}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{c.subjectName}</div>
          </div>
        );
      })}
    </div>
  );
};
