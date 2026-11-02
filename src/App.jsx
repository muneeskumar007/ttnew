import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { StepperNav } from './components/StepperNav';
import { FacultyStep } from './components/steps/FacultyStep';
import { SubjectsStep } from './components/steps/SubjectsStep';
import { SectionsStep } from './components/steps/SectionsStep';
import { AllocationStep } from './components/steps/AllocationStep';
import { PrefixingStep } from './components/steps/PrefixingStep';
import { GenerateStep } from './components/steps/GenerateStep';
import { TimetableDisplayStep } from './components/steps/TimetableDisplayStep';
import { FacultyMatrixStep } from './components/steps/FacultyMatrixStep';
import { FreeFacultyStep } from './components/steps/FreeFacultyStep';
import { ExportStep } from './components/steps/ExportStep';

import {
  INITIAL_DEPARTMENT,
  INITIAL_FACULTY,
  INITIAL_SUBJECTS,
  INITIAL_SECTIONS,
  INITIAL_ALLOCATIONS,
  INITIAL_PREFIXED_SLOTS,
  DEMO_DEPARTMENT,
  DEMO_FACULTY,
  DEMO_SUBJECTS,
  DEMO_SECTIONS,
  DEMO_ALLOCATIONS,
  DEMO_PREFIXED_SLOTS,
} from './data/initialData';

import {
  persistState,
  loadPersistedState,
  saveFirebaseConfig,
  clearPersistedState,
} from './services/firebase';

