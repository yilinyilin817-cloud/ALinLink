import { Network, X, Play, Square, RefreshCw } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Host, PortForwardingRule } from "../domain/models";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface TunnelVisualizationProps {
  isOpen: boolean;
  onClose: () => void;
  rules: PortForwardingRule[];
  hosts: Host[];
  onStartTunnel?: (ruleId: string) => void;
  onStopTunnel?: (ruleId: string) => void;
}

interface TunnelNode {
  id: string;
  label: string;
  type: "local" | "ssh" | "remote";
  x: number;
  y: number;
}

interface TunnelEdge {
  from: string;
  to: string;
  ruleId: string;
  status: PortForwardingRule["status"];
  type: PortForwardingType;
  label: string;
}

type PortForwardingType = "local" | "remote" | "dynamic";

const TunnelVisualizationInner: React.FC<TunnelVisualizationProps> = ({
  isOpen,
  onClose,
  rules,
  hosts,
  onStartTunnel,
  onStopTunnel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRuleId, setHoveredRuleId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  // Build graph data from rules
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, TunnelNode>();
    const edgeList: TunnelEdge[] = [];

    // Layout constants
    const leftX = 120;
    const centerX = canvasSize.width / 2;
    const rightX = canvasSize.width - 120;
    const startY = 80;
    const rowHeight = 80;

    // Add local machine node
    nodeMap.set("local", {
      id: "local",
      label: "Local Machine",
      type: "local",
      x: leftX,
      y: startY,
    });

    rules.forEach((rule, idx) => {
      const y = startY + idx * rowHeight;

      // SSH relay node
      const sshNodeId = `ssh-${rule.id}`;
      const host = hosts.find((h) => h.id === rule.hostId);
      nodeMap.set(sshNodeId, {
        id: sshNodeId,
        label: host?.label || "SSH Host",
        type: "ssh",
        x: centerX,
        y: Math.min(y, canvasSize.height - 60),
      });

      // Remote endpoint node
      const remoteNodeId = `remote-${rule.id}`;
      const remoteLabel = rule.type === "dynamic"
        ? "SOCKS Proxy"
        : `${rule.remoteHost || "localhost"}:${rule.remotePort || "?"}`;
      nodeMap.set(remoteNodeId, {
        id: remoteNodeId,
        label: remoteLabel,
        type: "remote",
        x: rightX,
        y: Math.min(y, canvasSize.height - 60),
      });

      // Edge: local -> ssh
      const localLabel = `${rule.bindAddress}:${rule.localPort}`;
      edgeList.push({
        from: "local",
        to: sshNodeId,
        ruleId: rule.id,
        status: rule.status,
        type: rule.type,
        label: localLabel,
      });

      // Edge: ssh -> remote
      edgeList.push({
        from: sshNodeId,
        to: remoteNodeId,
        ruleId: rule.id,
        status: rule.status,
        type: rule.type,
        label: rule.type === "dynamic" ? "SOCKS5" : `${rule.remotePort}`,
      });
    });

    // Reposition local node to center vertically
    const allY = Array.from(nodeMap.values()).filter((n) => n.type !== "local").map((n) => n.y);
    if (allY.length > 0) {
      const avgY = allY.reduce((a, b) => a + b, 0) / allY.length;
      const localNode = nodeMap.get("local");
      if (localNode) localNode.y = avgY;
    }

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [rules, hosts, canvasSize]);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const width = Math.max(600, entry.contentRect.width);
        const height = Math.max(300, Math.min(600, rules.length * 80 + 160));
        setCanvasSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [rules.length]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw edges
    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const isHovered = hoveredRuleId === edge.ruleId;
      const isActive = edge.status === "active";
      const isError = edge.status === "error";

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);

      let color: string;
      let lineWidth: number;
      if (isError) {
        color = "rgba(239, 68, 68, 0.8)";
        lineWidth = isHovered ? 3 : 2;
      } else if (isActive) {
        color = "rgba(34, 197, 94, 0.8)";
        lineWidth = isHovered ? 3 : 2;
        // Dashed line for active tunnels
        ctx.setLineDash([]);
      } else {
        color = "rgba(148, 163, 184, 0.4)";
        lineWidth = isHovered ? 2.5 : 1.5;
        ctx.setLineDash([6, 4]);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge label
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2 - 8;
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillStyle = isActive ? "rgba(34, 197, 94, 0.9)" : "rgba(148, 163, 184, 0.7)";
      ctx.textAlign = "center";
      ctx.fillText(edge.label, midX, midY);

      // Animated dots for active tunnels
      if (isActive) {
        const time = Date.now() / 1000;
        for (let i = 0; i < 3; i++) {
          const t = ((time * 0.3 + i * 0.33) % 1);
          const dotX = fromNode.x + (toNode.x - fromNode.x) * t;
          const dotY = fromNode.y + (toNode.y - fromNode.y) * t;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34, 197, 94, ${0.8 - t * 0.5})`;
          ctx.fill();
        }
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const isHovered = edges.some((e) => e.ruleId === hoveredRuleId && (e.from === node.id || e.to === node.id));

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, isHovered ? 22 : 18, 0, Math.PI * 2);

      let bgColor: string;
      let borderColor: string;
      switch (node.type) {
        case "local":
          bgColor = "rgba(59, 130, 246, 0.15)";
          borderColor = "rgba(59, 130, 246, 0.8)";
          break;
        case "ssh":
          bgColor = "rgba(168, 85, 247, 0.15)";
          borderColor = "rgba(168, 85, 247, 0.8)";
          break;
        case "remote":
          bgColor = "rgba(34, 197, 94, 0.15)";
          borderColor = "rgba(34, 197, 94, 0.8)";
          break;
      }

      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node icon (simple text)
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = borderColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const icon = node.type === "local" ? "💻" : node.type === "ssh" ? "🔒" : "🌐";
      ctx.fillText(icon, node.x, node.y);

      // Node label
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
      ctx.textBaseline = "top";
      ctx.fillText(node.label, node.x, node.y + 24);
    });
  }, [nodes, edges, canvasSize, hoveredRuleId]);

  // Animation loop for active tunnels
  useEffect(() => {
    const hasActive = rules.some((r) => r.status === "active");
    if (!hasActive || !canvasRef.current) return;

    let animFrame: number;
    const animate = () => {
      // Trigger re-draw by updating hoveredRuleId state (cheap no-op)
      setHoveredRuleId((prev) => prev);
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [rules]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Network size={18} className="text-primary" />
            <span className="text-sm font-semibold">SSH Tunnel Visualization</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {rules.length} tunnel{rules.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="flex items-center gap-3 mr-2">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Local
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500" /> SSH
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Remote
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto p-4">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Network size={48} className="mb-3 opacity-30" />
              <p className="text-sm">No port forwarding rules configured</p>
              <p className="text-xs">Add rules in Vault to visualize tunnels here</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: canvasSize.height }}
            />
          )}
        </div>

        {/* Rules list */}
        {rules.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs border transition-colors cursor-pointer",
                    hoveredRuleId === rule.id ? "border-primary/50 bg-primary/5" : "border-border/60",
                    rule.status === "active" && "border-green-500/30 bg-green-500/5",
                    rule.status === "error" && "border-red-500/30 bg-red-500/5"
                  )}
                  onMouseEnter={() => setHoveredRuleId(rule.id)}
                  onMouseLeave={() => setHoveredRuleId(null)}
                >
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    rule.status === "active" ? "bg-green-500" :
                    rule.status === "error" ? "bg-red-500" :
                    rule.status === "connecting" ? "bg-yellow-500 animate-pulse" :
                    "bg-muted-foreground/30"
                  )} />
                  <span className="font-medium">{rule.label}</span>
                  <span className="text-muted-foreground">
                    {rule.type[0].toUpperCase()} :{rule.localPort}
                    {rule.remoteHost ? ` -> ${rule.remoteHost}:${rule.remotePort}` : ""}
                  </span>
                  <div className="flex gap-1 ml-1">
                    {rule.status !== "active" ? (
                      onStartTunnel && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => onStartTunnel(rule.id)}
                        >
                          <Play size={10} />
                        </Button>
                      )
                    ) : (
                      onStopTunnel && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => onStopTunnel(rule.id)}
                        >
                          <Square size={10} />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TunnelVisualization = memo(TunnelVisualizationInner);
TunnelVisualization.displayName = "TunnelVisualization";
