/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Globe, ShieldX, Search, ShieldCheck, ExternalLink, Calendar, Filter } from 'lucide-react';
import { ActivityLog } from '../types';

interface WebHistoryViewProps {
  logs: ActivityLog[];
  onBlockDomain: (domain: string) => Promise<void>;
  blockedDomains: string[];
}

export default function WebHistoryView({ logs, onBlockDomain, blockedDomains }: WebHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [blockingDomain, setBlockingDomain] = useState<string | null>(null);

  const webLogs = logs
    .filter(l => l.logType === 'web_visit')
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const filteredLogs = webLogs.filter(log => {
    const title = (log.data.title || '').toLowerCase();
    const domain = (log.data.domain || '').toLowerCase();
    const url = (log.data.url || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || domain.includes(query) || url.includes(query);
  });

  const handleBlock = async (domain: string) => {
    setBlockingDomain(domain);
    try {
      await onBlockDomain(domain);
    } catch (err) {
      console.error(err);
    } finally {
      setBlockingDomain(null);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md font-sans">
      
      {/* Tab Header & Search Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-5.5 h-5.5 text-red-500" />
            Web Surfing History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Logs and filter websites visited by your child's companion browser</p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords or domains..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 rounded-xl text-white placeholder-slate-600 transition-all text-xs outline-none"
          />
        </div>
      </div>

      {/* Web Visits History list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="pb-3 w-[55%]">Website & Page Info</th>
              <th className="pb-3 w-[20%]">Domain</th>
              <th className="pb-3 w-[15%]">Timestamp</th>
              <th className="pb-3 w-[10%] text-right">Protection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-xs text-slate-500 font-medium">
                  {searchQuery ? 'No matching web visits found' : 'No web history logs streamed yet'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const domain = log.data.domain || 'unknown.com';
                const isBlocked = blockedDomains.includes(domain);
                const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                const date = new Date(log.occurredAt);

                return (
                  <tr key={log.id} className="group hover:bg-slate-950/35 transition-colors">
                    {/* Title + URL */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3.5">
                        <img 
                          src={faviconUrl} 
                          alt="web"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>';
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 p-1.5 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200 text-xs block truncate leading-snug group-hover:text-white transition-colors">
                            {log.data.title || 'Untitled Webpage'}
                          </span>
                          <a 
                            href={log.data.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-red-400 font-mono mt-0.5 truncate max-w-[320px]"
                          >
                            {log.data.url}
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Domain label */}
                    <td className="py-4 text-xs font-medium text-slate-400 font-mono">
                      {domain}
                    </td>

                    {/* Visited At date */}
                    <td className="py-4">
                      <div className="text-xs text-slate-400">
                        {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Actions button */}
                    <td className="py-4 text-right">
                      {isBlocked ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                          <ShieldX className="w-3.5 h-3.5" /> Blocked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBlock(domain)}
                          disabled={blockingDomain !== null}
                          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 px-2.5 py-1 rounded-lg transition-all font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {blockingDomain === domain ? (
                            'Blocking...'
                          ) : (
                            <>
                              <ShieldX className="w-3.5 h-3.5" /> Block Domain
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
