/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Map, Activity, Globe, AppWindow, MessageSquare, Phone, BarChart3, ShieldAlert, 
  Settings, LogOut, PanelLeftClose, PanelLeft, Plus, Smartphone, UserCircle, RefreshCw
} from 'lucide-react';
import { Child } from '../types';

interface SidebarProps {
  childrenList: Child[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  parentEmail: string;
  onLogout: () => void;
  onAddChild: () => void;
}

export default function Sidebar({
  childrenList,
  selectedChildId,
  onSelectChild,
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  parentEmail,
  onLogout,
  onAddChild
}: SidebarProps) {

  const menuItems = [
    { id: 'map', label: 'Map History', icon: Map },
    { id: 'activity', label: 'Activity Logs', icon: Activity },
    { id: 'web_history', label: 'Web History', icon: Globe },
    { id: 'installed_apps', label: 'Installed Apps', icon: AppWindow },
    { id: 'messages', label: 'SMS & Messages', icon: MessageSquare },
    { id: 'calls', label: 'Call Records', icon: Phone },
    { id: 'reports', label: 'Usage Reports', icon: BarChart3 },
    { id: 'rules', label: 'Policy Rules', icon: ShieldAlert },
    { id: 'remote', label: 'Remote Control', icon: Smartphone }
  ];

  return (
    <aside className={`bg-slate-950 border-r border-slate-900/60 flex flex-col transition-all duration-300 h-screen shrink-0 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900/60 shrink-0">
        <div className={`flex items-center gap-3 overflow-hidden ${!sidebarOpen && 'justify-center w-full'}`}>
          <div className="w-9 h-9 bg-red-600/15 border border-red-500/20 rounded-lg flex items-center justify-center text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.05)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          {sidebarOpen && (
            <div>
              <span className="font-bold text-white text-sm tracking-tight block">Time's Up</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Dashboard</span>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(false)}
            className="text-slate-500 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-16 top-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white p-1.5 rounded-lg z-50 cursor-pointer shadow-md"
          >
            <PanelLeft className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Child Device Select Selector */}
      <div className="p-4 border-b border-slate-900/40 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          {sidebarOpen && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Devices</span>}
          <button 
            onClick={onAddChild}
            className="text-red-500 hover:text-red-400 p-1 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
            title="Register Companion Device"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {childrenList.length === 0 ? (
          sidebarOpen && (
            <div className="text-xs text-slate-500 bg-slate-900/30 border border-slate-900 border-dashed rounded-lg p-3 text-center">
              No device found
            </div>
          )
        ) : (
          <div className="space-y-1">
            {childrenList.map((child) => {
              const isSelected = child.id === selectedChildId;
              const isAndroid = child.platform === 'android';
              return (
                <button
                  key={child.id}
                  onClick={() => onSelectChild(child.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-red-500/10 border border-red-500/35 text-white' 
                      : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-red-500/20 text-red-400' : 'bg-slate-900 text-slate-500'
                  }`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  {sidebarOpen && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">{child.name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {child.isLocked ? 'Locked' : `Bat: ${child.batteryPercent}% • ${child.networkType}`}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {sidebarOpen && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Navigation</div>}
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 py-2.5 px-3 rounded-xl transition-all text-sm cursor-pointer ${
                isActive 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/15 font-medium' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <IconComponent className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-900/60 shrink-0 bg-slate-950">
        {sidebarOpen && (
          <div className="flex items-center gap-3 mb-4 bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
            <UserCircle className="w-8 h-8 text-slate-500" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block leading-none mb-1">Parent</span>
              <span className="text-xs text-white font-medium truncate block">{parentEmail}</span>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm cursor-pointer"
          title={!sidebarOpen ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
