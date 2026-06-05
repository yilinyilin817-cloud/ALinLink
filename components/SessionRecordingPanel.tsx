import { BookOpen, Circle, Download, Pause, Play, Square, X } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Host, TerminalSession } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";

// Recording data model
export interface RecordingEntry {
  timestamp: number;
  type: "input" | "output";
  data: string;
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  hostLabel: string;
  startTime: number;
  endTime?: number;
  entries: RecordingEntry[];
  status: "recording" | "paused" | "stopped";
}

interface SessionRecordingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TerminalSession[];
  recordings: SessionRecording[];
  activeRecordingIds: Set<string>;
  onStartRecording: (sessionId: string) => void;
  onStopRecording: (sessionId: string) => void;
  onPauseRecording: (sessionId: string) => void;
  onResumeRecording: (sessionId: string) => void;
  onExportRecording: (recordingId: string) => void;
}

const SessionRecordingPanelInner: React.FC<SessionRecordingPanelProps> = ({
  isOpen,
  onClose,
  sessions,
  recordings,
  activeRecordingIds,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onExportRecording,
}) => {
  const [selectedTab, setSelectedTab] = useState<"sessions" | "recordings">("sessions");

  const connectedSessions = useMemo(
    () => sessions.filter((s) => s.status === "connected"),
    [sessions]
  );

  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, []);

  const formatTime = useCallback((ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            <span className="text-sm font-semibold">Session Recording</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div className="flex bg-muted rounded-md p-0.5">
              <button
                type="button"
                className={cn(
                  "px-3 py-1 text-xs rounded-sm transition-colors",
                  selectedTab === "sessions" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSelectedTab("sessions")}
              >
                Sessions
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 py-1 text-xs rounded-sm transition-colors",
                  selectedTab === "recordings" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSelectedTab("recordings")}
              >
                Recordings ({recordings.length})
              </button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[500px]">
          {selectedTab === "sessions" ? (
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Select a connected session to start recording terminal output.
              </p>
              {connectedSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No connected sessions</p>
                  <p className="text-xs">Connect to a host first to start recording</p>
                </div>
              ) : (
                connectedSessions.map((session) => {
                  const isRecording = activeRecordingIds.has(session.id);
                  const recording = recordings.find((r) => r.sessionId === session.id && r.status !== "stopped");

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          isRecording ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30"
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{session.hostLabel}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {isRecording && recording
                              ? `Recording... ${recording.entries.length} entries (${formatDuration(Date.now() - recording.startTime)})`
                              : session.status === "connected" ? "Ready to record" : "Disconnected"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!isRecording ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5"
                            onClick={() => onStartRecording(session.id)}
                          >
                            <Circle size={10} className="fill-red-500 text-red-500" />
                            Record
                          </Button>
                        ) : (
                          <>
                            {recording?.status === "recording" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5"
                                onClick={() => onPauseRecording(session.id)}
                              >
                                <Pause size={10} />
                                Pause
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5"
                                onClick={() => onResumeRecording(session.id)}
                              >
                                <Play size={10} />
                                Resume
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5"
                              onClick={() => onStopRecording(session.id)}
                            >
                              <Square size={10} />
                              Stop
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {recordings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recordings yet</p>
                  <p className="text-xs">Start recording from the Sessions tab</p>
                </div>
              ) : (
                recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0",
                        recording.status === "recording" ? "bg-red-500 animate-pulse" :
                        recording.status === "paused" ? "bg-yellow-500" : "bg-muted-foreground/30"
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{recording.hostLabel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatTime(recording.startTime)} - {recording.endTime ? formatTime(recording.endTime) : "Ongoing"} | {recording.entries.length} entries | {recording.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {recording.status === "stopped" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5"
                          onClick={() => onExportRecording(recording.id)}
                        >
                          <Download size={10} />
                          Export .cast
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export const SessionRecordingPanel = memo(SessionRecordingPanelInner);
SessionRecordingPanel.displayName = "SessionRecordingPanel";

/** Export a recording to asciinema v2 .cast format */
export function exportToCast(recording: SessionRecording): string {
  const header = JSON.stringify({
    version: 2,
    width: 120,
    height: 40,
    timestamp: Math.floor(recording.startTime / 1000),
    title: `Recording of ${recording.hostLabel}`,
    env: { TERM: "xterm-256color", SHELL: "/bin/bash" },
  });

  const events = recording.entries.map((entry) => {
    const relativeTime = (entry.timestamp - recording.startTime) / 1000;
    return JSON.stringify([relativeTime, entry.type, entry.data]);
  });

  return header + "\n" + events.join("\n") + "\n";
}
