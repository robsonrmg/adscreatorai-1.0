import React from 'react';
import { LogEntry } from '../types';
import { Activity, Clock } from 'lucide-react';

interface Props {
  logs: LogEntry[];
}

export default function ActivityLogPanel({ logs }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" id="activity-log-panel">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-green-400" />
        <h3 className="text-xs font-black tracking-wider uppercase font-mono text-slate-350 text-slate-350">
          Atividades & Logs do Servidor
        </h3>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-slate-500 font-sans italic text-center py-6">
          Nenhuma atividade gravada no momento. Crie sua primeira página por IA para iniciar o log de auditoria.
        </p>
      ) : (
        <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 text-xs leading-relaxed border-l-2 border-slate-800 pl-3.5 pb-1">
              <div className="flex-1 space-y-0.5">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-200 font-sans">{log.action}</span>
                  <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                    <Clock size={10} />
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans pr-4">{log.details}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
