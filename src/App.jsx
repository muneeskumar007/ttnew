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
  clearPersistedState,
  checkFirebaseStatus,
  getFirebaseConfig,
} from './services/firebase';

import { generateDepartmentTimetable } from './services/scheduler';
import { ArrowLeft, ArrowRight, Cloud, RefreshCw, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

export function App() {
  // Pure blank manual input state
  const [department, setDepartment] = useState(INITIAL_DEPARTMENT);
  const [faculty, setFaculty] = useState(INITIAL_FACULTY);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [allocations, setAllocations] = useState(INITIAL_ALLOCATIONS);
  const [prefixedSlots, setPrefixedSlots] = useState(INITIAL_PREFIXED_SLOTS);
  const [timetables, setTimetables] = useState({});
  const [activeStep, setActiveStep] = useState(1);

  // Pure Online Firebase Cloud Sync states: 'synced' | 'syncing' | 'firestore_not_created' | 'error' | 'idle'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [revertBackup, setRevertBackup] = useState(null);

  const isLoadedRef = useRef(false);
  const currentConfig = getFirebaseConfig();

  // Load purely from Firebase Online Firestore on mount
  const loadFromFirebase = async () => {
    setIsInitializing(true);
    setSyncStatus('syncing');

    try {
      const res = await loadPersistedState();

      if (res.status === 'synced' && res.data) {
        setDepartment(res.data.department || INITIAL_DEPARTMENT);
        setFaculty(res.data.faculty || []);
        setSubjects(res.data.subjects || []);
        setSections(res.data.sections || []);
        setAllocations(res.data.allocations || {});
        setPrefixedSlots(res.data.prefixedSlots || {});
        setTimetables(res.data.timetables || {});
        setSyncStatus('synced');
        setLastSaved(res.lastUpdated || new Date().toISOString());
        setSyncNotice({ type: 'success', text: 'Loaded latest timetable data from Firebase Cloud Firestore.' });
      } else if (res.status === 'empty') {
        setSyncStatus('synced');
        setSyncNotice(null);
      } else if (res.isSetupRequired) {
        setSyncStatus('firestore_not_created');
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.warn('Firebase online load error:', err);
      setSyncStatus('error');
    } finally {
      setIsInitializing(false);
      isLoadedRef.current = true;
    }
  };

  useEffect(() => {
    loadFromFirebase();
  }, []);

  // Sync to Firebase Cloud Firestore on any data modification
  useEffect(() => {
    if (!isLoadedRef.current) return;

    setSyncStatus('syncing');

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
        if (res.success) {
          setSyncStatus('synced');
          setLastSaved(res.lastUpdated);
        } else if (res.isSetupRequired) {
          setSyncStatus('firestore_not_created');
        } else {
          setSyncStatus('error');
        }
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [department, faculty, subjects, sections, allocations, prefixedSlots, timetables]);

  // Force Save to Firebase
  const handleTriggerSync = async () => {
    setSyncStatus('syncing');
    const payload = {
      department,
      faculty,
      subjects,
      sections,
      allocations,
      prefixedSlots,
      timetables,
    };
    const res = await persistState(payload);
    if (res.success) {
      setSyncStatus('synced');
      setLastSaved(res.lastUpdated);
      setSyncNotice({ type: 'success', text: 'All timetable data successfully synchronized to Firebase Cloud!' });
      setTimeout(() => setSyncNotice(null), 4000);
    } else if (res.isSetupRequired) {
      setSyncStatus('firestore_not_created');
    } else {
      setSyncStatus('error');
    }
  };

  // Clear all data both in state and in online Firebase Firestore
  const handleClearAllData = async () => {
    // Snapshot current state for instant Revert option
    const backup = {
      department,
      faculty: [...faculty],
      subjects: [...subjects],
      sections: [...sections],
      allocations: JSON.parse(JSON.stringify(allocations)),
      prefixedSlots: JSON.parse(JSON.stringify(prefixedSlots)),
      timetables: JSON.parse(JSON.stringify(timetables)),
      activeStep,
      timestamp: new Date().toISOString(),
    };
    setRevertBackup(backup);

    // Reset state to completely blank
    setDepartment('Engineering & Technology');
    setFaculty([]);
    setSubjects([]);
    setSections([]);
    setAllocations({});
    setPrefixedSlots({});
    setTimetables({});
    setActiveStep(1);

    setSyncStatus('syncing');
    await clearPersistedState();
    setSyncStatus('synced');
    setLastSaved(new Date().toISOString());
    setSyncNotice({
      type: 'info',
      text: 'All data cleared. Click "Revert All Data" in the top navbar if you wish to restore your previous workspace.',
    });
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // Revert all data back to the saved snapshot
  const handleRevertAllData = async () => {
    if (!revertBackup) return;

    setDepartment(revertBackup.department || 'Engineering & Technology');
    setFaculty(revertBackup.faculty || []);
    setSubjects(revertBackup.subjects || []);
    setSections(revertBackup.sections || []);
    setAllocations(revertBackup.allocations || {});
    setPrefixedSlots(revertBackup.prefixedSlots || {});
    setTimetables(revertBackup.timetables || {});
    setActiveStep(revertBackup.activeStep || 1);

    setSyncStatus('syncing');
    const res = await persistState({
      department: revertBackup.department,
      faculty: revertBackup.faculty,
      subjects: revertBackup.subjects,
      sections: revertBackup.sections,
      allocations: revertBackup.allocations,
      prefixedSlots: revertBackup.prefixedSlots,
      timetables: revertBackup.timetables,
    });

    if (res.success) {
      setSyncStatus('synced');
      setLastSaved(res.lastUpdated);
    }
    setSyncNotice({
      type: 'success',
      text: 'All timetable data successfully restored from previous backup!',
    });
    setTimeout(() => setSyncNotice(null), 4000);
  };

  // Optional: Load demo data if ever requested
  const handleLoadDemoData = () => {
    if (confirm('Load sample CSE demo template for reference? This will sync to Firebase Cloud.')) {
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

      setSyncStatus('syncing');
      persistState({
        department: DEMO_DEPARTMENT,
        faculty: DEMO_FACULTY,
        subjects: DEMO_SUBJECTS,
        sections: DEMO_SECTIONS,
        allocations: DEMO_ALLOCATIONS,
        prefixedSlots: DEMO_PREFIXED_SLOTS,
        timetables: tt,
      }).then((res) => {
        if (res.success) {
          setSyncStatus('synced');
          setLastSaved(res.lastUpdated);
        } else if (res.isSetupRequired) {
          setSyncStatus('firestore_not_created');
        }
      });
    }
  };

  const handleSaveConfig = () => {
    handleTriggerSync();
  };

  const isGenerated = Object.keys(timetables).length > 0;
  const firestoreConsoleUrl = `https://console.firebase.google.com/project/${currentConfig.projectId || 'hyoid-f67d0'}/firestore`;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        department={department}
        setDepartment={setDepartment}
        syncStatus={syncStatus}
        lastSaved={lastSaved}
        onClearAllData={handleClearAllData}
        canRevert={Boolean(revertBackup && (revertBackup.faculty?.length > 0 || revertBackup.subjects?.length > 0 || revertBackup.sections?.length > 0))}
        revertTimestamp={revertBackup?.timestamp}
        onRevertAllData={handleRevertAllData}
        onSaveConfig={handleSaveConfig}
        onTriggerSync={handleTriggerSync}
      />

      {/* Online Firebase Status / Activation Banner */}
      {syncStatus === 'firestore_not_created' && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-medium border-b border-amber-600/40 shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-slate-950" />
            <span>
              <strong>Firebase Project {currentConfig.projectId} Connected:</strong> Cloud Firestore database needs to be activated in your Firebase Console (Choose <em>Create Database</em> &rarr; <em>Start in test mode</em>).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={firestoreConsoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>1-Click Create Firestore</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={handleTriggerSync}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-slate-900 rounded-lg text-xs font-semibold hover:bg-amber-100 border border-amber-400 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Sync</span>
            </button>
          </div>
        </div>
      )}

      {/* Notice Toast */}
      {syncNotice && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>{syncNotice.text}</span>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <StepperNav
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        isGenerated={isGenerated}
      />

      {/* Main Step Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3 animate-pulse">
              <Cloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Connecting to Firebase Cloud Firestore...</p>
            <p className="text-xs text-slate-400 mt-1">Checking online workspace for project {currentConfig.projectId}</p>
          </div>
        ) : (
          <>
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
          </>
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
