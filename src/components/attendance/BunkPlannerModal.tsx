import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X, Calculator, Sparkles,
  RotateCcw, Check, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import {
  simulateBunk,
  BunkScenario,
} from '../../utils/attendanceCalculations';

interface BunkPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectCode?: string;
}

export const BunkPlannerModal: React.FC<BunkPlannerModalProps> = ({
  isOpen,
  onClose,
  initialSubjectCode,
}) => {
  const { attendanceData, timetableData, theme } = useApp();
  const subjects = attendanceData?.subjects || [];

  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(
    initialSubjectCode || (subjects[0]?.course_code ?? '')
  );

  useEffect(() => {
    if (initialSubjectCode) {
      setSelectedSubjectCode(initialSubjectCode);
    } else if (!selectedSubjectCode && subjects.length > 0) {
      setSelectedSubjectCode(subjects[0].course_code);
    }
  }, [initialSubjectCode, subjects]);

  // Horizon presets
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [preset, setPreset] = useState<'today' | 'tomorrow' | 'custom'>('tomorrow');
  const [startDate, setStartDate] = useState<string>(tomorrowStr);
  const [endDate, setEndDate] = useState<string>(tomorrowStr);
  const [scenario, setScenario] = useState<BunkScenario>('skip');
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  // Per-session choices: maps session ID -> BunkScenario
  const [perSessionChoices, setPerSessionChoices] = useState<Record<string, BunkScenario>>({});
  const [showPerSessionToggle, setShowPerSessionToggle] = useState<boolean>(false);

  // Active Subject
  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.course_code === selectedSubjectCode) || subjects[0] || null;
  }, [subjects, selectedSubjectCode]);

  const handleSelectPreset = (p: 'today' | 'tomorrow' | 'custom') => {
    setPreset(p);
    setPerSessionChoices({});
    if (p === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (p === 'tomorrow') {
      setStartDate(tomorrowStr);
      setEndDate(tomorrowStr);
    }
  };

  const handleReset = () => {
    setPreset('tomorrow');
    setStartDate(tomorrowStr);
    setEndDate(tomorrowStr);
    setScenario('skip');
    setTargetPercentage(75);
    setPerSessionChoices({});
    setShowPerSessionToggle(false);
  };

  // Run simulation
  const simulation = useMemo(() => {
    if (!activeSubject) return null;
    return simulateBunk(
      activeSubject,
      timetableData,
      startDate,
      endDate,
      scenario,
      targetPercentage,
      perSessionChoices
    );
  }, [activeSubject, timetableData, startDate, endDate, scenario, targetPercentage, perSessionChoices]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl transition-all max-h-[92vh] overflow-y-auto ${
          isDark ? 'bg-[#141517] border border-[#222428] text-white' : 'bg-white border border-gray-200 text-black'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold">Plan a Bunk</h3>
              <p className="text-[10px] opacity-60">Hypothetical Attendance Projection</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs flex items-center gap-1 opacity-70 hover:opacity-100 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}
              title="Reset to default settings"
              aria-label="Reset simulation"
            >
              <RotateCcw size={14} />
              <span className="text-[11px]">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 1. Subject Selector */}
        <div className="space-y-1 mb-3.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Subject</label>
          <select
            value={activeSubject?.course_code || ''}
            onChange={(e) => {
              setSelectedSubjectCode(e.target.value);
              setPerSessionChoices({});
            }}
            className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF7A00] ${
              isDark ? 'bg-[#1C1D21] border-[#2E3035] text-white' : 'bg-gray-50 border-gray-200 text-black'
            }`}
          >
            {subjects.map((sub) => (
              <option key={sub.course_code} value={sub.course_code}>
                {sub.subject_name} ({sub.course_code})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Horizon Presets */}
        <div className="space-y-1 mb-3.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Simulation Horizon</label>
          <div className="grid grid-cols-3 gap-2">
            {(['today', 'tomorrow', 'custom'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`py-2 text-xs font-bold rounded-xl border capitalize transition-all ${
                  preset === p
                    ? 'bg-[#FF7A00] border-[#FF7A00] text-white shadow-sm'
                    : isDark
                    ? 'border-[#2E3035] text-gray-300 hover:bg-white/5'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p === 'custom' ? 'Custom Range' : p}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Date Range Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
                setPerSessionChoices({});
              }}
              className={`w-full p-2 mt-1 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF7A00] ${
                isDark ? 'bg-[#1C1D21] border-[#2E3035] text-white' : 'bg-gray-50 border-gray-200 text-black'
              }`}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
                setPerSessionChoices({});
              }}
              className={`w-full p-2 mt-1 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FF7A00] ${
                isDark ? 'bg-[#1C1D21] border-[#2E3035] text-white' : 'bg-gray-50 border-gray-200 text-black'
              }`}
            />
          </div>
        </div>

        {/* 4. Scenario Selector */}
        <div className="space-y-1 mb-3.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Simulation Scenario</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setScenario('skip');
                setPerSessionChoices({});
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                scenario === 'skip'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 font-bold'
                  : isDark
                  ? 'border-[#2E3035] text-gray-300'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <div className="font-bold">Skip Classes (Bunk)</div>
              <div className="text-[10px] opacity-70">Delivered +N, Attended +0</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setScenario('attend');
                setPerSessionChoices({});
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                scenario === 'attend'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 font-bold'
                  : isDark
                  ? 'border-[#2E3035] text-gray-300'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <div className="font-bold">Attend Classes</div>
              <div className="text-[10px] opacity-70">Delivered +N, Attended +N</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setScenario('duty');
                setPerSessionChoices({});
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                scenario === 'duty'
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-500 font-bold'
                  : isDark
                  ? 'border-[#2E3035] text-gray-300'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <div className="font-bold">Duty Leave (DL)</div>
              <div className="text-[10px] opacity-70">Official university activity</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setScenario('medical');
                setPerSessionChoices({});
              }}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                scenario === 'medical'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold'
                  : isDark
                  ? 'border-[#2E3035] text-gray-300'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <div className="font-bold">Medical Leave (ML)</div>
              <div className="text-[10px] opacity-70">Pending Dean review</div>
            </button>
          </div>
        </div>

        {/* 5. Target Attendance Selector */}
        <div className="flex items-center justify-between text-xs mb-4 p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="font-semibold">Minimum Target</span>
          <div className="flex items-center gap-1.5">
            {[65, 75, 80, 85].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setTargetPercentage(pct)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  targetPercentage === pct
                    ? 'bg-[#FF7A00] text-white shadow-sm'
                    : isDark
                    ? 'bg-[#1C1D21] text-gray-400 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Optional Per-Session Selection Accordion */}
        {simulation && simulation.scheduledSessionsCount > 1 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowPerSessionToggle(!showPerSessionToggle)}
              className="w-full flex items-center justify-between py-2 text-xs font-semibold opacity-80 hover:opacity-100"
            >
              <span>Choose specific classes to skip ({simulation.scheduledSessionsCount} sessions)</span>
              {showPerSessionToggle ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showPerSessionToggle && (
              <div className={`p-3 rounded-xl border space-y-2 mt-1 ${isDark ? 'bg-[#0E0E10] border-[#222428]' : 'bg-gray-50 border-gray-200'}`}>
                {simulation.scheduledDates.map((s) => {
                  const currentChoice = perSessionChoices[s.id] || scenario;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-none">
                      <div>
                        <span className="font-bold">{s.day} ({s.date})</span>
                        <span className="opacity-60 ml-2 font-mono text-[10px]">Period {s.period}</span>
                      </div>
                      <select
                        value={currentChoice}
                        onChange={(e) => {
                          const val = e.target.value as BunkScenario;
                          setPerSessionChoices((prev) => ({ ...prev, [s.id]: val }));
                        }}
                        className={`p-1 rounded-lg border text-[11px] font-semibold ${
                          isDark ? 'bg-[#1A1B1F] border-[#2E3035] text-white' : 'bg-white border-gray-200'
                        }`}
                      >
                        <option value="skip">Skip (Bunk)</option>
                        <option value="attend">Attend</option>
                        <option value="duty">Duty Leave</option>
                        <option value="medical">Medical Leave</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SIMULATION RESULTS BOX: Directly below controls              */}
        {/* ============================================================ */}
        {simulation && (
          <div
            className={`p-4 rounded-2xl border space-y-3 mb-4 ${
              isDark ? 'bg-[#0E0E10] border-[#222428]' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#FF7A00]" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Your Projected Attendance</h4>
              </div>
              <span className="text-[11px] font-semibold text-[#FF7A00]">
                {simulation.scheduledSessionsCount} session{simulation.scheduledSessionsCount !== 1 ? 's' : ''} in range
              </span>
            </div>

            {/* Zero Sessions Explanation */}
            {simulation.scheduledSessionsCount === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No Scheduled Sessions Found</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {simulation.zeroSessionsReason || 'No classes are scheduled on the selected date(s) according to your weekly timetable.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Before / After Comparison Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] opacity-60 uppercase font-semibold">Current Attendance</p>
                    <p className="text-xl font-black mt-0.5">{simulation.currentPercentage.toFixed(2)}%</p>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      {simulation.currentAttended} / {simulation.currentDelivered} Delivered
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      simulation.projectedPercentage >= targetPercentage
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                    }`}
                  >
                    <p className="text-[10px] uppercase font-semibold">Projected Attendance</p>
                    <p className="text-xl font-black mt-0.5">{simulation.projectedPercentage.toFixed(2)}%</p>
                    <p className="text-[10px] opacity-80 mt-0.5">
                      Delta: {simulation.percentageDelta >= 0 ? `+${simulation.percentageDelta.toFixed(2)}%` : `${simulation.percentageDelta.toFixed(2)}%`}
                    </p>
                  </div>
                </div>

                {/* Outcome message with simple actionable summary */}
                <div
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    simulation.projectedPercentage >= targetPercentage
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {simulation.projectedPercentage >= targetPercentage ? (
                    <div>
                      <p className="font-bold">Target Maintained ({targetPercentage}%)</p>
                      <p className="text-[11px] mt-0.5 opacity-90">
                        {simulation.projectedSafeBunks > 0
                          ? `You can safely skip ${simulation.projectedSafeBunks} more class${
                              simulation.projectedSafeBunks > 1 ? 'es' : ''
                            } after this plan without falling below ${targetPercentage}%.`
                          : `You are exactly at the minimum target. No further absences permitted.`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold">This plan puts you below your target ({targetPercentage}%)</p>
                      <p className="text-[11px] mt-0.5 opacity-90">
                        Attend <strong className="underline font-bold">{simulation.projectedRecoveryNeeded} consecutive classes</strong> to recover back to {targetPercentage}%.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Advisory disclaimer */}
        <p className="text-[10px] text-gray-500 text-center leading-relaxed mb-4">
          * This planner is advisory. Official attendance eligibility is calculated by the university Examination Board.
        </p>

        {/* Primary Action Button: "Update plan" or "Done" */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#FF7A00] text-white text-xs font-bold hover:bg-[#E66E00] shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <Check size={16} />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
