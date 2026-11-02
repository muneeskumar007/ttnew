import { DAYS, DAY_PERIODS, TOTAL_WEEKLY_PERIODS } from '../types/constants';

// Validate open and prefixed tally for a section
export const computeSectionTally = (sectionId, subjects, allocations, prefixedSlots = {}) => {
  const sectionAlloc = allocations[sectionId] || {};
  const sectionPrefixed = prefixedSlots[sectionId] || {};

  // 1. Calculate total curriculum required hours
  let totalRequiredTheory = 0;
  let totalRequiredLab = 0;
  const subjectsMap = {};

  subjects.forEach((sub) => {
    subjectsMap[sub.code] = sub;
    const alloc = sectionAlloc[sub.code];
    if (alloc) {
      if (alloc.theoryFaculty && sub.theoryHours > 0) {
        totalRequiredTheory += sub.theoryHours;
      }
      if (alloc.labFaculty && alloc.labFaculty.length > 0 && sub.labHours > 0) {
        totalRequiredLab += sub.labHours;
      }
    }
  });

  const totalCurriculumHours = totalRequiredTheory + totalRequiredLab;

  // 2. Calculate prefixed hours
  let prefixedTheoryHours = 0;
  let prefixedLabHours = 0;
  let totalPrefixedSlots = 0;

  DAYS.forEach((day) => {
    const daySlots = sectionPrefixed[day] || {};
    const maxPeriods = DAY_PERIODS[day];

    for (let p = 1; p <= maxPeriods; p++) {
      const slot = daySlots[p];
      if (slot && slot.subjectCode) {
        totalPrefixedSlots++;
        if (slot.type === 'lab') {
          prefixedLabHours++;
        } else {
          prefixedTheoryHours++;
        }
      }
    }
  });

  const remainingTheoryHours = Math.max(0, totalRequiredTheory - prefixedTheoryHours);
  const remainingLabHours = Math.max(0, totalRequiredLab - prefixedLabHours);
  const remainingOpenSlots = Math.max(0, TOTAL_WEEKLY_PERIODS - totalPrefixedSlots);
  const remainingTotalNeeded = remainingTheoryHours + remainingLabHours;

  const isTotalCurriculum39 = totalCurriculumHours === TOTAL_WEEKLY_PERIODS;
  const isBalanced = isTotalCurriculum39 && remainingTotalNeeded === remainingOpenSlots;

  let statusMessage = '';
  if (!isTotalCurriculum39) {
    const diff = TOTAL_WEEKLY_PERIODS - totalCurriculumHours;
    if (diff > 0) {
      statusMessage = `Under-allocated: Curriculum totals ${totalCurriculumHours}h. Need +${diff}h more to reach 39h.`;
    } else {
      statusMessage = `Over-allocated: Curriculum totals ${totalCurriculumHours}h. Exceeds 39h by ${Math.abs(diff)}h.`;
    }
  } else if (!isBalanced) {
    statusMessage = `Mismatch: Prefixed hours (${totalPrefixedSlots}h) + Remaining hours (${remainingTotalNeeded}h) != 39 slots.`;
  } else {
    statusMessage = `Balanced: 39 Total Slots | ${totalPrefixedSlots} Prefixed | ${remainingOpenSlots} Open to Auto-Fill.`;
  }

  return {
    totalRequiredTheory,
    totalRequiredLab,
    totalCurriculumHours,
    prefixedTheoryHours,
    prefixedLabHours,
    totalPrefixedSlots,
    remainingTheoryHours,
    remainingLabHours,
    remainingOpenSlots,
    remainingTotalNeeded,
    isTotalCurriculum39,
    isBalanced,
    statusMessage,
  };
};

// Check if a faculty is busy at day, period
export const isFacultyBusy = (
  facultyId,
  day,
  period,
  currentTimetables,
  allFaculty,
  ignoreSectionId = null,
  ignorePeriod = null
) => {
  if (!facultyId) return false;

  // 1. Check Other Department Locked Hours (Hard constraint)
  const facObj = allFaculty.find((f) => f.id === facultyId);
  if (facObj && facObj.lockedSlots) {
    const isLockedExt = facObj.lockedSlots.some(
      (ls) => ls.day === day && Number(ls.period) === Number(period)
    );
    if (isLockedExt) return { busy: true, reason: 'Other Department Locked Load' };
  }

  // 2. Check collisions across all sections in departmental timetable
  for (const sId of Object.keys(currentTimetables)) {
    const secGrid = currentTimetables[sId];
    if (!secGrid || !secGrid[day]) continue;
    const slot = secGrid[day][period];
    if (slot && slot.subjectCode) {
      // If we are testing a swap in the same section, ignore the source slot
      if (sId === ignoreSectionId && Number(period) === Number(ignorePeriod)) {
        continue;
      }
      if (slot.facultyIds && slot.facultyIds.includes(facultyId)) {
        return {
          busy: true,
          reason: `Assigned to ${sId} (${slot.subjectCode})`,
          sectionId: sId,
          subjectCode: slot.subjectCode,
        };
      }
    }
  }

  return { busy: false };
};

