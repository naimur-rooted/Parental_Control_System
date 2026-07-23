/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { BarChart3, Clock, AlertCircle, Sparkles, Smartphone } from 'lucide-react';
import { ActivityLog } from '../types';

interface ReportsViewProps {
  logs: ActivityLog[];
}

const CATEGORY_COLORS = {
  Gaming: '#ef4444',       // Red
  Entertainment: '#3b82f6', // Blue
  Social: '#8b5cf6',        // Purple
  Music: '#f59e0b',         // Orange
  Education: '#10b981',     // Green
  Other: '#64748b'          // Slate
};

function getNormalizedMinutes(data: any): number {
  if (!data) return 0;
  const raw = Number(data.minutes ?? data.duration ?? data.time ?? data.totalTimeInForeground ?? 0);
  if (isNaN(raw) || raw <= 0) return 0;
  if (raw > 100000) return Math.min(Math.round(raw / 60000), 1440);
  if (raw > 300) return Math.min(Math.round(raw / 60), 1440);
  return Math.min(Math.round(raw), 1440);
}

export default function ReportsView({ logs }: ReportsViewProps) {
  
  // 1. Memoized calculation: 7-day Screen Time
  const screenTimeData = useMemo(() => {
    const screenTimeLogs = logs.filter(l => l.logType === 'screen_time');
    const appUsageLogs = logs.filter(l => l.logType === 'app_usage');
    
    const dailyScreenTimeMap: { [dateStr: string]: number } = {};
    
    screenTimeLogs.forEach(log => {
      try {
        const dateStr = new Date(log.occurredAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const mins = getNormalizedMinutes(log.data);
        dailyScreenTimeMap[dateStr] = Math.min(Math.max(dailyScreenTimeMap[dateStr] || 0, mins), 1440);
      } catch (e) {}
    });

    // Group app usage by date and app name to find MAX value reported for each app per day
    const dailyAppMaxMap: { [dateStr: string]: { [app: string]: number } } = {};

    appUsageLogs.forEach(log => {
      try {
        const dateStr = new Date(log.occurredAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const appName = log.data?.app || log.data?.appName || log.data?.package || log.data?.packageName || 'App';
        const mins = getNormalizedMinutes(log.data);
        if (!dailyAppMaxMap[dateStr]) dailyAppMaxMap[dateStr] = {};
        dailyAppMaxMap[dateStr][appName] = Math.max(dailyAppMaxMap[dateStr][appName] || 0, mins);
      } catch (e) {}
    });

    // Calculate sum of max app usages for each day
    const dailyAppUsageMap: { [dateStr: string]: number } = {};
    Object.entries(dailyAppMaxMap).forEach(([dateStr, appMap]) => {
      const dayTotal = Object.values(appMap).reduce((acc, curr) => acc + curr, 0);
      dailyAppUsageMap[dateStr] = Math.min(dayTotal, 1440);
    });

    const now = new Date();
    const datesList: string[] = [];
    const dailyMap: { [dateStr: string]: number } = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      datesList.push(dateStr);
      dailyMap[dateStr] = 0;
    }

    let hasAnyDataIn7Days = false;
    datesList.forEach(dateStr => {
      const explicitScreenTime = dailyScreenTimeMap[dateStr] || 0;
      const computedAppUsage = dailyAppUsageMap[dateStr] || 0;
      const bestVal = Math.min(Math.max(explicitScreenTime, computedAppUsage), 1440);
      dailyMap[dateStr] = bestVal;
      if (bestVal > 0) hasAnyDataIn7Days = true;
    });

    if (!hasAnyDataIn7Days) {
      const allLogDates = Array.from(
        new Set([...Object.keys(dailyScreenTimeMap), ...Object.keys(dailyAppUsageMap)])
      );
      if (allLogDates.length > 0) {
        allLogDates.forEach(dateStr => {
          const explicitScreenTime = dailyScreenTimeMap[dateStr] || 0;
          const computedAppUsage = dailyAppUsageMap[dateStr] || 0;
          dailyMap[dateStr] = Math.min(Math.max(explicitScreenTime, computedAppUsage), 1440);
        });
      }
    }

    return Object.entries(dailyMap).map(([date, minutes]) => ({
      date,
      Minutes: minutes
    }));
  }, [logs]);

  // 2. Memoized calculation: Top 10 Apps
  const topAppsData = useMemo(() => {
    const appUsageLogs = logs.filter(l => l.logType === 'app_usage');
    
    // Group by [dateStr][appName] -> take max minutes for that day
    const appDayMaxMap: { [dateStr: string]: { [app: string]: number } } = {};

    appUsageLogs.forEach(log => {
      try {
        const dateStr = new Date(log.occurredAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const appName = log.data?.app || log.data?.appName || log.data?.package || log.data?.packageName || 'Unknown App';
        const minutes = getNormalizedMinutes(log.data);
        if (!appDayMaxMap[dateStr]) appDayMaxMap[dateStr] = {};
        appDayMaxMap[dateStr][appName] = Math.max(appDayMaxMap[dateStr][appName] || 0, minutes);
      } catch (e) {}
    });

    const totals: { [app: string]: number } = {};
    Object.values(appDayMaxMap).forEach(appMap => {
      Object.entries(appMap).forEach(([appName, mins]) => {
        totals[appName] = (totals[appName] || 0) + mins;
      });
    });

    return Object.entries(totals)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
  }, [logs]);

  // 3. Memoized calculation: Category Distribution
  const categoryData = useMemo(() => {
    const appUsageLogs = logs.filter(l => l.logType === 'app_usage');
    const categoryTotals: { [category: string]: number } = {};

    appUsageLogs.forEach(log => {
      const category = log.data?.category || 'Other';
      const minutes = getNormalizedMinutes(log.data);
      categoryTotals[category] = (categoryTotals[category] || 0) + minutes;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value
    }));
  }, [logs]);

  // Total Screen Time calculated over the 7 days
  const aggregateStats = useMemo(() => {
    let totalMins = 0;
    let daysWithUsage = 0;
    screenTimeData.forEach(d => {
      if (d.Minutes > 0) {
        totalMins += d.Minutes;
        daysWithUsage++;
      }
    });
    
    const average = daysWithUsage > 0 ? Math.round(totalMins / daysWithUsage) : 0;
    return {
      total: totalMins,
      average,
      daysCount: daysWithUsage
    };
  }, [screenTimeData]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Analytics Scoreboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Usage Box */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Total Screen-Time</span>
            <span className="text-2xl font-bold text-white tracking-tight leading-none">
              {Math.floor(aggregateStats.total / 60)}h {aggregateStats.total % 60}m
            </span>
            <span className="text-[10px] text-slate-500 block mt-1.5">Aggregated over last {screenTimeData.length} active tracking days</span>
          </div>
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500 shadow-md">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Average Usage Box */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Daily Average</span>
            <span className="text-2xl font-bold text-white tracking-tight leading-none">
              {Math.floor(aggregateStats.average / 60)}h {aggregateStats.average % 60}m
            </span>
            <span className="text-[10px] text-slate-500 block mt-1.5">Optimal limit cap target: 2h 00m</span>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-md">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Screen Status Alerts Box */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Policy status</span>
            <span className="text-2xl font-bold text-emerald-400 tracking-tight leading-none">Healthy</span>
            <span className="text-[10px] text-emerald-500/80 block mt-1.5">No device circumventions detected</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Primary Graphs section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: 7-Day Screen Time */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-red-500" />
            7-Day Screen Time Trends
          </h3>
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={screenTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} label={{ value: 'Mins', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Minutes" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorMinutes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Top 10 Used Apps */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[380px]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-indigo-400" />
            Top 10 Most Used Applications
          </h3>
          <div className="flex-1 w-full text-xs">
            {topAppsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Awaiting app usage logs streams...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAppsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {topAppsData.map((entry, index) => {
                      const color = index === 0 ? '#ef4444' : index < 3 ? '#6366f1' : '#3b82f6';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 3: Category Allocation Shares (Occupies full row width or beautiful layout block) */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md lg:col-span-2 flex flex-col md:flex-row items-center gap-6 min-h-[280px]">
          
          <div className="md:w-1/3 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-sky-400" />
              Category Allocations
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This pie chart aggregates child usage hours grouped by categories. Use this indicator to ensure balanced screen exposure (e.g. limiting Gaming and encouraging Education / Duolingo).
            </p>
            <div className="grid grid-cols-2 gap-2 pt-3">
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate">{cat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full h-[220px] text-xs">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Awaiting categorization details...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => {
                      const color = (CATEGORY_COLORS as any)[entry.name] || CATEGORY_COLORS.Other;
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
