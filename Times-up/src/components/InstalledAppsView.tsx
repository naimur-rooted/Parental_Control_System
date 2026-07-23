/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppWindow, ShieldX, ShieldCheck, Search, Flame, MessageCircle, Play, Music, Gamepad2, Compass } from 'lucide-react';
import { ActivityLog } from '../types';

interface InstalledAppsViewProps {
  logs: ActivityLog[];
  onToggleBlockApp: (appName: string, pkg: string, block: boolean) => Promise<void>;
  blockedApps: { appName: string; package: string }[];
}

export default function InstalledAppsView({ logs, onToggleBlockApp, blockedApps }: InstalledAppsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingPkg, setSyncingPkg] = useState<string | null>(null);

  // Filter out INSTALLED_APP logs. Remove duplicate package logs to only get unique apps list
  const installedLogs = logs.filter(l => l.logType === 'installed_app');
  const uniqueApps: { [pkg: string]: any } = {};
  
  installedLogs.forEach(log => {
    if (log.data && log.data.package) {
      // Keep the latest record
      uniqueApps[log.data.package] = log.data;
    }
  });

  const appList = Object.values(uniqueApps);

  const filteredApps = appList.filter(app => {
    const name = (app.name || '').toLowerCase();
    const pkg = (app.package || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || pkg.includes(query);
  });

  const handleToggle = async (app: any, shouldBlock: boolean) => {
    setSyncingPkg(app.package);
    try {
      await onToggleBlockApp(app.name, app.package, shouldBlock);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingPkg(null);
    }
  };

  // Maps package name prefixes to appropriate category icons
  const getAppIcon = (pkg: string, name: string) => {
    const lPkg = pkg.toLowerCase();
    const lName = name.toLowerCase();
    
    if (lPkg.includes('youtube') || lPkg.includes('netflix') || lName.includes('video') || lName.includes('tiktok')) {
      return <Play className="w-5 h-5 text-red-500" />;
    }
    if (lPkg.includes('whatsapp') || lPkg.includes('instagram') || lPkg.includes('social') || lName.includes('chat') || lName.includes('messenger')) {
      return <MessageCircle className="w-5 h-5 text-indigo-400" />;
    }
    if (lPkg.includes('game') || lPkg.includes('roblox') || lPkg.includes('minecraft') || lName.includes('run') || lName.includes('play')) {
      return <Gamepad2 className="w-5 h-5 text-emerald-400" />;
    }
    if (lPkg.includes('spotify') || lPkg.includes('music') || lName.includes('song')) {
      return <Music className="w-5 h-5 text-sky-400" />;
    }
    if (lPkg.includes('browser') || lPkg.includes('chrome') || lName.includes('internet')) {
      return <Compass className="w-5 h-5 text-amber-400" />;
    }
    return <AppWindow className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md font-sans">
      
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <AppWindow className="w-5.5 h-5.5 text-red-500" />
            Installed Mobile Applications
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Toggle and monitor which specific packages are blocked or permitted</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search package name or app..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl text-white placeholder-slate-600 transition-all text-xs outline-none"
          />
        </div>
      </div>

      {/* Grid List */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16 bg-slate-950/20 border border-slate-850/80 rounded-xl p-6">
          <AppWindow className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-xs font-semibold">No applications found</p>
          <p className="text-[10px] text-slate-600 mt-1">
            {searchQuery ? 'Adjust your search filters' : 'Logs will register when the Android companion polls the server.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const isBlocked = blockedApps.some(b => b.package.toLowerCase() === app.package.toLowerCase());
            const date = app.installedAt ? new Date(app.installedAt) : null;

            return (
              <div 
                key={app.package}
                className={`p-4 border rounded-xl flex items-start gap-4 transition-all relative overflow-hidden ${
                  isBlocked 
                    ? 'bg-red-950/10 border-red-900/30 shadow-[0_0_12px_rgba(239,68,68,0.02)]' 
                    : 'bg-slate-950/30 border-slate-850 hover:border-slate-800'
                }`}
              >
                {/* App icon avatar wrapper */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isBlocked ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-900 border border-slate-800'
                }`}>
                  {getAppIcon(app.package, app.name)}
                </div>

                {/* Info and Actions */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-200 text-sm truncate leading-snug">{app.name}</h3>
                  <code className="text-[10px] text-slate-500 font-mono block truncate mt-0.5" title={app.package}>
                    {app.package}
                  </code>
                  
                  {date && (
                    <span className="text-[10px] text-slate-600 font-mono block mt-2">
                      Installed: {date.toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Right side Toggle Checkbox/Action */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {isBlocked ? (
                    <button
                      onClick={() => handleToggle(app, false)}
                      disabled={syncingPkg === app.package}
                      className="inline-flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md cursor-pointer hover:bg-red-500/20 transition-all"
                    >
                      Blocked
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggle(app, true)}
                      disabled={syncingPkg === app.package}
                      className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded-md cursor-pointer transition-all"
                    >
                      Block
                    </button>
                  )}
                </div>

                {/* Syncing indicator */}
                {syncingPkg === app.package && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-xs text-red-500 font-bold">
                    Updating rules...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