// Candidate continuous lab blocks
const LAB_BLOCK_TEMPLATES = {
  3: {
    weekday: [
      [1, 2, 3], // Morning
      [2, 3, 4], // Morning
      [5, 6, 7], // Afternoon
    ],
    saturday: [
      [1, 2, 3], // Morning
      [2, 3, 4], // Morning
    ],
  },
  2: {
    weekday: [
      [1, 2],
      [2, 3],
      [3, 4],
      [5, 6],
      [6, 7],
    ],
    saturday: [
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
};

// Main Constraint Satisfaction Scheduler
export const generateDepartmentTimetable = ({
  sections,
  subjects,
  faculty,
  allocations,
  prefixedSlots = {},
}) => {
  const startTime = performance.now();

  // Validate tallies for all sections first
  for (const sec of sections) {
    const tally = computeSectionTally(sec.id, subjects, allocations, prefixedSlots);
    if (!tally.isBalanced) {
      return {
        success: false,
        error: `Section "${sec.name}" is not balanced: ${tally.statusMessage}`,
        sectionId: sec.id,
      };
    }
  }

  // 1. Initialize blank schedule grids for all sections
  const timetables = {};
  sections.forEach((sec) => {
    timetables[sec.id] = {};
    DAYS.forEach((day) => {
      timetables[sec.id][day] = {};
      const maxP = DAY_PERIODS[day];
      for (let p = 1; p <= maxP; p++) {
        timetables[sec.id][day][p] = null;
      }
    });
  });

  const subjectsMap = {};
  subjects.forEach((s) => {
    subjectsMap[s.code] = s;
  });

  // 2. Pre-populate all prefixed slots (Prefix Inviolability constraint)
  sections.forEach((sec) => {
    const secPrefixed = prefixedSlots[sec.id] || {};
    const secAlloc = allocations[sec.id] || {};

    DAYS.forEach((day) => {
      const daySlots = secPrefixed[day] || {};
      const maxP = DAY_PERIODS[day];

      for (let p = 1; p <= maxP; p++) {
        const slot = daySlots[p];
        if (slot && slot.subjectCode) {
          const sub = subjectsMap[slot.subjectCode];
          const alloc = secAlloc[slot.subjectCode] || {};
          const assignedFac =
            slot.type === 'lab'
              ? alloc.labFaculty || []
              : alloc.theoryFaculty
              ? [alloc.theoryFaculty]
              : [];

          timetables[sec.id][day][p] = {
            subjectCode: slot.subjectCode,
            subjectName: sub ? sub.name : slot.subjectCode,
            type: slot.type || 'theory',
            facultyIds: assignedFac,
            isLocked: true,
            isTutorHour: slot.isTutorHour || false,
            labBlockId: slot.labBlockId || null,
          };
        }
      }
    });
  });

  // 3. Build remaining items to schedule for each section
  const sectionRemainingLabs = [];
  const sectionRemainingTheory = [];

  sections.forEach((sec) => {
    const secAlloc = allocations[sec.id] || {};
    const secPrefixed = prefixedSlots[sec.id] || {};

    subjects.forEach((sub) => {
      const alloc = secAlloc[sub.code];
      if (!alloc) return;

      // Count already prefixed
      let prefixedTheoryCount = 0;
      let prefixedLabCount = 0;

      DAYS.forEach((d) => {
        const slots = secPrefixed[d] || {};
        for (let p = 1; p <= DAY_PERIODS[d]; p++) {
          const sl = slots[p];
          if (sl && sl.subjectCode === sub.code) {
            if (sl.type === 'lab') prefixedLabCount++;
            else prefixedTheoryCount++;
          }
        }
      });

      // Remaining Labs
      let remLab = Math.max(0, (sub.labHours || 0) - prefixedLabCount);
      while (remLab > 0) {
        const blockSize = remLab >= 3 ? 3 : remLab === 2 ? 2 : 1;
        sectionRemainingLabs.push({
          sectionId: sec.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          blockSize,
          facultyIds: alloc.labFaculty || [],
          type: 'lab',
        });
        remLab -= blockSize;
      }

      // Remaining Theory
      const remTheory = Math.max(0, (sub.theoryHours || 0) - prefixedTheoryCount);
      for (let i = 0; i < remTheory; i++) {
        sectionRemainingTheory.push({
          sectionId: sec.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          facultyIds: alloc.theoryFaculty ? [alloc.theoryFaculty] : [],
          type: 'theory',
        });
      }
    });
  });

  // 4. Backtracking Solver Phase 1: Schedule Remaining Labs
  // Labs have strict block continuity constraints, so we place them first
  const solveLabs = (labIndex) => {
    if (labIndex >= sectionRemainingLabs.length) {
      return true;
    }

    const labItem = sectionRemainingLabs[labIndex];
    const { sectionId, subjectCode, subjectName, blockSize, facultyIds } = labItem;
    const grid = timetables[sectionId];

    // Candidate days shuffled for variety and even spread
    const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);

    for (const day of shuffledDays) {
      // Rule: Prefer not having two labs on the exact same day for the same section
      let hasLabToday = false;
      for (let p = 1; p <= DAY_PERIODS[day]; p++) {
        if (grid[day][p] && grid[day][p].type === 'lab') {
          hasLabToday = true;
          break;
        }
      }
      if (hasLabToday && Math.random() < 0.75) continue; // Heuristic skip to balance

      const templates =
        day === 'Saturday'
          ? LAB_BLOCK_TEMPLATES[blockSize]?.saturday || []
          : LAB_BLOCK_TEMPLATES[blockSize]?.weekday || [];

      // Sort templates: weekdays afternoon vs morning
      for (const periods of templates) {
        // Hard Constraint: Saturday periods 5, 6, 7 are never allowed
        if (day === 'Saturday' && periods.some((p) => p > 4)) continue;

        // Check if all periods in this block are open in this section
        const slotsOpen = periods.every((p) => grid[day][p] === null);
        if (!slotsOpen) continue;

        // Check if all assigned faculty are free for all periods in this block
        let facFree = true;
        for (const p of periods) {
          for (const facId of facultyIds) {
            const check = isFacultyBusy(facId, day, p, timetables, faculty);
            if (check.busy) {
              facFree = false;
              break;
            }
          }
          if (!facFree) break;
        }
        if (!facFree) continue;

        // Place block
        const blockId = `${subjectCode}_${day}_${periods[0]}`;
        periods.forEach((p) => {
          grid[day][p] = {
            subjectCode,
            subjectName,
            type: 'lab',
            facultyIds,
            isLocked: false,
            labBlockId: blockId,
          };
        });

        if (solveLabs(labIndex + 1)) {
          return true;
        }

        // Backtrack
        periods.forEach((p) => {
          grid[day][p] = null;
        });
      }
    }

    return false;
  };

  const labsSuccess = solveLabs(0);
  if (!labsSuccess) {
    return {
      success: false,
      error:
        'Could not schedule all continuous Lab blocks without faculty collisions or crossing lunch breaks. Try adjusting prefixed slots or faculty allocations.',
    };
  }

  // 5. Backtracking Solver Phase 2: Schedule Remaining Theory Hours
  // Sort theory items by MRV (faculty with higher load or subjects with more remaining hours first)
  sectionRemainingTheory.sort((a, b) => {
    return (b.facultyIds.length || 0) - (a.facultyIds.length || 0);
  });

  let iterations = 0;
  const MAX_ITERATIONS = 40000;

  const solveTheory = (index) => {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      return false;
    }

    if (index >= sectionRemainingTheory.length) {
      return true;
    }

    const item = sectionRemainingTheory[index];
    const { sectionId, subjectCode, subjectName, facultyIds } = item;
    const grid = timetables[sectionId];
    const facId = facultyIds[0] || null;

    // Collect all available open slots for this section
    const openSlots = [];
    DAYS.forEach((day) => {
      const maxP = DAY_PERIODS[day];
      for (let p = 1; p <= maxP; p++) {
        // Saturday restriction: Periods 5-7 strictly disabled
        if (day === 'Saturday' && p > 4) continue;

        if (grid[day][p] === null) {
          // Check faculty availability
          if (facId) {
            const busyCheck = isFacultyBusy(facId, day, p, timetables, faculty);
            if (busyCheck.busy) continue;
          }

          // Compute penalty score based on distribution rules:
          let penalty = 0;

          // Rule 1: No Fatigue (prevent back-to-back same subject)
          const prev = p > 1 ? grid[day][p - 1] : null;
          const next = p < maxP ? grid[day][p + 1] : null;
          if (prev && prev.subjectCode === subjectCode) penalty += 50;
          if (next && next.subjectCode === subjectCode) penalty += 50;

          // Rule 2: No Fatigue (prevent back-to-back same faculty in this section)
          if (facId) {
            if (prev && prev.facultyIds && prev.facultyIds.includes(facId)) penalty += 25;
            if (next && next.facultyIds && next.facultyIds.includes(facId)) penalty += 25;
          }

          // Rule 3: Weekly Spread (count how many hours this subject already has on this day)
          let todayCount = 0;
          for (let checkP = 1; checkP <= maxP; checkP++) {
            if (grid[day][checkP] && grid[day][checkP].subjectCode === subjectCode) {
              todayCount++;
            }
          }
          if (todayCount >= 1) penalty += todayCount * 40; // Discourage > 1 hour/day

          // Rule 4: Session balance (morning P1-P4 vs afternoon P5-P7)
          if (p >= 5 && day !== 'Saturday') penalty += Math.floor(Math.random() * 5);

          openSlots.push({ day, period: p, penalty });
        }
      }
    });

    if (openSlots.length === 0) return false;

    // Sort candidates by lowest penalty (best heuristics first)
    openSlots.sort((a, b) => a.penalty - b.penalty);

    for (const slot of openSlots) {
      grid[slot.day][slot.period] = {
        subjectCode,
        subjectName,
        type: 'theory',
        facultyIds,
        isLocked: false,
      };

      if (solveTheory(index + 1)) {
        return true;
      }

      // Backtrack
      grid[slot.day][slot.period] = null;
    }

    return false;
  };

  const theorySuccess = solveTheory(0);
  const endTime = performance.now();

  if (!theorySuccess) {
    return {
      success: false,
      error:
        'Scheduling engine encountered a constraint dead-end. Some faculty members may be over-booked or constrained by Other Department Locked Hours.',
      iterations,
    };
  }

  return {
    success: true,
    timetables,
    stats: {
      timeMs: Math.round(endTime - startTime),
      iterations,
      sectionsScheduled: sections.length,
      totalSlots: sections.length * TOTAL_WEEKLY_PERIODS,
    },
  };
};