import { generateDepartmentTimetable } from './services/scheduler';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function App() {
  // Starts 100% clean and empty so the user enters data manually!
  const [department, setDepartment] = useState(INITIAL_DEPARTMENT);
  const [faculty, setFaculty] = useState(INITIAL_FACULTY);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [allocations, setAllocations] = useState(INITIAL_ALLOCATIONS);
  const [prefixedSlots, setPrefixedSlots] = useState(INITIAL_PREFIXED_SLOTS);
  const [timetables, setTimetables] = useState({});
  const [activeStep, setActiveStep] = useState(1);

  // Persistence state
  const [storageMode, setStorageMode] = useState('local');
  const [lastSaved, setLastSaved] = useState(null);
  const isLoadedRef = useRef(false);

  // Initial load: Only load previously manually entered data if present, otherwise remain completely blank!
  useEffect(() => {
    const initApp = async () => {
      const { data, source } = await loadPersistedState();
      if (data) {
        setDepartment(data.department || INITIAL_DEPARTMENT);
        setFaculty(data.faculty || []);
        setSubjects(data.subjects || []);
        setSections(data.sections || []);
        setAllocations(data.allocations || {});
        setPrefixedSlots(data.prefixedSlots || {});
        setTimetables(data.timetables || {});
        setStorageMode(source === 'firebase' ? 'firebase' : 'local');
        setLastSaved(data.lastUpdated || new Date().toISOString());
      }
      isLoadedRef.current = true;
    };

    initApp();
  }, []);

  // Sync to persistence on state changes
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timer = setTimeout(() => {
      const payload = {
        department,
        faculty,
        subjects,
        sections,
        allocations,
        prefixedSlots,
        timetables,
      };

      persistState(payload).then((res) => {
        setStorageMode(res.mode);
        setLastSaved(new Date().toISOString());
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [department, faculty, subjects, sections, allocations, prefixedSlots, timetables]);

  // Clear all data to start completely fresh and manual
  const handleClearAllData = () => {
    if (confirm('Clear all data to a clean blank slate? This will remove all current entries so you can input everything manually.')) {
      setDepartment('Engineering & Technology');
      setFaculty([]);
      setSubjects([]);
      setSections([]);
      setAllocations({});
      setPrefixedSlots({});
      setTimetables({});
      setActiveStep(1);
      clearPersistedState();

      persistState({
        department: 'Engineering & Technology',
        faculty: [],
        subjects: [],
        sections: [],
        allocations: {},
        prefixedSlots: {},
        timetables: {},
      }).then((res) => {
        setStorageMode(res.mode);
        setLastSaved(new Date().toISOString());
      });
    }
  };

  // Optional: Load sample demo data if ever requested
  const handleLoadDemoData = () => {
    if (confirm('Load sample CSE demo template for reference? Current data will be replaced.')) {
      const initialGen = generateDepartmentTimetable({
        sections: DEMO_SECTIONS,
        subjects: DEMO_SUBJECTS,
        faculty: DEMO_FACULTY,
        allocations: DEMO_ALLOCATIONS,
        prefixedSlots: DEMO_PREFIXED_SLOTS,
      });

      const tt = initialGen.success ? initialGen.timetables : {};

      setDepartment(DEMO_DEPARTMENT);
      setFaculty(DEMO_FACULTY);
      setSubjects(DEMO_SUBJECTS);
      setSections(DEMO_SECTIONS);
      setAllocations(DEMO_ALLOCATIONS);
      setPrefixedSlots(DEMO_PREFIXED_SLOTS);
      setTimetables(tt);
      setActiveStep(1);

      persistState({
        department: DEMO_DEPARTMENT,
        faculty: DEMO_FACULTY,
        subjects: DEMO_SUBJECTS,
        sections: DEMO_SECTIONS,
        allocations: DEMO_ALLOCATIONS,
        prefixedSlots: DEMO_PREFIXED_SLOTS,
        timetables: tt,
      }).then((res) => {
        setStorageMode(res.mode);
        setLastSaved(new Date().toISOString());
      });
    }
  };

  const handleSaveConfig = (cfg) => {
    saveFirebaseConfig(cfg);
    persistState({
      department,
      faculty,
      subjects,
      sections,
      allocations,
      prefixedSlots,
      timetables,
    }).then((res) => {
      setStorageMode(res.mode);
      setLastSaved(new Date().toISOString());
    });
  };

  const isGenerated = Object.keys(timetables).length > 0;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        department={department}
        setDepartment={setDepartment}
        storageMode={storageMode}
        lastSaved={lastSaved}
        onClearAllData={handleClearAllData}
        onLoadDemoData={handleLoadDemoData}
        onSaveConfig={handleSaveConfig}
      />

      {/* Stepper Navigation */}
      <StepperNav
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        isGenerated={isGenerated}
      />

      {/* Main Step Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeStep === 1 && (
          <FacultyStep faculty={faculty} setFaculty={setFaculty} />
        )}

        {activeStep === 2 && (
          <SubjectsStep subjects={subjects} setSubjects={setSubjects} />
        )}

        {activeStep === 3 && (
          <SectionsStep
            sections={sections}
            setSections={setSections}
            faculty={faculty}
            subjects={subjects}
            allocations={allocations}
            setAllocations={setAllocations}
          />
        )}

        {activeStep === 4 && (
          <AllocationStep
            sections={sections}
            subjects={subjects}
            faculty={faculty}
            allocations={allocations}
            setAllocations={setAllocations}
            setActiveStep={setActiveStep}
          />
        )}

        {activeStep === 5 && (
          <PrefixingStep
            sections={sections}
            subjects={subjects}
            faculty={faculty}
            allocations={allocations}
            prefixedSlots={prefixedSlots}
            setPrefixedSlots={setPrefixedSlots}
            setActiveStep={setActiveStep}
          />
        )}

        {activeStep === 6 && (
          <GenerateStep
            sections={sections}
            subjects={subjects}
            faculty={faculty}
            allocations={allocations}
            prefixedSlots={prefixedSlots}
            timetables={timetables}
            setTimetables={setTimetables}
            setActiveStep={setActiveStep}
          />
        )}

        {activeStep === 7 && (
          <TimetableDisplayStep
            sections={sections}
            subjects={subjects}
            faculty={faculty}
            timetables={timetables}
            setTimetables={setTimetables}
            prefixedSlots={prefixedSlots}
            setActiveStep={setActiveStep}
          />
        )}

        {activeStep === 8 && (
          <FacultyMatrixStep
            faculty={faculty}
            timetables={timetables}
            subjects={subjects}
            sections={sections}
            setActiveStep={setActiveStep}
          />
        )}

        {activeStep === 9 && (
          <FreeFacultyStep
            faculty={faculty}
            timetables={timetables}
            sections={sections}
            subjects={subjects}
            setTimetables={setTimetables}
            setActiveStep={setActiveStep}
          />
        )}

        {activeStep === 10 && (
          <ExportStep
            sections={sections}
            subjects={subjects}
            faculty={faculty}
            timetables={timetables}
            setActiveStep={setActiveStep}
          />
        )}

        {/* Stepper Footer Controls */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between no-print">
          <button
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            disabled={activeStep === 1}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Step {activeStep} of 10
          </span>

          <button
            onClick={() => setActiveStep((prev) => Math.min(10, prev + 1))}
            disabled={activeStep === 10}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Next Step</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
