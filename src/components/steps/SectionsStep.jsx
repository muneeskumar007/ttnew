import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  UserCheck, 
  Award, 
  Sparkles, 
  GraduationCap,
  CalendarDays
} from 'lucide-react';
import { YEARS, YEAR_LABELS, TOTAL_WEEKLY_PERIODS } from '../../types/constants';

export const SectionsStep = ({ sections, setSections, faculty, subjects, allocations, setAllocations }) => {
  const [selectedYear, setSelectedYear] = useState(2);
  const [newSectionName, setNewSectionName] = useState('');
  const [newMentorId, setNewMentorId] = useState('');

  const facultyMap = Object.fromEntries(faculty.map((f) => [f.id, f]));

  // Add new section to selected year
  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    // Generate unique ID
    const letter = newSectionName.trim().toUpperCase().replace(/SECTION\s*/i, '');
    const secId = `SEC-${selectedYear}${letter || 'X'}`;

    if (sections.some((s) => s.id === secId)) {
      alert(`Section with ID ${secId} already exists!`);
      return;
    }

    const newSec = {
      id: secId,
      year: selectedYear,
      name: `Year ${selectedYear} - Section ${letter || newSectionName}`,
      mentorFacultyId: newMentorId || (faculty[0]?.id || ''),
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
      setAllocations((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  // Update Mentor
  const handleUpdateMentor = (sectionId, mentorId) => {
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
            Configure classes and sections per year. Assign a designated Class Tutor / Mentor to each section.
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
                        <h4 className="text-base font-bold text-slate-900 mt-1">{sec.name}</h4>
                      </div>

                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mentor Configuration */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>Class Tutor / Mentor</span>
                      </label>
                      <select
                        value={sec.mentorFacultyId || ''}
                        onChange={(e) => handleUpdateMentor(sec.id, e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Mentor Faculty...</option>
                        {faculty.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.department})
                          </option>
                        ))}
                      </select>
                      {mentor && (
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
                Assign Class Tutor / Mentor
              </label>
              <select
                value={newMentorId}
                onChange={(e) => setNewMentorId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Mentor...</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.department})
                  </option>
                ))}
              </select>
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
    </div>
  );
};
