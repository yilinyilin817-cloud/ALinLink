import { MonitorSpeaker, Play, Square, Terminal, ChevronDown, Check, X } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../application/i18n/I18nProvider";
import { Host, TerminalSession } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";

interface BatchCommandPanelProps {
  isOpen: boolean;
  onClose: () => void;
  hosts: Host[];
  sessions: TerminalSession[];
  /** Send a command string to a terminal session by id */
  onSendToSession?: (sessionId: string, command: string) => void;
}

interface CommandResult {
  sessionId: string;
  hostLabel: string;
  command: string;
  timestamp: number;
}

const BatchCommandPanelInner: React.FC<BatchCommandPanelProps> = ({
  isOpen,
  onClose,
  hosts,
  sessions,
  onSendToSession,
}) => {
  const { t } = useI18n();
  const [command, setCommand] = useState("");
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Only show connected sessions
  const connectedSessions = useMemo(
    () => sessions.filter((s) => s.status === "connected"),
    [sessions]
  );

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-select all connected sessions on first open
  useEffect(() => {
    if (isOpen && selectedSessionIds.size === 0) {
      setSelectedSessionIds(new Set(connectedSessions.map((s) => s.id)));
    }
  }, [isOpen, connectedSessions, selectedSessionIds.size]);

  // Scroll to bottom of history
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commandHistory]);

  const toggleSession = useCallback((sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedSessionIds.size === connectedSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(connectedSessions.map((s) => s.id)));
    }
  }, [connectedSessions, selectedSessionIds.size]);

  const executeCommand = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed || selectedSessionIds.size === 0 || !onSendToSession) return;

    setIsExecuting(true);
    const timestamp = Date.now();
    const results: CommandResult[] = [];

    selectedSessionIds.forEach((sessionId) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        onSendToSession(sessionId, trimmed);
        results.push({
          sessionId,
          hostLabel: session.hostLabel,
          command: trimmed,
          timestamp,
        });
      }
    });

    setCommandHistory((prev) => [...prev, ...results]);
    setCommand("");
    setIsExecuting(false);
  }, [command, selectedSessionIds, sessions, onSendToSession]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        executeCommand();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [executeCommand, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MonitorSpeaker size={18} className="text-primary" />
            <span className="text-sm font-semibold">Batch Command Execution</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {selectedSessionIds.size} hosts selected
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        {/* Host selection */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleAll}
            >
              {selectedSessionIds.size === connectedSessions.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-xs text-muted-foreground">
              ({connectedSessions.length} connected)
            </span>
          </div>
          <ScrollArea className="max-h-[120px]">
            <div className="flex flex-wrap gap-1.5">
              {connectedSessions.map((session) => {
                const isSelected = selectedSessionIds.has(session.id);
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors border",
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-foreground"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => toggleSession(session.id)}
                  >
                    <Terminal size={12} />
                    <span className="truncate max-w-[120px]">{session.hostLabel}</span>
                    {isSelected && <Check size={10} className="text-primary" />}
                  </button>
                );
              })}
              {connectedSessions.length === 0 && (
                <span className="text-xs text-muted-foreground py-2">
                  No connected sessions. Connect to hosts first.
                </span>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Command input */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                $
              </span>
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command to execute on all selected hosts..."
                className="pl-7 font-mono text-sm"
                disabled={selectedSessionIds.size === 0}
              />
            </div>
            <Button
              onClick={executeCommand}
              disabled={!command.trim() || selectedSessionIds.size === 0}
              size="sm"
              className="gap-1.5"
            >
              <Play size={14} />
              Execute
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Press Enter to execute. Command will be sent to all {selectedSessionIds.size} selected sessions.
          </p>
        </div>

        {/* Command history */}
        <ScrollArea className="flex-1 max-h-[300px]">
          <div className="p-4 space-y-1">
            {commandHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MonitorSpeaker size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No commands executed yet</p>
                <p className="text-xs">Commands will appear here as they are sent</p>
              </div>
            ) : (
              commandHistory.map((result, idx) => (
                <div
                  key={`${result.sessionId}-${result.timestamp}-${idx}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 text-xs font-mono"
                >
                  <span className="text-muted-foreground shrink-0">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-primary font-medium shrink-0">
                    {result.hostLabel}
                  </span>
                  <span className="text-muted-foreground shrink-0">$</span>
                  <span className="truncate">{result.command}</span>
                </div>
              ))
            )}
            <div ref={historyEndRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export const BatchCommandPanel = memo(BatchCommandPanelInner);
BatchCommandPanel.displayName = "BatchCommandPanel";
