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
  RefreshCw,
  Award,
  Sun,
  RotateCcw,
  Zap,
  GraduationCap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateDepartmentTimetable, computeSectionTally } from '../../services/scheduler';
import { YEARS, YEAR_LABELS } from '../../types/constants';

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
  const [selectedScope, setSelectedScope] = useState('all'); // 'all' | 'year-1' | 'year-2' | 'year-3' | 'year-4' | sectionId
  const [isSolving, setIsSolving] = useState(false);
  const [solverResult, setSolverResult] = useState(null);

  // Compute target sections based on selectedScope
  const getTargetSections = () => {
    if (selectedScope === 'all') return sections;
    if (selectedScope.startsWith('year-')) {
      const yr = parseInt(selectedScope.replace('year-', ''), 10);
      return sections.filter((s) => s.year === yr);
    }
    return sections.filter((s) => s.id === selectedScope);
  };

  const targetSections = getTargetSections();

  // Check Gatekeeper status for TARGET sections
  const sectionTallies = targetSections.map((sec) => ({
    section: sec,
    tally: computeSectionTally(sec.id, subjects, allocations, prefixedSlots),
  }));

  const allBalanced = targetSections.length > 0 && sectionTallies.every((st) => st.tally.isBalanced);
  const unbalancedSections = sectionTallies.filter((st) => !st.tally.isBalanced);

  // Trigger generator
  const handleGenerate = () => {
    if (!allBalanced) {
      alert('Cannot generate timetable: Some sections in the selected scope do not satisfy the 39-hour tally reconciliation constraint.');
      return;
    }

    setIsSolving(true);
    setSolverResult(null);

    // Fast asynchronous invocation to allow UI to render spinner before instant solve
    setTimeout(() => {
      const res = generateDepartmentTimetable({
        sections,
        subjects,
        faculty,
        allocations,
        prefixedSlots,
        targetScope: selectedScope,
        existingTimetables: timetables,
      });

      setIsSolving(false);
      setSolverResult(res);

      if (res.success) {
        setTimetables(res.timetables);
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }, 120);
  };

  const metrics = solverResult?.stats?.qualityMetrics;

  // Available years that actually have sections
  const availableYears = YEARS.filter((yr) => sections.some((s) => s.year === yr));

  return (
    <div className="space-y-6">
      {/* Scope Selector Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Timetable Generation Scope
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate schedules for the entire year or college department at once without any lag.
          </p>
        </div>

        {/* Scope Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedScope('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedScope === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Years ({sections.length} Sec)
          </button>

          {YEARS.map((yr) => {
            const secInYear = sections.filter((s) => s.year === yr);
            if (secInYear.length === 0) return null;
            const scopeKey = `year-${yr}`;
            return (
              <button
                key={scopeKey}
                onClick={() => setSelectedScope(scopeKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedScope === scopeKey
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {YEAR_LABELS[yr]} ({secInYear.length} Sec)
              </button>
            );
          })}

          {/* Section dropdown for single-section targeting */}
          <select
            value={selectedScope.startsWith('SEC-') ? selectedScope : ''}
            onChange={(e) => e.target.value && setSelectedScope(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="">Single Section...</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Banner & Generation Action */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Timetable Generation & Optimization Engine
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              High-Speed CSP Solver (&lt;10ms)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Targeting{' '}
            <strong className="text-slate-800">
              {selectedScope === 'all'
                ? 'All Department Sections'
                : selectedScope.startsWith('year-')
                ? `Whole Year ${selectedScope.replace('year-', '')} (${targetSections.length} sections)`
                : targetSections[0]?.name || 'Selected Section'}
            </strong>
            . Enforces 2h AM / 2h PM split, Period 1 rotation, slot staggering, and faculty rest gaps with zero collisions.
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
                <span>Solving Constraints...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {selectedScope === 'all'
                    ? 'Generate All Timetables'
                    : selectedScope.startsWith('year-')
                    ? `Generate Whole Year ${selectedScope.replace('year-', '')}`
                    : `Generate ${targetSections[0]?.name || 'Section'}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gatekeeper Check Card */}
      {targetSections.length === 0 ? (
        <div className="p-8 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-amber-950">No Class Sections in Selected Scope</h4>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Please add your Faculty in Step 1, Subjects in Step 2, and create Sections in Step 3 for this year before generating schedules.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveStep?.(3)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-md shadow-indigo-100"
            >
              Step 3: Create Class Section &rarr;
            </button>
          </div>
        </div>
      ) : !allBalanced && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gatekeeper Warning: 39-Period Tally Not Reconciled in Target Scope</span>
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

      {/* Engine Status & Quality Score Breakdown */}
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
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  solverResult.success
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-rose-600 text-white shadow-md'
                }`}
              >
                {solverResult.success ? (
                  <Check className="w-7 h-7 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">
                    {solverResult.success
                      ? 'Timetable Generated Successfully!'
                      : 'Scheduling Engine Error'}
                  </h3>
                  {solverResult.success && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                      Grade {solverResult.stats?.grade} ({solverResult.stats?.optimizationTier})
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 text-slate-700">
                  {solverResult.success
                    ? `Placed 100% of curriculum hours across ${solverResult.stats?.sectionsScheduled} sections in ${solverResult.stats?.timeMs}ms with zero collisions!`
                    : solverResult.error}
                </p>
                {solverResult.success && solverResult.stats && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-mono">
                    <span>Runtime: {solverResult.stats.timeMs}ms</span>
                    <span>•</span>
                    <span>Attempts: {solverResult.stats.attempts}</span>
                    <span>•</span>
                    <span>Iterations: {solverResult.stats.iterations}</span>
                    <span>•</span>
                    <span>Total Slots Filled: {solverResult.stats.totalSlots}</span>
                  </div>
                )}
              </div>
            </div>

            {solverResult.success && (
              <button
                onClick={() => setActiveStep(7)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 shrink-0"
              >
                <span>View Timetable Grid</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Detailed Optimization Quality Audit Metrics */}
          {solverResult.success && metrics && (
            <div className="mt-6 pt-5 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1 */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    4h AM/PM Balance
                  </span>
                  <span className="font-bold text-emerald-700">{metrics.subjectBalanceScore}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${metrics.subjectBalanceScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Target: 2 before lunch, 2 after lunch
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                    First-Hour Rotation
                  </span>
                  <span className="font-bold text-indigo-700">{metrics.firstHourRotationScore}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${metrics.firstHourRotationScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Rotates every subject to Period 1
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    Period Staggering
                  </span>
                  <span className="font-bold text-purple-700">{metrics.periodDiversityScore}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${metrics.periodDiversityScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Avoids repeating same slot daily
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white/80 p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Faculty Rest Gaps
                  </span>
                  <span className="font-bold text-blue-700">{metrics.facultyGapsScore}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${metrics.facultyGapsScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Prevents 3+ consecutive periods
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Constraints & Optimization Rules Visualizer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Inviolable Hard Constraints */}
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
                <strong className="text-slate-900">Continuous Lab Blocks:</strong>
                <p className="text-slate-500 mt-0.5">
                  Remaining unprefixed labs are scheduled as 2 or 3 continuous periods within morning or afternoon sessions without crossing lunch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Box 2: Subject & Faculty Allocation Optimization Constraints */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Subject & Faculty Allocation Optimization
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Rule 1 */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <strong className="text-slate-900">Subject Hour Allocation (2h AM / 2h PM):</strong>
                <p className="text-slate-600 mt-0.5">
                  4-hour subjects are allocated 2 hours before lunch and 2 hours after lunch. Distributes hours evenly across the week and avoids lumping in the same half of the day.
                </p>
              </div>
            </div>

            {/* Rule 2 */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <strong className="text-slate-900">First-Hour Rotation (Period 1):</strong>
                <p className="text-slate-600 mt-0.5">
                  Every subject gets an opportunity to appear in Period 1. Each subject appears in the first hour before repeating, preventing the same subject from monopolizing morning start.
                </p>
              </div>
            </div>

            {/* Rule 3 */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <strong className="text-slate-900">Period Rotation & Afternoon Staggering:</strong>
                <p className="text-slate-600 mt-0.5">
                  Rotates subjects across different period indices throughout the week. Alternates afternoon hours across Periods 5, 6, and 7 to avoid afternoon fatigue.
                </p>
              </div>
            </div>

            {/* Rule 4 & 5 */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                4-5
              </span>
              <div>
                <strong className="text-slate-900">Faculty Inter-Class Balance & Gaps:</strong>
                <p className="text-slate-600 mt-0.5">
                  Avoids assigning the same faculty to the same period across multiple classes. Prevents 3+ consecutive back-to-back teaching periods across classes to ensure sufficient rest gaps.
                </p>
              </div>
            </div>

            {/* Rule 6 */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                6
              </span>
              <div>
                <strong className="text-emerald-950">Adaptive Best-Case vs. Worst-Case Relaxation:</strong>
                <p className="text-slate-600 mt-0.5">
                  Prioritizes optimal best-case distribution. If faculty constraints are tight, automatically relaxes soft penalties in subsequent passes so no periods are ever left unassigned.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
