import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEMO_LEAVE_CATEGORIES, DEMO_LEAVE_HISTORY } from '../data/mockData';
import { LeaveItem } from '../types';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';

export const LeaveScreen: React.FC = () => {
  const { navigate, theme } = useApp();
  const [leaves, setLeaves] = useState<LeaveItem[]>(DEMO_LEAVE_HISTORY);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [category, setCategory] = useState(DEMO_LEAVE_CATEGORIES[0].name);
  const [fromDate, setFromDate] = useState('2026-10-25');
  const [toDate, setToDate] = useState('2026-10-26');
  const [reason, setReason] = useState('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const newLeave: LeaveItem = {
      id: `lev-${Date.now()}`,
      category,
      fromDate,
      toDate,
      reason,
      status: 'Pending',
      appliedOn: 'Today',
    };

    setLeaves([newLeave, ...leaves]);
    setShowApplyModal(false);
    setReason('');
  };

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 pb-20 ${
      theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#F8F7F4] text-[#1E1A1D]'
    }`}>
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
          theme === 'dark' ? 'bg-[#0A0A0A]/90 border-b border-[#1E1E1E]' : 'bg-[#F8F7F4]/90 border-b border-[#E8E8E8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Leave Management</h1>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="px-3 py-1.5 rounded-full bg-[#FF7A00] text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
        >
          <Plus size={14} />
          <span>Apply</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="px-5 pt-4 space-y-4">
        {/* Leave Categories / Balances */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2.5">
            Leave Quotas
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {DEMO_LEAVE_CATEGORIES.map(cat => (
              <div
                key={cat.id}
                className={`p-3 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                }`}
              >
                <p className="text-xs font-semibold truncate">{cat.name}</p>
                <p className="text-lg font-bold text-[#FF7A00] mt-0.5">{cat.maxDays} <span className="text-[10px] text-gray-400 font-normal">days/sem</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* History List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2.5">
            Application History
          </h2>
          <div className="space-y-2.5">
            {leaves.map(item => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-[#141517] border-[#222428]' : 'bg-white border-[#E8E8E8]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#FF7A00]">{item.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs font-medium mb-1">{item.reason}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{item.fromDate} to {item.toDate}</span>
                  </div>
                  <span>Applied: {item.appliedOn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleApply}
            className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl transition-colors ${
              theme === 'dark' ? 'bg-[#1E1E1E] border border-[#2A2A2A]' : 'bg-white border border-gray-100'
            }`}
          >
            <h3 className="text-base font-bold mb-3">Apply for Leave</h3>
            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Leave Type</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
                  }`}
                >
                  {DEMO_LEAVE_CATEGORIES.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs outline-none ${
                      theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs outline-none ${
                      theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Specify academic or medical justification..."
                  className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none ${
                    theme === 'dark' ? 'bg-[#121212] border-[#2A2A2A] text-white' : 'bg-gray-50 border-gray-200 text-black'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF7A00] text-white text-xs font-semibold hover:bg-[#E66E00]"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
