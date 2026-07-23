/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lock, Unlock, Bell, Trash2, MapPin, Battery, Wifi, WifiOff, Smartphone, 
  Clock, ShieldCheck, Activity, Terminal, Key
} from 'lucide-react';
import { Child } from '../types';

interface DashboardHeaderProps {
  child: Child | null;
  onCommandTriggered: (command: string) => Promise<void>;
  onRefresh: () => void;
  onDeleteChild?: (childId: string) => void;
}

export default function DashboardHeader({ child, onCommandTriggered, onRefresh, onDeleteChild }: DashboardHeaderProps) {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  if (!child) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-center text-center">
        <div>
          <Smartphone className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No active companion device selected</p>
          <p className="text-xs text-slate-600 mt-1">Select or add a child device from the sidebar to begin monitoring.</p>
        </div>
      </div>
    );
  }

  const handleCommand = async (command: string) => {
    setActiveCommand(command);
    try {
      await onCommandTriggered(command);
    } catch (err) {
      console.error(err);
    } finally {
      // Clear after visual delay
      setTimeout(() => setActiveCommand(null), 1500);
    }
  };

  const getBatteryColor = (percent: number) => {
    if (percent > 60) return 'text-green-500 bg-green-500/10 border-green-500/25';
    if (percent > 20) return 'text-amber-500 bg-amber-500/10 border-amber-500/25';
    return 'text-red-500 bg-red-500/10 border-red-500/25 animate-pulse';
  };

  const getSyncTimeStr = (isoString: string) => {
    try {
      const diffMs = new Date().getTime() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 minute ago';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      return new Date(isoString).toLocaleDateString();
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
      {/* Top Background Pattern */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-red-500/5 rounded-full filter blur-3xl -z-10 pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Child Profile Telemetry */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border text-white font-bold text-lg shadow-lg ${
              child.isLocked 
                ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                : 'bg-slate-850 border-slate-700/60 text-white'
            }`}>
              {child.isLocked ? <Lock className="w-6 h-6 text-red-500" /> : child.name[0]}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] text-white border shadow-md ${
              child.platform === 'android' ? 'bg-emerald-600 border-emerald-500' : 'bg-sky-600 border-sky-500'
            }`}>
              {child.platform === 'android' ? 'A' : 'i'}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight leading-none">{child.name}</h2>
              {child.isLocked ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/25 text-red-400">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Unlocked
                </span>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
              {/* Battery Indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${getBatteryColor(child.batteryPercent)}`}>
                <Battery className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">{child.batteryPercent}%</span>
              </div>

              {/* Network Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400">
                <Wifi className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                <span>{child.networkType}</span>
              </div>

              {/* Last Sync Indicator */}
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Sync: <b className="text-slate-400 font-medium">{getSyncTimeStr(child.lastSeenAt)}</b></span>
              </div>

              {/* Pairing Token Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[11px]" title="Pairing code to configure on the companion app">
                <Key className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Pairing Code: <b className="text-white select-all">{child.deviceToken}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Remote Trigger Console */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          {/* LOCATE NOW */}
          <button
            onClick={() => handleCommand('locate')}
            disabled={activeCommand !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Request Instant GPS Location"
          >
            {activeCommand === 'locate' ? (
              <Activity className="w-4 h-4 text-sky-500 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 text-sky-500" />
            )}
            Locate Now
          </button>

          {/* RING PHONE */}
          <button
            onClick={() => handleCommand('ring')}
            disabled={activeCommand !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Play high volume alert on child device"
          >
            {activeCommand === 'ring' ? (
              <Activity className="w-4 h-4 text-amber-500 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 text-amber-500" />
            )}
            Ring
          </button>

          {/* INSTANT LOCK / UNLOCK TOGGLE */}
          {child.isLocked ? (
            <button
              onClick={() => handleCommand('unlock')}
              disabled={activeCommand !== null}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10 transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Unlock device screen instantly"
            >
              {activeCommand === 'unlock' ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              Unlock Screen
            </button>
          ) : (
            <button
              onClick={() => handleCommand('lock')}
              disabled={activeCommand !== null}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/10 transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Lock device screen instantly"
            >
              {activeCommand === 'lock' ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Lock Device
            </button>
          )}

          {/* FACTORY RESET (Emergency) */}
          <button
            onClick={() => {
              if (confirm('WARNING: Are you sure you want to trigger a remote device reset? This will sign out companion controls.')) {
                handleCommand('reset');
              }
            }}
            disabled={activeCommand !== null}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-900/30 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Trigger factory reset command"
          >
            {activeCommand === 'reset' ? (
              <Activity className="w-4 h-4 text-red-500 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 text-red-500/70" />
            )}
            Emergency Reset
          </button>

          {/* DELETE CHILD PROFILE */}
          {onDeleteChild && (
            <button
              onClick={() => onDeleteChild(child.id)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-900/40 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 transition-all text-xs font-semibold cursor-pointer"
              title="Delete this child profile permanently"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              Delete Profile
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
