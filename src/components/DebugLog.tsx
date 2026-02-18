"use client";

import { useState, useEffect } from 'react';

export default function DebugLog() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const addLog = (type: string, args: any[]) => {
      // Emergency breaker: If logs exceed 100 in short time, stop logging to prevent browser crash
      if (logs.length > 100) return;
      
      // Don't process empty logs
      if (args.length === 0) return;

      try {
        const message = args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
          } catch (e) {
            return '[Circular/Error]';
          }
        }).join(' ');
        
        // Use setTimeout to avoid state updates during render
        setTimeout(() => {
            setLogs(prev => {
                const newLog = `[${type}] ${new Date().toISOString().split('T')[1].split('.')[0]}: ${message}`;
                // Avoid duplicates if needed, or just slice
                return [newLog, ...prev].slice(0, 50);
            });
        }, 0);
      } catch (err) {
        // Fallback if log processing fails
        originalConsoleError('DebugLog failed to process log:', err);
      }
    };

    console.log = (...args) => {
      addLog('LOG', args);
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      addLog('ERR', args);
      originalConsoleError(...args);
    };

    console.warn = (...args) => {
      addLog('WRN', args);
      originalConsoleWarn(...args);
    };

    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
        addLog('WND-ERR', [message, source, lineno, colno]);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 z-50 bg-gray-800 text-white p-2 rounded-full opacity-50 hover:opacity-100 text-xs shadow-lg"
      >
        Show Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-black/90 text-green-400 p-4 z-50 overflow-auto font-mono text-xs border-t-2 border-green-600">
      <div className="flex justify-between items-center mb-2 sticky top-0 bg-black/90 pb-2 border-b border-gray-700">
        <span className="font-bold">System Logs</span>
        <div className="flex gap-2">
            <button onClick={() => setLogs([])} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">Clear</button>
            <button onClick={() => setIsVisible(false)} className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600">Hide</button>
        </div>
      </div>
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div key={i} className={`whitespace-pre-wrap ${log.includes('[ERR]') ? 'text-red-400' : log.includes('[WRN]') ? 'text-yellow-400' : ''}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
