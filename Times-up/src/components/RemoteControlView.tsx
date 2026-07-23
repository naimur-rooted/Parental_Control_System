/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Terminal, Lock, Unlock, Bell, Trash2, MapPin, Loader2, 
  CheckCircle2, Clock, PlayCircle, HelpCircle, AlertTriangle 
} from 'lucide-react';
import { Command, CommandType, CommandStatus } from '../types';

interface RemoteControlViewProps {
  childId: string;
  commands: Command[];
  onTriggerCommand: (command: CommandType) => Promise<void>;
  onRefresh: () => void;
}

export default function RemoteControlView({
  childId,
  commands,
  onTriggerCommand,
  onRefresh
}: RemoteControlViewProps) {
  const [sendingCmd, setSendingCmd] = useState<CommandType | null>(null);

  // Poll command history every 3 seconds to show real-time transitions (Pending -> Ack -> Done)
  useEffect(() => {
    const timer = setInterval(() => {
      onRefresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const handleCommand = async (type: CommandType) => {
    setSendingCmd(type);
    try {
      await onTriggerCommand(type);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSendingCmd(null), 1000);
    }
  };

  const getStatusBadge = (status: CommandStatus) => {
    switch (status) {
      case CommandStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse">
            <Clock className="w-3 h-3" /> Queued (Pending)
          </span>
        );
      case CommandStatus.ACK:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Received (Ack)
          </span>
        );
      case CommandStatus.DONE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Executed (Done)
          </span>
        );
      default:
        return null;
    }
  };

  const getCommandIcon = (cmd: CommandType) => {
    switch (cmd) {
      case CommandType.LOCK:
        return <Lock className="w-4.5 h-4.5 text-red-500" />;
      case CommandType.UNLOCK:
        return <Unlock className="w-4.5 h-4.5 text-emerald-500" />;
      case CommandType.RING:
        return <Bell className="w-4.5 h-4.5 text-amber-500" />;
      case CommandType.LOCATE:
        return <MapPin className="w-4.5 h-4.5 text-sky-400" />;
      case CommandType.RESET:
        return <Trash2 className="w-4.5 h-4.5 text-red-400 animate-pulse" />;
      default:
        return <HelpCircle className="w-4.5 h-4.5 text-slate-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans">
      
      {/* Commands Control Console panel */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Actions Deck */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-red-500" />
            Shield Command Deck
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Manually queue system actions to execute on the child's device over secure socket headers.
          </p>

          <div className="space-y-3">
            
            {/* INSTANT LOCK */}
            <button
              onClick={() => handleCommand(CommandType.LOCK)}
              disabled={sendingCmd !== null}
              className="w-full flex items-center justify-between p-3 bg-red-950/15 border border-red-900/35 hover:bg-red-950/25 text-red-400 rounded-xl transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4.5 h-4.5" />
                <span>Instant Remote Lock</span>
              </div>
              <span className="text-[10px] bg-red-500/10 border border-red-500/25 text-red-400 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Lock</span>
            </button>

            {/* INSTANT UNLOCK */}
            <button
              onClick={() => handleCommand(CommandType.UNLOCK)}
              disabled={sendingCmd !== null}
              className="w-full flex items-center justify-between p-3 bg-emerald-950/15 border border-emerald-900/35 hover:bg-emerald-950/25 text-emerald-400 rounded-xl transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Unlock className="w-4.5 h-4.5" />
                <span>Instant Remote Unlock</span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Permit</span>
            </button>

            {/* SOUND ALARM */}
            <button
              onClick={() => handleCommand(CommandType.RING)}
              disabled={sendingCmd !== null}
              className="w-full flex items-center justify-between p-3 bg-slate-950/80 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-xl transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4.5 h-4.5 text-amber-500" />
                <span>Trigger Warning Siren</span>
              </div>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Ring</span>
            </button>

            {/* ACQUIRE GPS */}
            <button
              onClick={() => handleCommand(CommandType.LOCATE)}
              disabled={sendingCmd !== null}
              className="w-full flex items-center justify-between p-3 bg-slate-950/80 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded-xl transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4.5 h-4.5 text-sky-400" />
                <span>Force GPS Acquisition</span>
              </div>
              <span className="text-[10px] bg-sky-500/10 border border-sky-500/25 text-sky-400 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Map</span>
            </button>

            {/* FORCE RESET */}
            <button
              onClick={() => {
                if (confirm('DANGER: This will factory reset and erase the child client configuration. Proceed?')) {
                  handleCommand(CommandType.RESET);
                }
              }}
              disabled={sendingCmd !== null}
              className="w-full flex items-center justify-between p-3 bg-red-950/20 border border-red-950 text-red-400 hover:bg-red-950/30 rounded-xl transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4.5 h-4.5 animate-pulse" />
                <span>Emergency System Reset</span>
              </div>
              <span className="text-[10px] bg-red-600 border border-red-500 text-white px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">DANGER</span>
            </button>

          </div>
        </div>

      </div>

      {/* Transaction log files columns */}
      <div className="xl:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col h-[450px]">
        
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/40 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4.5 h-4.5 text-slate-500" />
              Command Transmission Logs
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Live handshake statuses polling between database and Android child companion</p>
          </div>
          <button 
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Reload transaction states"
          >
            <Loader2 className={`w-4 h-4 ${sendingCmd && 'animate-spin'}`} />
          </button>
        </div>

        {/* Console transactions display */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {commands.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No command transactions recorded yet. Use the deck on the left to fire a remote signal.
            </div>
          ) : (
            [...commands].reverse().map((cmd) => {
              const date = new Date(cmd.createdAt);
              return (
                <div key={cmd.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-4 font-mono">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                      {getCommandIcon(cmd.command)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white uppercase">{cmd.command} Handshake</span>
                        <code className="text-[9px] text-slate-600 truncate max-w-[120px]">{cmd.id}</code>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Queued: {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {getStatusBadge(cmd.status)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Console handshake status descriptor */}
        <div className="mt-4 p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-start gap-2 text-[10px] text-slate-500">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0 mt-0.5" />
          <span>
            <b>Real-time simulation loop enabled:</b> Firing commands in this workspace automatically steps through DB queuing (<code>pending</code>) → Client device polling hook (<code>ack</code>) → Completion response callback (<code>done</code>) in 1.5 seconds.
          </span>
        </div>

      </div>

    </div>
  );
}
