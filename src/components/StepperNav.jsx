import React from 'react';
import { STEP_NAMES } from '../types/constants';
import { 
  Users, 
  BookOpen, 
  Layers, 
  UserCheck, 
  Lock, 
  Cpu, 
  Grid, 
  BarChart3, 
  Search, 
  Download 
} from 'lucide-react';

const STEP_ICONS = {
  faculty: Users,
  subjects: BookOpen,
  sections: Layers,
  allocation: UserCheck,
  prefixing: Lock,
  generate: Cpu,
  timetable: Grid,
  workload: BarChart3,
  'free-faculty': Search,
  export: Download,
};

export const StepperNav = ({ activeStep, setActiveStep, isGenerated }) => {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {STEP_NAMES.map((step) => {
            const Icon = STEP_ICONS[step.key] || Grid;
            const isActive = activeStep === step.id;
            const isFinished = step.id < activeStep || (step.id === 6 && isGenerated);

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : isFinished
                      ? 'bg-emerald-100 text-emerald-700 font-semibold'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.id}
                </div>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{step.label.split('. ')[1]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
