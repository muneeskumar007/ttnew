import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  UserCheck, 
  Award, 
  Sparkles, 
  GraduationCap,
  CalendarDays,
  Edit3,
  X,
  Check,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { YEARS, YEAR_LABELS, TOTAL_WEEKLY_PERIODS } from '../../types/constants';

export const SectionsStep = ({ 
  sections, 
  setSections, 
  faculty, 
  subjects, 
  allocations, 
  setAllocations,
  prefixedSlots,
  setPrefixedSlots,
  timetables,
  setTimetables
}) => {
  const [selectedYear, setSelectedYear] = useState(2);
  const [newSectionName, setNewSectionName] = useState('');
  const [newMentorId, setNewMentorId] = useState('');

  // Edit section state
  const [editingSection, setEditingSection] = useState(null);
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');
  const [editYear, setEditYear] = useState(2);
  const [editMentorId, setEditMentorId] = useState('');

  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));

  // Map of mentorFacultyId -> array of sections that currently have this faculty as tutor
  const tutorAssignments = useMemo(() => {
    const map = {};
    sections.forEach((sec) => {
      if (sec.mentorFacultyId) {
        if (!map[sec.mentorFacultyId]) map[sec.mentorFacultyId] = [];
        map[sec.mentorFacultyId].push(sec);
      }
    });
    return map;
  }, [sections]);

  // List of duplicates in current state (if any already exist in data)
  const duplicateTutorConflicts = useMemo(() => {
    return Object.entries(tutorAssignments)
      .filter(([_, secs]) => secs.length > 1)
      .map(([fId, secs]) => ({
        facultyId: fId,
        facultyName: facultyMap[fId]?.name || fId,
        sections: secs,
      }));
  }, [tutorAssignments, facultyMap]);

  // Open Edit Modal
  const handleOpenEdit = (sec) => {
    setEditingSection(sec);
    setEditName(sec.name);
    setEditId(sec.id);
    setEditYear(sec.year);
    setEditMentorId(sec.mentorFacultyId || '');
  };

  // Save Edited Section
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingSection) return;
    if (!editName.trim()) {
      alert('Section name cannot be empty.');
      return;
    }

    const trimmedNewId = editId.trim().toUpperCase() || editingSection.id;
    const oldId = editingSection.id;

    // Check if new ID collides with another section
    if (trimmedNewId !== oldId && sections.some((s) => s.id === trimmedNewId)) {
      alert(`Section ID "${trimmedNewId}" is already in use by another section. Please choose a unique ID.`);
      return;
    }

    // Check unique class tutor rule
    if (editMentorId) {
      const alreadyAssignedSec = sections.find(
        (s) => s.id !== editingSection.id && s.mentorFacultyId === editMentorId
      );
      if (alreadyAssignedSec) {
        const facName = facultyMap[editMentorId]?.name || editMentorId;
        alert(
          `Cannot Assign Class Tutor!\n\nFaculty "${facName}" is already locked as Class Tutor for "${alreadyAssignedSec.name}" (Year ${alreadyAssignedSec.year}).\n\nA faculty member can only be assigned as Class Tutor to ONE section across all years.`
        );
        return;
      }
    }

    const updated = {
      ...editingSection,
      id: trimmedNewId,
      name: editName.trim(),
      year: Number(editYear),
      mentorFacultyId: editMentorId,
    };

    // 1. Update sections list
    setSections((prev) => prev.map((s) => (s.id === oldId ? updated : s)));

    // 2. If ID changed, cascade migration to allocations, prefixedSlots, timetables
    if (trimmedNewId !== oldId) {
      if (setAllocations) {
        setAllocations((prev) => {
          const next = { ...prev };
          if (next[oldId]) {
            next[trimmedNewId] = next[oldId];
            delete next[oldId];
          }
          return next;
        });
      }

      if (setPrefixedSlots) {
        setPrefixedSlots((prev) => {
          const next = { ...prev };
          if (next[oldId]) {
            next[trimmedNewId] = next[oldId];
            delete next[oldId];
          }
          return next;
        });
      }

      if (setTimetables) {
        setTimetables((prev) => {
          const next = { ...prev };
          if (next[oldId]) {
            next[trimmedNewId] = next[oldId];
            delete next[oldId];
          }
          return next;
        });
      }
    }

    setEditingSection(null);
  };

  // Add new section to selected year
  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    // Clean up input: if user typed "Year 3 - Section B" or "Section B" or "B"
    let cleanLetter = newSectionName.trim().toUpperCase()
      .replace(/^YEAR\s*\d+\s*[-–]?\s*/i, '')
      .replace(/^SECTION\s*/i, '')
      .trim();
    if (!cleanLetter) cleanLetter = 'A';

    const secId = `SEC-${selectedYear}${cleanLetter}`;

    if (sections.some((s) => s.id === secId)) {
      alert(`Section with ID ${secId} already exists!`);
      return;
    }

    // Check unique class tutor rule
    if (newMentorId) {
      const alreadyAssignedSec = sections.find((s) => s.mentorFacultyId === newMentorId);
      if (alreadyAssignedSec) {
        const facName = facultyMap[newMentorId]?.name || newMentorId;
        alert(
          `Cannot Assign Class Tutor!\n\nFaculty "${facName}" is already locked as Class Tutor for "${alreadyAssignedSec.name}" (Year ${alreadyAssignedSec.year}).\n\nPlease select an unassigned faculty or leave as "Select Mentor (Optional)...".`
        );
        return;
      }
    }

    const newSec = {
      id: secId,
      year: selectedYear,
      name: `Year ${selectedYear} - Section ${cleanLetter}`,
      mentorFacultyId: newMentorId || '',
    };

    setSections((prev) => [...prev, newSec]);

    // Initialize blank allocation for this new section with available subjects for this year
    const yearSubjects = subjects.filter((s) => s.year === selectedYear);
    const newSecAlloc = {};
    yearSubjects.forEach((sub) => {
      newSecAlloc[sub.code] = {
        theoryFaculty: faculty[0]?.id || null,
        labFaculty: sub.labHours > 0 ? [faculty[0]?.id || ''] : [],
      };
    });

    setAllocations((prev) => ({
      ...prev,
      [secId]: newSecAlloc,
    }));

    setNewSectionName('');
  };

  // Remove section
  const handleDeleteSection = (id) => {
    if (confirm(`Are you sure you want to delete section ${id}?`)) {
      setSections((prev) => prev.filter((s) => s.id !== id));
      if (setAllocations) {
        setAllocations((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
      if (setPrefixedSlots) {
        setPrefixedSlots((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
      if (setTimetables) {
        setTimetables((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
    }
  };

  // Update Mentor with single-tutor check
  const handleUpdateMentor = (sectionId, mentorId) => {
    if (mentorId) {
      const alreadyAssignedSec = sections.find(
        (s) => s.id !== sectionId && s.mentorFacultyId === mentorId
      );
      if (alreadyAssignedSec) {
        const facName = facultyMap[mentorId]?.name || mentorId;
        alert(
          `Cannot Assign Class Tutor!\n\nFaculty "${facName}" is already locked as Class Tutor for "${alreadyAssignedSec.name}" (Year ${alreadyAssignedSec.year}).\n\nA faculty member can only be assigned as Class Tutor to ONE section across all years.`
        );
        return;
      }
    }

    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, mentorFacultyId: mentorId } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Class & Section Configuration</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {sections.length} Active Sections
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure classes and sections per year. Assign a designated Class Tutor / Mentor to each section (1 faculty per section).
          </p>
        </div>

        {/* Quick Year Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
          {YEARS.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedYear === yr
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Year {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Duplicate Class Tutor Warning Banner */}
      {duplicateTutorConflicts.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-rose-950 uppercase tracking-wide">
                  Duplicate Class Tutor Detected ({duplicateTutorConflicts.length})
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-200 text-rose-900">
                  Strict Rule: 1 Tutor Per Section
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                A faculty member can only serve as Class Tutor for <strong>one section</strong> across all years and sections. 
                Please reassign one of the sections below so each section has an independent tutor.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-rose-200/80">
            {duplicateTutorConflicts.map((dup) => (
              <div 
                key={dup.facultyId}
                className="bg-white p-3 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="text-xs">
                    <strong className="text-slate-900">{dup.facultyName}</strong>
                    <span className="text-rose-700 ml-1 font-medium">is currently assigned as tutor to multiple sections:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {dup.sections.map((s) => (
                      <span key={s.id} className="text-[11px] font-semibold bg-rose-50 text-rose-800 px-2.5 py-0.5 rounded-lg border border-rose-200">
                        {s.name} (Year {s.year})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Sections for current selected year + Add section form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Section Cards for selected year */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>{YEAR_LABELS[selectedYear]} Sections</span>
            </h3>
            <span className="text-xs text-slate-400">
              {sections.filter((s) => s.year === selectedYear).length} sections configured
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sections
              .filter((s) => s.year === selectedYear)
              .map((sec) => {
                const mentor = facultyMap[sec.mentorFacultyId];
                const isDuplicateTutor = (tutorAssignments[sec.mentorFacultyId]?.length || 0) > 1;
                const yearSubjects = subjects.filter((s) => s.year === sec.year);
                const totalHours = yearSubjects.reduce(
                  (acc, s) => acc + (s.theoryHours || 0) + (s.labHours || 0),
                  0
                );

                return (
                  <div
                    key={sec.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {sec.id}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            Year {sec.year}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <h4 className="text-base font-bold text-slate-900">{sec.name}</h4>
                          <button
                            onClick={() => handleOpenEdit(sec)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit Section Name"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(sec)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Section Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mentor Configuration */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Class Tutor / Mentor</span>
                        </label>
                        {isDuplicateTutor && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Duplicate Tutor
                          </span>
                        )}
                      </div>
                      <select
                        value={sec.mentorFacultyId || ''}
                        onChange={(e) => handleUpdateMentor(sec.id, e.target.value)}
                        className={`w-full text-xs p-2 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 border transition-all ${
                          isDuplicateTutor
                            ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="">Select Mentor Faculty...</option>
                        {faculty.map((f) => {
                          const assignedSec = sections.find(
                            (s) => s.id !== sec.id && s.mentorFacultyId === f.id
                          );
                          return (
                            <option
                              key={f.id}
                              value={f.id}
                              disabled={Boolean(assignedSec)}
                              className={assignedSec ? 'text-slate-400 bg-slate-100' : ''}
                            >
                              {f.name} ({f.department}){assignedSec ? ` — Assigned to ${assignedSec.name} (Year ${assignedSec.year})` : ''}
                            </option>
                          );
                        })}
                      </select>
                      {isDuplicateTutor && (
                        <p className="text-[10px] text-rose-700 bg-rose-50 rounded-md p-1.5 mt-2 flex items-center gap-1 font-semibold border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>
                            Collision: {mentor?.name} is also assigned to{' '}
                            {tutorAssignments[sec.mentorFacultyId]
                              .filter((s) => s.id !== sec.id)
                              .map((s) => s.name)
                              .join(', ')}. Please reassign one.
                          </span>
                        </p>
                      )}
                      {!isDuplicateTutor && mentor && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 rounded-md p-1.5 mt-2 flex items-center gap-1 font-medium border border-amber-200">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Tutor Hour eligible for gold halo styling in timetable.</span>
                        </p>
                      )}
                    </div>

                    {/* Weekly periods breakdown */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        Curriculum Load:
                      </span>
                      <span
                        className={`font-bold ${
                          totalHours === TOTAL_WEEKLY_PERIODS
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {totalHours} / {TOTAL_WEEKLY_PERIODS} Periods
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {sections.filter((s) => s.year === selectedYear).length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              No sections created for Year {selectedYear} yet. Use the form on the right to add a section.
            </div>
          )}
        </div>

        {/* Right: Add New Section Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Plus className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Add New Section to Year {selectedYear}
            </h3>
          </div>

          <form onSubmit={handleAddSection} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Name / Letter
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Section C or C"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Will create: SEC-{selectedYear}{newSectionName.trim().toUpperCase().replace(/SECTION\s*/i, '') || 'X'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Class Tutor / Mentor (Optional)
              </label>
              <select
                value={newMentorId}
                onChange={(e) => setNewMentorId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Mentor (Optional)...</option>
                {faculty.map((f) => {
                  const assignedSec = sections.find((s) => s.mentorFacultyId === f.id);
                  return (
                    <option
                      key={f.id}
                      value={f.id}
                      disabled={Boolean(assignedSec)}
                      className={assignedSec ? 'text-slate-400 bg-slate-100' : ''}
                    >
                      {f.name} ({f.department}){assignedSec ? ` — Assigned to ${assignedSec.name} (Year ${assignedSec.year})` : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                A faculty can only be assigned to one section across all years.
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Section</span>
            </button>
          </form>

          {/* Quick Info Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800">Dynamic Scaling:</span>
            <p>
              Adding a section automatically creates an isolated schedule grid and instantly updates faculty workload meters in the allocation matrix.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Edit Class Section</h3>
                  <p className="text-[11px] text-slate-500">Update section name, ID, or class tutor</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Year 3 - Section B"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The primary title shown across timetable grids and allocation matrices.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section Code / ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editId}
                    onChange={(e) => setEditId(e.target.value.toUpperCase())}
                    placeholder="e.g. SEC-3B"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {YEAR_LABELS[yr]} (Year {yr})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Class Tutor / Mentor</span>
                </label>
                <select
                  value={editMentorId}
                  onChange={(e) => setEditMentorId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Mentor Faculty...</option>
                  {faculty.map((f) => {
                    const assignedSec = sections.find(
                      (s) => s.id !== editingSection?.id && s.mentorFacultyId === f.id
                    );
                    return (
                      <option
                        key={f.id}
                        value={f.id}
                        disabled={Boolean(assignedSec)}
                        className={assignedSec ? 'text-slate-400 bg-slate-100' : ''}
                      >
                        {f.name} ({f.department}){assignedSec ? ` — Assigned to ${assignedSec.name} (Year ${assignedSec.year})` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Each faculty can only be assigned to one section across all years.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all hover:scale-[1.02]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
