/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, Bed, Clock, Globe, AppWindow, ShieldAlert as AlertIcon, Plus, 
  Trash2, ToggleLeft, ToggleRight, Sparkles, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import { Rule, RuleType } from '../types';

interface RulesManagerProps {
  childId: string;
  rules: Rule[];
  onCreateRule: (ruleType: RuleType, config: any) => Promise<void>;
  onUpdateRule: (ruleId: string, updates: { config?: any; enabled?: boolean }) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
}

export default function RulesManager({
  childId,
  rules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule
}: RulesManagerProps) {

  const [savingRuleType, setSavingRuleType] = useState<string | null>(null);

  // Form states
  const [bedtimeStart, setBedtimeStart] = useState('22:00');
  const [bedtimeEnd, setBedtimeEnd] = useState('06:00');
  const [maxMinutes, setMaxMinutes] = useState(120);
  const [newAppName, setNewAppName] = useState('');
  const [newAppPkg, setNewAppPkg] = useState('');
  const [newDomain, setNewDomain] = useState('');

  // 1. Group existing rules by type
  const bedtimeRules = rules.filter(r => r.ruleType === RuleType.BEDTIME);
  const screenLimitRules = rules.filter(r => r.ruleType === RuleType.SCREEN_TIME_LIMIT);
  const blockedAppRules = rules.filter(r => r.ruleType === RuleType.BLOCKED_APP);
  const blockedWebRules = rules.filter(r => r.ruleType === RuleType.BLOCKED_WEBSITE);

  // 2. Submit Handlers
  const handleCreateBedtime = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRuleType('bedtime');
    try {
      await onCreateRule(RuleType.BEDTIME, { startTime: bedtimeStart, endTime: bedtimeEnd, timezone: 'UTC' });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRuleType(null);
    }
  };

  const handleCreateScreenLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRuleType('screen_time_limit');
    try {
      await onCreateRule(RuleType.SCREEN_TIME_LIMIT, { maxMinutesPerDay: Number(maxMinutes) });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRuleType(null);
    }
  };

  const handleCreateBlockedApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName || !newAppPkg) return;
    setSavingRuleType('blocked_app');
    try {
      await onCreateRule(RuleType.BLOCKED_APP, { appName: newAppName, package: newAppPkg });
      setNewAppName('');
      setNewAppPkg('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRuleType(null);
    }
  };

  const handleCreateBlockedWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    setSavingRuleType('blocked_website');
    try {
      await onCreateRule(RuleType.BLOCKED_WEBSITE, { domain: newDomain.toLowerCase() });
      setNewDomain('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRuleType(null);
    }
  };

  const toggleRuleEnabled = async (rule: Rule) => {
    await onUpdateRule(rule.id, { enabled: !rule.enabled });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
      
      {/* Policy 1: Bedtime windows & Daily screen timers */}
      <div className="space-y-6">
        
        {/* Bedtime Curfews */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Bed className="w-5 h-5 text-indigo-400" />
            Bedtime Curfew Lock windows
          </h3>
          <p className="text-xs text-slate-500 mb-5">Locks the child's screen completely during designated sleep schedules.</p>

          <form onSubmit={handleCreateBedtime} className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-xl mb-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Curfew Starts</label>
              <input 
                type="time" 
                value={bedtimeStart}
                onChange={(e) => setBedtimeStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Curfew Ends</label>
              <input 
                type="time" 
                value={bedtimeEnd}
                onChange={(e) => setBedtimeEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs rounded-lg text-white"
              />
            </div>
            <div className="col-span-2 pt-2">
              <button
                type="submit"
                disabled={savingRuleType !== null}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Add Curfew Rule
              </button>
            </div>
          </form>

          {/* List existing bedtime rules */}
          <div className="space-y-2.5">
            {bedtimeRules.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-600">No Bedtime limits configured.</div>
            ) : (
              bedtimeRules.map((rule) => (
                <div key={rule.id} className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Bed className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Sleep Lock Window</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {rule.config.startTime} to {rule.config.endTime} (UTC)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleRuleEnabled(rule)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {rule.enabled ? <ToggleRight className="w-7 h-7 text-red-500" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                    </button>
                    <button 
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Screen Time Allocations */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Daily Screen Time Allocations
          </h3>
          <p className="text-xs text-slate-500 mb-5">Restricts maximum cumulative daily minutes before locking phone screen.</p>

          <form onSubmit={handleCreateScreenLimit} className="flex gap-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl mb-5">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max minutes / Day</label>
              <input 
                type="number" 
                value={maxMinutes}
                onChange={(e) => setMaxMinutes(Number(e.target.value))}
                min={10}
                max={480}
                placeholder="120"
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs rounded-lg text-white"
              />
            </div>
            <div className="self-end pb-0.5">
              <button
                type="submit"
                disabled={savingRuleType !== null}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Set Limit
              </button>
            </div>
          </form>

          {/* List existing limit rules */}
          <div className="space-y-2.5">
            {screenLimitRules.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-600">No active limit restrictions.</div>
            ) : (
              screenLimitRules.map((rule) => (
                <div key={rule.id} className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Maximum Daily Limit</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {rule.config.maxMinutesPerDay} minutes ({Math.round(rule.config.maxMinutesPerDay / 60)} hours)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleRuleEnabled(rule)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {rule.enabled ? <ToggleRight className="w-7 h-7 text-red-500" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                    </button>
                    <button 
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Policy 2: Blocked Websites and Applications */}
      <div className="space-y-6">
        
        {/* Blocked App Packages */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <AppWindow className="w-5 h-5 text-red-400" />
            Blocked Application Rules
          </h3>
          <p className="text-xs text-slate-500 mb-5">Configure manual package rules to block distracting games or social platforms.</p>

          <form onSubmit={handleCreateBlockedApp} className="space-y-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">App Name</label>
                <input 
                  type="text" 
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="e.g. Snapchat"
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-xs rounded-lg text-white outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Package ID</label>
                <input 
                  type="text" 
                  value={newAppPkg}
                  onChange={(e) => setNewAppPkg(e.target.value)}
                  placeholder="e.g. com.snapchat"
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-xs rounded-lg text-white outline-none"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingRuleType !== null}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Block Package
            </button>
          </form>

          {/* List rules */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {blockedAppRules.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-600">No application blocks registered.</div>
            ) : (
              blockedAppRules.map((rule) => (
                <div key={rule.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                      <AppWindow className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{rule.config.appName}</span>
                      <code className="text-[9px] text-slate-500 font-mono block truncate mt-0.5">{rule.config.package}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => toggleRuleEnabled(rule)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {rule.enabled ? <ToggleRight className="w-7 h-7 text-red-500" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                    </button>
                    <button 
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blocked Websites */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            Blocked Website Domains
          </h3>
          <p className="text-xs text-slate-500 mb-5">Restrict companion browser visits to designated server domains.</p>

          <form onSubmit={handleCreateBlockedWebsite} className="flex gap-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl mb-5">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Web Domain</label>
              <input 
                type="text" 
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. reddit.com"
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs rounded-lg text-white outline-none"
                required
              />
            </div>
            <div className="self-end pb-0.5">
              <button
                type="submit"
                disabled={savingRuleType !== null}
                className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Block Website
              </button>
            </div>
          </form>

          {/* List rules */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {blockedWebRules.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-600">No domain blocks registered.</div>
            ) : (
              blockedWebRules.map((rule) => (
                <div key={rule.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
                      <Globe className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{rule.config.domain}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => toggleRuleEnabled(rule)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {rule.enabled ? <ToggleRight className="w-7 h-7 text-red-500" /> : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                    </button>
                    <button 
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
