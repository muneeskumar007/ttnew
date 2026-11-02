import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Search, 
  X, 
  Check, 
  Beaker, 
  BookMarked,
  Layers,
  Palette
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { YEARS, YEAR_LABELS, SUBJECT_PALETTES } from '../../types/constants';

export const SubjectsStep = ({ subjects, setSubjects }) => {
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCode, setEditingCode] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    year: 2,
    department: 'CSE',
    theoryHours: 4,
    labHours: 0,
    isLab: false,
    colorId: 'indigo',
  });

  const filteredSubjects = subjects.filter((s) => {
    const matchesYear = selectedYear === 'all' || s.year === Number(selectedYear);
    const matchesSearch =
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesYear && matchesSearch;
  });

  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      year: selectedYear === 'all' ? 2 : Number(selectedYear),
      department: 'CSE',
      theoryHours: 4,
      labHours: 0,
      isLab: false,
      colorId: SUBJECT_PALETTES[Math.floor(Math.random() * SUBJECT_PALETTES.length)].id,
    });
    setEditingCode(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (s) => {
    setFormData({
      code: s.code,
      name: s.name,
      year: s.year,
      department: s.department,
      theoryHours: s.theoryHours,
      labHours: s.labHours,
      isLab: s.isLab,
      colorId: s.colorId || 'indigo',
    });
    setEditingCode(s.code);
    setShowAddModal(true);
  };

  const handleSaveSubject = (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    // Strict Rule Validation: Pure academic focus only
    const nonAcademicKeywords = ['sports', 'library', 'recess', 'play', 'game', 'break'];
    const lowerName = formData.name.toLowerCase();
    if (nonAcademicKeywords.some((w) => lowerName.includes(w))) {
      alert('Academic Rule Enforcement: Only strictly academic Theory and Lab subjects are allowed. Non-academic slots (sports, library, etc.) are prohibited.');
      return;
    }

    if (formData.theoryHours === 0 && formData.labHours === 0) {
      alert('A subject must have at least 1 Theory hour or 1 Lab hour.');
      return;
    }

    if (editingCode) {
      setSubjects((prev) =>
        prev.map((s) => (s.code === editingCode ? { ...s, ...formData } : s))
      );
    } else {
      // Check duplicate code
      if (subjects.some((s) => s.code.toUpperCase() === formData.code.toUpperCase())) {
        alert(`Subject code ${formData.code} already exists.`);
        return;
      }
      setSubjects((prev) => [...prev, { ...formData, code: formData.code.toUpperCase() }]);
    }
    setShowAddModal(false);
  };

  const handleDeleteSubject = (code) => {
    if (confirm(`Are you sure you want to delete subject ${code}?`)) {
      setSubjects((prev) => prev.filter((s) => s.code !== code));
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const rows = [
      ['Subject Code', 'Subject Name', 'Year', 'Department', 'Theory Hours', 'Lab Hours', 'Is Lab (TRUE/FALSE)', 'Color'],
      ['CS209', 'Discrete Structures', 2, 'CSE', 4, 0, 'FALSE', 'emerald'],
      ['CS210', 'Python Programming Lab', 2, 'CSE', 0, 3, 'TRUE', 'purple'],
      ['CS308', 'Internet of Things Lab', 3, 'CSE', 0, 3, 'TRUE', 'sky'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects_Template');
    XLSX.writeFile(wb, 'Sample_Subjects_Curriculum_Template.xlsx');
  };

  // Bulk Import
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const imported = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0] || !row[1]) continue;

          const isLab = String(row[6]).toLowerCase() === 'true' || Number(row[5]) > 0;
          imported.push({
            code: String(row[0]).trim().toUpperCase(),
            name: String(row[1]).trim(),
            year: Number(row[2]) || 2,
            department: row[3] || 'CSE',
            theoryHours: Number(row[4]) || 0,
            labHours: Number(row[5]) || 0,
            isLab: isLab,
            colorId: row[7] || SUBJECT_PALETTES[i % SUBJECT_PALETTES.length].id,
          });
        }

        if (imported.length > 0) {
          setSubjects((prev) => {
            const map = new Map(prev.map((s) => [s.code, s]));
            imported.forEach((s) => map.set(s.code, s));
            return Array.from(map.values());
          });
          alert(`Successfully imported / merged ${imported.length} curriculum subjects!`);
        }
      } catch (err) {
        alert('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Curriculum & Subject Management</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              1st to 4th Year
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Strictly Theory and continuous Lab hours. Configured for a standard 39-period college week.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Template</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import</span>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedYear('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedYear === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Years ({subjects.length})
        </button>
        {YEARS.map((yr) => {
          const count = subjects.filter((s) => s.year === yr).length;
          return (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedYear === yr
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {YEAR_LABELS[yr].split(' ')[0]} Year ({count})
            </button>
          );
        })}
      </div>

      {/* Subject Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subjects by code or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-400">
            Showing {filteredSubjects.length} of {subjects.length} subjects
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4 text-center">Theory Hours</th>
                <th className="py-3 px-4 text-center">Lab Hours (Block)</th>
                <th className="py-3 px-4 text-center">Total Hours</th>
                <th className="py-3 px-4 text-center">Subject Badge & Palette</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">No Curriculum Subjects Added</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Add strictly Theory and continuous Lab subjects for 1st, 2nd, 3rd, or 4th Year.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={handleOpenAdd}
                          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-colors"
                        >
                          + Add First Subject
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredSubjects.map((s) => {
                const palette = SUBJECT_PALETTES.find((p) => p.id === s.colorId) || SUBJECT_PALETTES[0];
                const totalH = (s.theoryHours || 0) + (s.labHours || 0);

                return (
                  <tr key={s.code} className="hover:bg-slate-50/75 transition-colors">
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {s.code}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {s.name}
                      {s.isLab && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          Dedicated Lab
                        </span>
                      )}
                    </td>

                    {/* Year */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        Year {s.year}
                      </span>
                    </td>

                    {/* Theory Hours */}
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {s.theoryHours > 0 ? `${s.theoryHours}h/wk` : '-'}
                    </td>

                    {/* Lab Hours */}
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {s.labHours > 0 ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-bold">
                          <Beaker className="w-3 h-3" />
                          {s.labHours}h (continuous)
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-center font-bold text-indigo-600">
                      {totalH} hrs
                    </td>

                    {/* Color badge preview */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold shadow-2xs"
                        style={{
                          backgroundColor: palette.bg,
                          color: palette.text,
                          border: `2px solid ${palette.border}`,
                        }}
                      >
                        {s.code} Preview
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Subject"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(s.code)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT SUBJECT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingCode ? `Edit Subject (${editingCode})` : 'Add New Curriculum Subject'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS201"
                    disabled={!!editingCode}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    {YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {YEAR_LABELS[yr]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Subject Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Theory Hours / Week
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={formData.theoryHours}
                    onChange={(e) => setFormData({ ...formData, theoryHours: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Lab Hours / Week
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    step="1"
                    required
                    value={formData.labHours}
                    onChange={(e) => {
                      const lh = Number(e.target.value);
                      setFormData({
                        ...formData,
                        labHours: lh,
                        isLab: lh > 0 && formData.theoryHours === 0,
                      });
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Usually 2 or 3 continuous periods</p>
                </div>
              </div>

              {/* Color Palette Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Subject Theme Palette</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {SUBJECT_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, colorId: pal.id })}
                      className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                        formData.colorId === pal.id ? 'ring-2 ring-indigo-600 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: pal.bg,
                        border: `2px solid ${pal.border}`,
                      }}
                      title={pal.id}
                    >
                      {formData.colorId === pal.id && (
                        <Check className="w-4 h-4" style={{ color: pal.text }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                >
                  {editingCode ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
