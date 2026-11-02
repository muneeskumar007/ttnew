import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Search, 
  Lock, 
  X, 
  Check, 
  AlertTriangle,
  Building2,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DAYS, DAY_PERIODS } from '../../types/constants';

export const FacultyStep = ({ faculty, setFaculty }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lockingFaculty, setLockingFaculty] = useState(null); // Faculty currently configuring external slots

  // Form state for adding/editing faculty
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    department: 'CSE',
    designation: 'Assistant Professor',
    maxHours: 20,
  });

  // Locked slot editor sub-state
  const [newLockDay, setNewLockDay] = useState('Monday');
  const [newLockPeriod, setNewLockPeriod] = useState(1);
  const [newLockDept, setNewLockDept] = useState('ECE');
  const [newLockReason, setNewLockReason] = useState('Inter-Department Guest Lecture');

  // Filtered faculty list
  const filteredFaculty = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    const nextId = `FAC-${String(faculty.length + 1).padStart(2, '0')}`;
    setFormData({
      id: nextId,
      name: '',
      department: 'CSE',
      designation: 'Assistant Professor',
      maxHours: 20,
    });
    setEditingId(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (f) => {
    setFormData({
      id: f.id,
      name: f.name,
      department: f.department,
      designation: f.designation || 'Assistant Professor',
      maxHours: f.maxHours || 20,
    });
    setEditingId(f.id);
    setShowAddModal(true);
  };

  const handleSaveFaculty = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      setFaculty((prev) =>
        prev.map((f) => (f.id === editingId ? { ...f, ...formData } : f))
      );
    } else {
      const newFac = {
        ...formData,
        lockedSlots: [],
      };
      setFaculty((prev) => [...prev, newFac]);
    }
    setShowAddModal(false);
  };

  const handleDeleteFaculty = (id) => {
    if (confirm(`Are you sure you want to delete faculty ${id}?`)) {
      setFaculty((prev) => prev.filter((f) => f.id !== id));
    }
  };

  // Add locked external department slot
  const handleAddLockedSlot = () => {
    if (!lockingFaculty) return;

    // Check if slot already locked
    const exists = lockingFaculty.lockedSlots?.some(
      (ls) => ls.day === newLockDay && Number(ls.period) === Number(newLockPeriod)
    );

    if (exists) {
      alert(`Faculty already has a locked slot on ${newLockDay} Period ${newLockPeriod}.`);
      return;
    }

    const newSlot = {
      day: newLockDay,
      period: Number(newLockPeriod),
      dept: newLockDept,
      reason: newLockReason,
    };

    const updated = {
      ...lockingFaculty,
      lockedSlots: [...(lockingFaculty.lockedSlots || []), newSlot],
    };

    setFaculty((prev) => prev.map((f) => (f.id === lockingFaculty.id ? updated : f)));
    setLockingFaculty(updated);
  };

  // Remove locked slot
  const handleRemoveLockedSlot = (day, period) => {
    if (!lockingFaculty) return;
    const updated = {
      ...lockingFaculty,
      lockedSlots: lockingFaculty.lockedSlots.filter(
        (ls) => !(ls.day === day && Number(ls.period) === Number(period))
      ),
    };
    setFaculty((prev) => prev.map((f) => (f.id === lockingFaculty.id ? updated : f)));
    setLockingFaculty(updated);
  };

  // CSV/Excel Template Download
  const handleDownloadTemplate = () => {
    const templateRows = [
      ['Faculty ID', 'Faculty Name', 'Department', 'Designation', 'Max Hours', 'Locked Slots (Format: Day:Period:Dept)'],
      ['FAC-11', 'Dr. Ramesh Chandra', 'CSE', 'Professor', 18, 'Tuesday:2:ECE;Thursday:4:ECE'],
      ['FAC-12', 'Prof. Meenakshi S.', 'CSE', 'Associate Professor', 20, 'Wednesday:3:IT'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Template');
    XLSX.writeFile(wb, 'Sample_Faculty_Template.xlsx');
  };

  // Excel / CSV File Import
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

        // Skip header row
        const newFaculty = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1]) continue;

          const lockedSlots = [];
          if (row[5]) {
            // parse Day:Period:Dept
            const entries = String(row[5]).split(';');
            entries.forEach((ent) => {
              const [d, p, dept] = ent.split(':').map((s) => s.trim());
              if (d && p) {
                lockedSlots.push({
                  day: d,
                  period: Number(p),
                  dept: dept || 'Other',
                  reason: 'Imported External Dept Load',
                });
              }
            });
          }

          newFaculty.push({
            id: row[0] || `FAC-${String(faculty.length + newFaculty.length + 1).padStart(2, '0')}`,
            name: String(row[1]).trim(),
            department: row[2] || 'CSE',
            designation: row[3] || 'Assistant Professor',
            maxHours: Number(row[4]) || 20,
            lockedSlots,
          });
        }

        if (newFaculty.length > 0) {
          setFaculty((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const filteredNew = newFaculty.filter((f) => !existingIds.has(f.id));
            return [...prev, ...filteredNew];
          });
          alert(`Successfully imported ${newFaculty.length} faculty members!`);
        }
      } catch (err) {
        alert('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Faculty Management</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {faculty.length} Faculty Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage teaching faculty, set maximum weekly workloads, and lock external department hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Template */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Download Excel / CSV template"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Template</span>
          </button>

          {/* Import CSV / Excel */}
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

          {/* Add Faculty */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty by name, ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-400">
            Showing {filteredFaculty.length} of {faculty.length}
          </div>
        </div>

        {/* Faculty Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Faculty ID</th>
                <th className="py-3 px-4">Faculty Name & Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Max Workload</th>
                <th className="py-3 px-4">Other Dept Locked Load</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFaculty.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">No Faculty Added Yet</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Start by adding your department's teachers and professors manually, or bulk import via CSV/Excel.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={handleOpenAdd}
                          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-colors"
                        >
                          + Add First Faculty
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredFaculty.map((f) => {
                const lockedCount = f.lockedSlots?.length || 0;
                return (
                  <tr key={f.id} className="hover:bg-slate-50/75 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {f.id}
                    </td>

                    {/* Name & Designation */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{f.name}</div>
                      <div className="text-slate-500 text-[11px]">{f.designation}</div>
                    </td>

                    {/* Dept */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {f.department}
                      </span>
                    </td>

                    {/* Max Hours */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Clock className="w-3 h-3 mr-1 text-indigo-500" />
                        {f.maxHours} hrs/wk
                      </span>
                    </td>

                    {/* Other Dept Locked slots */}
                    <td className="py-3 px-4">
                      {lockedCount > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f.lockedSlots.map((ls, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stripes-locked text-rose-800 border border-rose-300"
                              title={`${ls.day} Period ${ls.period}: ${ls.dept} (${ls.reason})`}
                            >
                              <Lock className="w-2.5 h-2.5 text-rose-600" />
                              <span>{ls.day.substring(0, 3)} P{ls.period} ({ls.dept})</span>
                            </span>
                          ))}
                          <button
                            onClick={() => setLockingFaculty(f)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium ml-1"
                          >
                            Edit ({lockedCount})
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLockingFaculty(f)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-dashed border-slate-300 hover:border-indigo-300"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Lock Other Dept Load</span>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setLockingFaculty(f)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Configure Other Department Locked Slots"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Faculty Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(f.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Faculty"
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

      {/* ADD / EDIT FACULTY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingId ? 'Edit Faculty Member' : 'Add New Faculty Member'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Faculty ID
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  disabled={!!editingId}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Faculty Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Anand Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Max Hours/Week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    required
                    value={formData.maxHours}
                    onChange={(e) => setFormData({ ...formData, maxHours: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Designation / Role
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Professor & HOD">Professor & HOD</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Adjunct / Guest Faculty">Adjunct / Guest Faculty</option>
                </select>
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
                  {editingId ? 'Update Faculty' : 'Add Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTHER DEPARTMENT LOCKED LOAD CONFIGURATION MODAL */}
      {lockingFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-semibold text-sm">
                    External Department Locked Load Configuration
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lockingFaculty.name} ({lockingFaculty.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLockingFaculty(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hard Constraint Callout Banner */}
            <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-start gap-3 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Hard Constraint: </span>
                Slots locked for other departments (e.g. ECE, MECH, IT) are permanently reserved.
                The automated scheduler will NEVER place classes during these hours and will prevent any double booking.
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Existing locked slots */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Currently Locked External Slots ({lockingFaculty.lockedSlots?.length || 0})
                </h4>

                {(!lockingFaculty.lockedSlots || lockingFaculty.lockedSlots.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No external department slots locked for this faculty yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lockingFaculty.lockedSlots.map((ls, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-stripes-locked border border-rose-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                            OTHER DEPT LOAD (LOCKED)
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            {ls.day} - Period {ls.period}
                          </span>
                          <span className="text-xs text-rose-700 font-medium">
                            Target: {ls.dept}
                          </span>
                          <span className="text-xs text-slate-500 italic">
                            ({ls.reason})
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveLockedSlot(ls.day, ls.period)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                          title="Remove locked slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add a new locked slot form */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h5 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lock a New External Period</span>
                </h5>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Day
                    </label>
                    <select
                      value={newLockDay}
                      onChange={(e) => {
                        const d = e.target.value;
                        setNewLockDay(d);
                        if (d === 'Saturday' && newLockPeriod > 4) {
                          setNewLockPeriod(1);
                        }
                      }}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Period
                    </label>
                    <select
                      value={newLockPeriod}
                      onChange={(e) => setNewLockPeriod(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    >
                      {[1, 2, 3, 4, ...(newLockDay === 'Saturday' ? [] : [5, 6, 7])].map((p) => (
                        <option key={p} value={p}>
                          Period {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Target Dept
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ECE"
                      value={newLockDept}
                      onChange={(e) => setNewLockDept(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Reason / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VLSI Lecture"
                      value={newLockReason}
                      onChange={(e) => setNewLockReason(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddLockedSlot}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock External Slot</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setLockingFaculty(null)}
                  className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
