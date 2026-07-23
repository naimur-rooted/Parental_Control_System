/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Phone, ShieldCheck, Search, Filter, PhoneIncoming, 
  PhoneOutgoing, PhoneMissed, ArrowDownLeft, ArrowUpRight, MessageCircle, Mail
} from 'lucide-react';
import { ActivityLog, LogType } from '../types';

interface MessagesCallsViewProps {
  logs: ActivityLog[];
  initialSubTab?: 'sms' | 'messages' | 'calls';
}

export default function MessagesCallsView({ logs, initialSubTab = 'sms' }: MessagesCallsViewProps) {
  const [subTab, setSubTab] = useState<'sms' | 'messages' | 'calls'>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactFilter, setContactFilter] = useState('');

  // Sync state with initialSubTab changes
  useEffect(() => {
    setSubTab(initialSubTab);
    setContactFilter('');
  }, [initialSubTab]);

  // 1. Separate logs by sub-type
  const smsLogs = logs
    .filter(l => l.logType === LogType.SMS)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const appLogs = logs
    .filter(l => l.logType === LogType.MESSAGE)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const callLogs = logs
    .filter(l => l.logType === LogType.CALL_LOG)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  // 2. Extract unique contacts for dropdown filters
  const getUniqueContacts = () => {
    const list = new Set<string>();
    if (subTab === 'sms') {
      smsLogs.forEach(l => l.data?.sender && list.add(l.data.sender));
    } else if (subTab === 'messages') {
      appLogs.forEach(l => l.data?.contact && list.add(l.data.contact));
    } else if (subTab === 'calls') {
      callLogs.forEach(l => l.data?.name && list.add(l.data.name));
    }
    return Array.from(list);
  };

  const contacts = getUniqueContacts();

  // 3. Filter arrays based on search + contact selections
  const getFilteredSms = () => {
    return smsLogs.filter(log => {
      const sender = (log.data?.sender || '').toLowerCase();
      const body = (log.data?.body || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = sender.includes(query) || body.includes(query);
      const matchesContact = contactFilter ? log.data?.sender === contactFilter : true;
      return matchesSearch && matchesContact;
    });
  };

  const getFilteredMessages = () => {
    return appLogs.filter(log => {
      const app = (log.data?.app || '').toLowerCase();
      const contact = (log.data?.contact || '').toLowerCase();
      const preview = (log.data?.preview || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = app.includes(query) || contact.includes(query) || preview.includes(query);
      const matchesContact = contactFilter ? log.data?.contact === contactFilter : true;
      return matchesSearch && matchesContact;
    });
  };

  const getFilteredCalls = () => {
    return callLogs.filter(log => {
      const name = (log.data?.name || '').toLowerCase();
      const number = (log.data?.number || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.includes(query) || number.includes(query);
      const matchesContact = contactFilter ? log.data?.name === contactFilter : true;
      return matchesSearch && matchesContact;
    });
  };

  // Duration Formatter (Seconds -> MM:SS)
  const formatDuration = (seconds: number | undefined | null) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md font-sans">
      
      {/* Header and Sub tabs selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5.5 h-5.5 text-red-500" />
            Communications Inspector
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Decrypting and archiving remote chats, SMS, and telephone logs at rest</p>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 p-1 rounded-xl">
          <button
            onClick={() => { setSubTab('sms'); setContactFilter(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'sms' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'text-slate-500 hover:text-white'
            }`}
          >
            SMS
          </button>
          <button
            onClick={() => { setSubTab('messages'); setContactFilter(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'messages' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'text-slate-500 hover:text-white'
            }`}
          >
            App Chats
          </button>
          <button
            onClick={() => { setSubTab('calls'); setContactFilter(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              subTab === 'calls' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'text-slate-500 hover:text-white'
            }`}
          >
            Calls
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search keywords inside ${subTab.toUpperCase()}...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl text-white placeholder-slate-600 transition-all text-xs outline-none"
          />
        </div>

        {/* Dropdown Filter */}
        {contacts.length > 0 && (
          <div className="relative w-full sm:w-56 shrink-0">
            <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950/60 border border-slate-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl text-white/90 text-xs outline-none appearance-none cursor-pointer"
            >
              <option value="">Filter by Contact (All)</option>
              {contacts.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lists display */}
      <div className="space-y-3">
        {/* SMS LOGS TAB */}
        {subTab === 'sms' && (
          getFilteredSms().length === 0 ? (
            <div className="text-center py-14 text-xs text-slate-500 font-medium">No matching SMS logs found.</div>
          ) : (
            getFilteredSms().map(log => {
              const isIncoming = log.data.direction === 'incoming';
              const date = new Date(log.occurredAt);
              return (
                <div key={log.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isIncoming ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {isIncoming ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-white block">{log.data.sender || 'Unknown'}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-line bg-slate-950/50 border border-slate-900/60 p-3 rounded-lg font-mono">
                      {log.data.body}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                      AES-255 encrypted at rest
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* MESSAGES TAB */}
        {subTab === 'messages' && (
          getFilteredMessages().length === 0 ? (
            <div className="text-center py-14 text-xs text-slate-500 font-medium">No matching App Messages found.</div>
          ) : (
            getFilteredMessages().map(log => {
              const isIncoming = log.data.direction === 'incoming';
              const date = new Date(log.occurredAt);
              return (
                <div key={log.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-indigo-400">
                    <MessageCircle className="w-5 h-5 text-indigo-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white block">{log.data.contact || 'Unknown'}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wide">
                          {log.data.app || 'WhatsApp'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 leading-relaxed font-mono">
                      {log.data.preview}
                    </p>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* CALLS TAB */}
        {subTab === 'calls' && (
          getFilteredCalls().length === 0 ? (
            <div className="text-center py-14 text-xs text-slate-500 font-medium">No matching Call logs found.</div>
          ) : (
            getFilteredCalls().map(log => {
              const type = log.data.type || 'missed';
              const isMissed = type === 'missed';
              const isIncoming = type === 'incoming';
              const date = new Date(log.occurredAt);

              const getCallIcon = () => {
                if (isMissed) return <PhoneMissed className="w-5 h-5 text-red-500" />;
                if (isIncoming) return <PhoneIncoming className="w-5 h-5 text-indigo-400" />;
                return <PhoneOutgoing className="w-5 h-5 text-emerald-400" />;
              };

              return (
                <div key={log.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isMissed ? 'bg-red-500/10 border-red-500/20' : isIncoming ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    {getCallIcon()}
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
                    <div className="col-span-1">
                      <span className="text-xs font-bold text-white block">{log.data.name || 'Unknown Contact'}</span>
                      <code className="text-[10px] text-slate-500 font-mono mt-0.5 block">{log.data.number}</code>
                    </div>

                    <div className="col-span-1 text-xs">
                      <span className="text-slate-500 block">Call Type / Duration</span>
                      <span className={`font-semibold text-xs mt-0.5 block ${isMissed ? 'text-red-500' : 'text-slate-300'}`}>
                        {type.toUpperCase()} {isMissed ? '(Missed)' : `(${formatDuration(log.data.duration)})`}
                      </span>
                    </div>

                    <div className="col-span-1 sm:text-right text-[10px] text-slate-500 font-mono">
                      {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
