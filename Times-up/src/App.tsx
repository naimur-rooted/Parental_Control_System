/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import MapView from './components/MapView';
import WebHistoryView from './components/WebHistoryView';
import InstalledAppsView from './components/InstalledAppsView';
import MessagesCallsView from './components/MessagesCallsView';
import ReportsView from './components/ReportsView';
import RulesManager from './components/RulesManager';
import RemoteControlView from './components/RemoteControlView';

import { Child, Rule, Command, ActivityLog, RuleType, CommandType, LogType } from './types';
import { Shield, Smartphone, Plus, RefreshCw, X, ShieldAlert, Loader2 } from 'lucide-react';

export default function App() {
  // Session Authentication state
  const [token, setToken] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);

  // Layout navigation state
  const [activeTab, setActiveTab] = useState<string>('map');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Children devices state
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  
  // Selected child telemetry and metrics logs state
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);

  // UI state overlays
  const [loading, setLoading] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildToken, setNewChildToken] = useState('');
  const [newChildPlatform, setNewChildPlatform] = useState<'android' | 'ios'>('android');
  const [addChildError, setAddChildError] = useState('');

  // 1. Initial login check
  useEffect(() => {
    const savedToken = localStorage.getItem('times_up_token');
    const savedEmail = localStorage.getItem('times_up_email');
    if (savedToken && savedEmail) {
      setToken(savedToken);
      setParentEmail(savedEmail);
    }
    setAuthChecked(true);
  }, []);

  const handleLoginSuccess = (newToken: string, email: string) => {
    localStorage.setItem('times_up_token', newToken);
    localStorage.setItem('times_up_email', email);
    setToken(newToken);
    setParentEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('times_up_token');
    localStorage.removeItem('times_up_email');
    setToken(null);
    setParentEmail('');
    setChildren([]);
    setSelectedChildId('');
    setLogs([]);
    setRules([]);
    setCommands([]);
  };

  // 2. Fetch children data helper
  const fetchChildren = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/children', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
        if (data.length > 0 && !selectedChildId) {
          setSelectedChildId(data[0].id);
        }
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (err) {
      console.error('Fetch children error', err);
    }
  }, [token, selectedChildId]);

  // 3. Fetch selected child telemetry logs and rules
  const fetchChildTelemetry = useCallback(async (isBackground = false) => {
    if (!token || !selectedChildId) return;
    if (!isBackground) setLoading(true);
    try {
      // Parallel fetch for logs, rules, and command statuses
      const [logsRes, rulesRes, commandsRes] = await Promise.all([
        fetch(`/api/logs?childId=${selectedChildId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/rules?childId=${selectedChildId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/commands?childId=${selectedChildId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (logsRes.ok) setLogs(await logsRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (commandsRes.ok) setCommands(await commandsRes.json());
    } catch (err) {
      console.error('Telemetry fetch fail', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [token, selectedChildId]);

  // Automatic real-time background syncing interval (every 3 seconds)
  useEffect(() => {
    if (!token) return;

    // Run background sync immediately when tab becomes visible or child selected
    fetchChildren();
    if (selectedChildId) {
      fetchChildTelemetry(true);
    }

    const interval = setInterval(() => {
      fetchChildren();
      if (selectedChildId) {
        fetchChildTelemetry(true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [token, selectedChildId, fetchChildren, fetchChildTelemetry]);

  // Active child model details
  const activeChild = children.find(c => c.id === selectedChildId) || null;

  // 4. Remote actions console callback trigger
  const handleTriggerCommand = async (command: string) => {
    if (!token || !selectedChildId) return;
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ childId: selectedChildId, command })
      });
      if (res.ok) {
        // Reload telemetry to register command queued state instantly
        fetchChildTelemetry();
        // Also reload child profile status updates
        fetchChildren();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. CRUD Rules triggers
  const handleCreateRule = async (ruleType: RuleType, config: any) => {
    if (!token || !selectedChildId) return;
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ childId: selectedChildId, ruleType, config })
      });
      if (res.ok) fetchChildTelemetry();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: { config?: any; enabled?: boolean }) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) fetchChildTelemetry();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchChildTelemetry();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this child profile? This will permanently remove all rules, commands, and logs.')) {
      return;
    }
    try {
      const res = await fetch(`/api/children/${childId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setChildren(prev => prev.filter(c => c.id !== childId));
        if (selectedChildId === childId) {
          setSelectedChildId('');
        }
      }
    } catch (err) {
      console.error('Delete child error', err);
    }
  };

  // Block Website Domain quick trigger helper
  const handleBlockWebsiteDomain = async (domain: string) => {
    await handleCreateRule(RuleType.BLOCKED_WEBSITE, { domain });
  };

  // Block App quick trigger toggle helper
  const handleToggleBlockApp = async (appName: string, pkg: string, shouldBlock: boolean) => {
    if (shouldBlock) {
      await handleCreateRule(RuleType.BLOCKED_APP, { appName, package: pkg });
    } else {
      // Find the rule ID matching the package
      const matchingRule = rules.find(r => r.ruleType === RuleType.BLOCKED_APP && r.config?.package === pkg);
      if (matchingRule) {
        await handleDeleteRule(matchingRule.id);
      }
    }
  };

  // 6. Child registration trigger
  const handleRegisterChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName || !newChildToken) {
      setAddChildError('Please fill in all registration fields.');
      return;
    }
    setAddChildError('');
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newChildName,
          deviceToken: newChildToken,
          platform: newChildPlatform
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChildren(prev => {
          const filtered = prev.filter(c => c.id !== data.id);
          return [...filtered, data];
        });
        setSelectedChildId(data.id);
        setNewChildName('');
        setNewChildToken('');
        setIsAddChildOpen(false);
      } else {
        setAddChildError(data.error || 'Registration failed');
      }
    } catch (err) {
      setAddChildError('Server connection failed.');
    }
  };

  // Extracted block categories arrays to pass to grids
  const blockedDomains = rules
    .filter(r => r.ruleType === RuleType.BLOCKED_WEBSITE && r.enabled)
    .map(r => r.config?.domain || '');

  const blockedApps = rules
    .filter(r => r.ruleType === RuleType.BLOCKED_APP && r.enabled)
    .map(r => ({ appName: r.config?.appName || '', package: r.config?.package || '' }));

  // Render loading splash screen before session resolved
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoaderSpinner />
      </div>
    );
  }

  // Render master parent sign in screen
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-100 overflow-hidden select-none">
      
      {/* Navigation Layout Sidebar */}
      <Sidebar
        childrenList={children}
        selectedChildId={selectedChildId}
        onSelectChild={setSelectedChildId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        parentEmail={parentEmail}
        onLogout={handleLogout}
        onAddChild={() => setIsAddChildOpen(true)}
      />

      {/* Primary Dashboard Area container */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-radial from-slate-900/40 via-slate-950 to-black relative">
        
        {/* Top Header Panel */}
        <header className="h-16 border-b border-slate-900/60 flex items-center justify-between px-6 shrink-0 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500 animate-pulse" />
              Time's Up Control
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Sync
            </div>
            <button 
              onClick={() => fetchChildTelemetry(false)}
              disabled={loading || !selectedChildId}
              className="p-2 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
              title="Refresh logs and rules metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading && 'animate-spin text-red-500'}`} />
            </button>
          </div>
        </header>

        {/* Dashboard Workstation Canvas (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* 1. Selected child telemetry dashboard badge */}
          <DashboardHeader 
            child={activeChild} 
            onCommandTriggered={handleTriggerCommand}
            onRefresh={() => fetchChildTelemetry(false)}
            onDeleteChild={handleDeleteChild}
          />

          {/* 2. Active Tab Router workspace */}
          {activeChild ? (
            <div className="relative">
              {loading && (
                <div className="absolute top-0 right-0 p-3 z-30 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-red-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synchronizing data...
                </div>
              )}
              
              {activeTab === 'map' && <MapView logs={logs} childName={activeChild.name} />}
              {activeTab === 'web_history' && (
                <WebHistoryView 
                  logs={logs} 
                  onBlockDomain={handleBlockWebsiteDomain} 
                  blockedDomains={blockedDomains} 
                />
              )}
              {activeTab === 'installed_apps' && (
                <InstalledAppsView 
                  logs={logs} 
                  onToggleBlockApp={handleToggleBlockApp} 
                  blockedApps={blockedApps} 
                />
              )}
              {activeTab === 'messages' && <MessagesCallsView logs={logs} initialSubTab="sms" />}
              {activeTab === 'calls' && <MessagesCallsView logs={logs} initialSubTab="calls" />}
              {activeTab === 'reports' && <ReportsView logs={logs} />}
              {activeTab === 'rules' && (
                <RulesManager 
                  childId={selectedChildId} 
                  rules={rules} 
                  onCreateRule={handleCreateRule} 
                  onUpdateRule={handleUpdateRule} 
                  onDeleteRule={handleDeleteRule} 
                />
              )}
              {activeTab === 'remote' && (
                <RemoteControlView 
                  childId={selectedChildId} 
                  commands={commands} 
                  onTriggerCommand={handleTriggerCommand} 
                  onRefresh={fetchChildTelemetry} 
                />
              )}
              {activeTab === 'activity' && (
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-white mb-4">Complete Ingested Raw Activity Log Feed</h3>
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                    {logs.map((log) => {
                      const date = new Date(log.occurredAt);
                      return (
                        <div key={log.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-red-400 font-bold uppercase">{log.logType}</span>
                            <span className="text-slate-500 block text-[10px] mt-0.5">{date.toLocaleString()}</span>
                          </div>
                          <span className="text-slate-300 max-w-sm truncate" title={JSON.stringify(log.data)}>
                            {JSON.stringify(log.data)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/25 border border-slate-850 border-dashed rounded-2xl p-6">
              <Smartphone className="w-12 h-12 text-slate-700 mx-auto mb-3 animate-bounce" />
              <p className="text-slate-400 text-sm font-semibold">Ready to lock and monitor targets?</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Time's Up has booted successfully. Add your first companion device by registering its unique identity.
              </p>
              <button 
                onClick={() => setIsAddChildOpen(true)}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/10 hover:shadow-red-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Companion Device
              </button>
            </div>
          )}

        </div>
      </main>

      {/* REGISTER COMPANION DEVICE OVERLAY MODAL */}
      {isAddChildOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsAddChildOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-md font-bold text-white leading-none">Register Device target</h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Companion pairing</p>
              </div>
            </div>

            {addChildError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-red-500 shrink-0" />
                <span>{addChildError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterChild} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Child Name</label>
                <input 
                  type="text" 
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs rounded-xl text-white outline-none focus:border-red-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Device Key (Token UUID / Pairing Code)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newChildToken}
                    onChange={(e) => setNewChildToken(e.target.value)}
                    placeholder="e.g. alex-device-uuid-123 or a8f3c921"
                    className="flex-1 bg-slate-950 border border-slate-800 p-2.5 text-xs rounded-xl text-white outline-none focus:border-red-500/50 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = '0123456789abcdef';
                      let token = '';
                      for (let i = 0; i < 8; i++) {
                        token += chars[Math.floor(Math.random() * chars.length)];
                      }
                      setNewChildToken(token);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-semibold border border-slate-750 transition-all cursor-pointer shrink-0"
                  >
                    Generate
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 block mt-1.5">This token must match the <code>deviceToken</code> configured on the child's Flutter App.</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Target Platform OS</label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setNewChildPlatform('android')}
                    className={`p-2.5 border rounded-xl text-xs font-semibold cursor-pointer text-center transition-all ${
                      newChildPlatform === 'android' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'
                    }`}
                  >
                    Android OS
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChildPlatform('ios')}
                    className={`p-2.5 border rounded-xl text-xs font-semibold cursor-pointer text-center transition-all ${
                      newChildPlatform === 'ios' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-white'
                    }`}
                  >
                    Apple iOS
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/40 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsAddChildOpen(false)}
                  className="px-4 py-2 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/10 cursor-pointer transition-all"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="flex flex-col items-center">
      <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-4">Loading Time's Up Shield...</span>
    </div>
  );
}