// Validate a proposed manual swap between (day1, period1) and (day2, period2) in sectionId
export const validateSwap = ({
  sectionId,
  day1,
  period1,
  day2,
  period2,
  timetables,
  allFaculty,
}) => {
  // Hard Constraint: Saturday periods 5-7 are completely inactive
  if ((day1 === 'Saturday' && period1 > 4) || (day2 === 'Saturday' && period2 > 4)) {
    return {
      allowed: false,
      reason: 'Saturday Periods 5, 6, and 7 are strictly inactive half-day slots.',
    };
  }

  const secGrid = timetables[sectionId];
  if (!secGrid) return { allowed: false, reason: 'Section not found' };

  const slot1 = secGrid[day1]?.[period1];
  const slot2 = secGrid[day2]?.[period2];

  // Hard Constraint: Prefix Inviolability
  if (slot1?.isLocked) {
    return {
      allowed: false,
      reason: `Slot (${day1} P${period1}) is locked/prefixed and cannot be moved.`,
    };
  }
  if (slot2?.isLocked) {
    return {
      allowed: false,
      reason: `Slot (${day2} P${period2}) is locked/prefixed and cannot be overwritten.`,
    };
  }

  // Check slot1 faculty availability in target slot2
  if (slot1?.facultyIds) {
    for (const facId of slot1.facultyIds) {
      const busy = isFacultyBusy(
        facId,
        day2,
        period2,
        timetables,
        allFaculty,
        sectionId,
        period1
      );
      if (busy.busy) {
        const facObj = allFaculty.find((f) => f.id === facId);
        return {
          allowed: false,
          reason: `Faculty ${facObj?.name || facId} is collision-blocked at ${day2} Period ${period2}: ${busy.reason}`,
        };
      }
    }
  }

  // Check slot2 faculty availability in target slot1
  if (slot2?.facultyIds) {
    for (const facId of slot2.facultyIds) {
      const busy = isFacultyBusy(
        facId,
        day1,
        period1,
        timetables,
        allFaculty,
        sectionId,
        period2
      );
      if (busy.busy) {
        const facObj = allFaculty.find((f) => f.id === facId);
        return {
          allowed: false,
          reason: `Faculty ${facObj?.name || facId} is collision-blocked at ${day1} Period ${period1}: ${busy.reason}`,
        };
      }
    }
  }

  return { allowed: true };
};
