import React, { useState } from 'react';
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Check, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateDepartmentTimetable, computeSectionTally } from '../../services/scheduler';

export const GenerateStep = ({
  sections,
  subjects,
  faculty,
  allocations,
  prefixedSlots,
  timetables,
  setTimetables,
  setActiveStep,
}) => {
  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState(null);

  // Check Gatekeeper status for ALL sections
  const sectionTallies = sections.map((sec) => ({
    section: sec,
    tally: computeSectionTally(sec.id, subjects, allocations, prefixedSlots),
  }));

  const allBalanced = sectionTallies.every((st) => st.tally.isBalanced);
  const unbalancedSections = sectionTallies.filter((st) => !st.tally.isBalanced);

  // Trigger generator
  const handleGenerate = () => {
    if (!allBalanced) {
      alert('Cannot generate timetable: Some sections do not satisfy the 39-hour tally reconciliation constraint.');
      return;
    }

    setIsSolving(true);
    setSolverResult(null);

    // Use setTimeout so the UI can render the solving spinner
    setTimeout(() => {
      const res = generateDepartmentTimetable({
        sections,
        subjects,
        faculty,
        allocations,
        prefixedSlots,
      });

      setIsSolving(false);
      setSolverResult(res);

      if (res.success) {
        setTimetables(res.timetables);
        // Fire confetti celebration!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Automated CSP Scheduling Engine
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Constraint Backtracking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Solves all remaining unassigned theory and lab hours while strictly adhering to hard constraints and pedagogical distribution rules.
          </p>
        </div>

        {/* Generate Action Button */}
        <div>
          <button
            onClick={handleGenerate}
            disabled={!allBalanced || isSolving}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all ${
              !allBalanced
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : isSolving
                ? 'bg-indigo-400 text-white cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:scale-[1.02]'
            }`}
          >
            {isSolving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running CSP Engine...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Generate College Timetable</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gatekeeper Check Card */}
      {!allBalanced && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gatekeeper Warning: 39-Period Tally Not Reconciled</span>
          </div>
          <p className="text-xs text-amber-800">
            The automated generator cannot run until every section's required hours tally exactly to 39 working periods per week ($(5 \times 7) + (1 \times 4) = 39$).
          </p>
          <div className="space-y-1.5 pt-1">
            {unbalancedSections.map(({ section, tally }) => (
              <div
                key={section.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-amber-200 text-xs"
              >
                <span className="font-bold text-slate-900">{section.name}:</span>
                <span className="text-amber-800 font-medium">{tally.statusMessage}</span>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveStep(5)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
            >
              Go to Step 5 (Prefix & Tally) to adjust hours &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Engine Status / Success Result */}
      {solverResult && (
        <div
          className={`p-6 rounded-2xl border transition-all ${
            solverResult.success
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/80 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  solverResult.success
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-rose-600 text-white shadow-md'
                }`}
              >
                {solverResult.success ? (
                  <Check className="w-6 h-6 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {solverResult.success
                    ? 'Timetable Generated Successfully!'
                    : 'Scheduling Engine Error'}
                </h3>
                <p className="text-xs mt-1">
                  {solverResult.success
                    ? `Resolved all constraints across ${sections.length} sections in ${solverResult.stats?.timeMs}ms with 0 collisions!`
                    : solverResult.error}
                </p>
                {solverResult.success && solverResult.stats && (
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-2 font-mono">
                    <span>Runtime: {solverResult.stats.timeMs}ms</span>
                    <span>•</span>
                    <span>Backtracking iterations: {solverResult.stats.iterations}</span>
                    <span>•</span>
                    <span>Slots resolved: {solverResult.stats.totalSlots}</span>
                  </div>
                )}
              </div>
            </div>

            {solverResult.success && (
              <button
                onClick={() => setActiveStep(7)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 shrink-0"
              >
                <span>View Timetables</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Constraints & Rules Visualizer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hard Constraints Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Hard Constraints (Inviolable Rules)
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Zero Faculty Collisions:</strong>
                <p className="text-slate-500 mt-0.5">
                  A faculty member cannot be scheduled for two classes simultaneously, nor during their locked Other Department hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Prefix Inviolability:</strong>
                <p className="text-slate-500 mt-0.5">
                  Manually prefixed Theory hours and continuous Lab blocks cannot be moved, overwritten, or displaced.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Saturday Restriction (Strictly 4 Hours):</strong>
                <p className="text-slate-500 mt-0.5">
                  Periods 5, 6, and 7 on Saturday are completely disabled for all classes and faculty.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Lab Continuity:</strong>
                <p className="text-slate-500 mt-0.5">
                  Remaining unprefixed labs are scheduled as 2 or 3 continuous periods within morning or afternoon sessions without crossing lunch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pedagogical Distribution & Balance Rules Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Pedagogical Distribution & Balance Rules
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Weekly Spread (1 hr/day):</strong>
                <p className="text-slate-500 mt-0.5">
                  Theory subjects are distributed across distinct days rather than lumped together (maximum 2 hours in a single day under tight constraints).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Slot Staggering:</strong>
                <p className="text-slate-500 mt-0.5">
                  Period timings alternate across days to avoid cognitive fatigue at the same time each day.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Morning & Afternoon Balance:</strong>
                <p className="text-slate-500 mt-0.5">
                  Hours are balanced evenly between morning sessions (Periods 1–4) and afternoon sessions (Periods 5–7).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">No Fatigue Rule:</strong>
                <p className="text-slate-500 mt-0.5">
                  Prevents back-to-back consecutive periods of the same theory subject or same faculty member in the same section.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
