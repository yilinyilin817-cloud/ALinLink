import { Activity, Cpu, HardDrive, MemoryStick, Network, RefreshCw, X, MonitorSpeaker, ArrowUpDown } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Host, TerminalSession } from "../types";
import type { ServerStats } from "./terminal/hooks/useServerStats";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";

interface HostDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: TerminalSession[];
  /** Map of sessionId -> server stats */
  statsMap: Map<string, ServerStats>;
  onRefresh?: (sessionId: string) => void;
}

type SortField = "name" | "cpu" | "memory" | "disk";
type SortDir = "asc" | "desc";

const HostDashboardInner: React.FC<HostDashboardProps> = ({
  isOpen,
  onClose,
  sessions,
  statsMap,
  onRefresh,
}) => {
  const [sortField, setSortField] = useState<SortField>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const connectedSessions = useMemo(
    () => sessions.filter((s) => s.status === "connected"),
    [sessions]
  );

  // Build host stats list
  const hostStatsList = useMemo(() => {
    const list = connectedSessions.map((session) => {
      const stats = statsMap.get(session.id);
      return {
        session,
        stats: stats || null,
      };
    });

    // Sort
    return list.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      switch (sortField) {
        case "name":
          return sortDir === "asc"
            ? a.session.hostLabel.localeCompare(b.session.hostLabel)
            : b.session.hostLabel.localeCompare(a.session.hostLabel);
        case "cpu":
          aVal = a.stats?.cpu ?? -1;
          bVal = b.stats?.cpu ?? -1;
          break;
        case "memory":
          aVal = a.stats && a.stats.memTotal ? (a.stats.memUsed ?? 0) / a.stats.memTotal * 100 : -1;
          bVal = b.stats && b.stats.memTotal ? (b.stats.memUsed ?? 0) / b.stats.memTotal * 100 : -1;
          break;
        case "disk":
          aVal = a.stats?.diskPercent ?? -1;
          bVal = b.stats?.diskPercent ?? -1;
          break;
        default:
          return 0;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [connectedSessions, statsMap, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }, [sortField]);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, []);

  const formatSpeed = useCallback((bytesPerSec: number) => {
    return `${formatBytes(bytesPerSec)}/s`;
  }, [formatBytes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-5xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MonitorSpeaker size={18} className="text-primary" />
            <span className="text-sm font-semibold">Host Health Dashboard</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {connectedSessions.length} connected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 gap-1.5 text-xs", autoRefresh && "text-primary")}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
              Auto
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-[11px] text-muted-foreground mr-2">Sort by:</span>
          {(["name", "cpu", "memory", "disk"] as SortField[]).map((field) => (
            <button
              key={field}
              type="button"
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
                sortField === field
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => toggleSort(field)}
            >
              {field === "name" ? "Name" : field === "cpu" ? "CPU" : field === "memory" ? "Memory" : "Disk"}
              {sortField === field && (
                <ArrowUpDown size={10} />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[550px]">
          {hostStatsList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MonitorSpeaker size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No connected hosts</p>
              <p className="text-xs">Connect to Linux/macOS servers to see health stats</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {hostStatsList.map(({ session, stats }) => {
                const cpuPercent = stats?.cpu ?? null;
                const memPercent = stats?.memTotal && stats?.memUsed
                  ? Math.round((stats.memUsed / stats.memTotal) * 100)
                  : null;
                const diskPercent = stats?.diskPercent ?? null;

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
                  >
                    {/* Host header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          session.status === "connected" ? "bg-green-500" : "bg-muted-foreground/30"
                        )} />
                        <span className="text-sm font-semibold">{session.hostLabel}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {session.username}@{session.hostname}
                        </span>
                      </div>
                      {onRefresh && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onRefresh(session.id)}
                        >
                          <RefreshCw size={12} />
                        </Button>
                      )}
                    </div>

                    {stats ? (
                      <>
                        {/* Stats bars */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* CPU */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Cpu size={10} /> CPU
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {cpuPercent !== null ? `${cpuPercent.toFixed(1)}%` : "N/A"}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  cpuPercent !== null && cpuPercent > 90 ? "bg-red-500" :
                                  cpuPercent !== null && cpuPercent > 70 ? "bg-yellow-500" :
                                  "bg-blue-500"
                                )}
                                style={{ width: `${cpuPercent ?? 0}%` }}
                              />
                            </div>
                            {stats.cpuCores && (
                              <p className="text-[10px] text-muted-foreground">{stats.cpuCores} cores</p>
                            )}
                          </div>

                          {/* Memory */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MemoryStick size={10} /> Memory
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {memPercent !== null ? `${memPercent}%` : "N/A"}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  memPercent !== null && memPercent > 90 ? "bg-red-500" :
                                  memPercent !== null && memPercent > 70 ? "bg-yellow-500" :
                                  "bg-green-500"
                                )}
                                style={{ width: `${memPercent ?? 0}%` }}
                              />
                            </div>
                            {stats.memTotal && stats.memUsed !== null && (
                              <p className="text-[10px] text-muted-foreground">
                                {(stats.memUsed / 1024).toFixed(1)} / {(stats.memTotal / 1024).toFixed(1)} GB
                              </p>
                            )}
                          </div>

                          {/* Disk */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <HardDrive size={10} /> Disk
                              </span>
                              <span className="text-xs font-mono font-medium">
                                {diskPercent !== null ? `${diskPercent}%` : "N/A"}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  diskPercent !== null && diskPercent > 90 ? "bg-red-500" :
                                  diskPercent !== null && diskPercent > 70 ? "bg-yellow-500" :
                                  "bg-purple-500"
                                )}
                                style={{ width: `${diskPercent ?? 0}%` }}
                              />
                            </div>
                            {stats.diskUsed !== null && stats.diskTotal !== null && (
                              <p className="text-[10px] text-muted-foreground">
                                {stats.diskUsed.toFixed(0)} / {stats.diskTotal.toFixed(0)} GB
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Network */}
                        <div className="flex items-center gap-4 pt-1 border-t border-border/40">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Network size={10} />
                            Network:
                          </span>
                          <span className="text-[11px] text-green-500 font-mono">
                            ↓ {formatSpeed(stats.netRxSpeed)}
                          </span>
                          <span className="text-[11px] text-blue-500 font-mono">
                            ↑ {formatSpeed(stats.netTxSpeed)}
                          </span>
                          {stats.lastUpdated && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        {/* Top processes */}
                        {stats.topProcesses.length > 0 && (
                          <div className="pt-1 border-t border-border/40">
                            <p className="text-[11px] text-muted-foreground mb-1">Top Processes:</p>
                            <div className="space-y-0.5">
                              {stats.topProcesses.slice(0, 3).map((proc, idx) => (
                                <div key={`${proc.pid}-${idx}`} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                                  <span className="w-12 text-right">PID {proc.pid}</span>
                                  <span className="w-12 text-right">{proc.memPercent.toFixed(1)}%</span>
                                  <span className="truncate">{proc.command}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Activity size={24} className="mx-auto mb-1 opacity-30" />
                        <p className="text-xs">No stats available (may not be a Linux/macOS host)</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export const HostDashboard = memo(HostDashboardInner);
HostDashboard.displayName = "HostDashboard";
