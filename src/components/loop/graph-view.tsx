import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { FriendWithUpdate } from "@/lib/types";
import type { UserGroup } from "@/lib/groups";
import { formatDistanceToNow } from "date-fns";

type NodeKind = "group" | "person";
interface GNode extends d3.SimulationNodeDatum {
  id: string;
  kind: NodeKind;
  label: string;
  color: string;
  radius: number;
  city?: string;
  lastUpdate?: string | null;
  lastUpdateAt?: string | null;
}
interface GLink extends d3.SimulationLinkDatum<GNode> {
  source: string | GNode;
  target: string | GNode;
}

const NODE_DEFAULT = "#7f8ea3";
const NODE_GROUP = "#a8b3c7";
const LINK_COLOR = "#4a5468";
const BG = "#1a1b1e";

export function GraphView({
  friends,
  groups,
  onOpen,
  activeGroupIds,
}: {
  friends: FriendWithUpdate[];
  groups: UserGroup[];
  onOpen: (id: string) => void;
  activeGroupIds: Set<string>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; node: GNode } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;
    const wrapper = wrapperRef.current;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    const allOff = activeGroupIds.size === 0;
    const visiblePeople = friends.filter(
      (f) => allOff || f.groups.some((g) => activeGroupIds.has(g.id))
    );

    const nodes: GNode[] = [];
    const links: GLink[] = [];

    for (const g of groups) {
      if (!allOff && !activeGroupIds.has(g.id)) continue;
      nodes.push({
        id: `group:${g.id}`,
        kind: "group",
        label: g.name,
        color: g.color,
        radius: 7,
      });
    }

    for (const f of visiblePeople) {
      nodes.push({
        id: `person:${f.profile.id}`,
        kind: "person",
        label: f.profile.name,
        color: f.groups[0]?.color ?? NODE_DEFAULT,
        radius: 4 + Math.min(f.groups.length, 4) * 0.6,
        city: f.latestUpdate?.city ?? f.profile.city ?? undefined,
        lastUpdate: f.latestUpdate?.text ?? null,
        lastUpdateAt: f.latestUpdate?.created_at ?? null,
      });
      for (const g of f.groups) {
        if (!allOff && !activeGroupIds.has(g.id)) continue;
        links.push({ source: `group:${g.id}`, target: `person:${f.profile.id}` });
      }
    }

    const adj = new Map<string, Set<string>>();
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (!adj.has(s)) adj.set(s, new Set());
      if (!adj.has(t)) adj.set(t, new Set());
      adj.get(s)!.add(t);
      adj.get(t)!.add(s);
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 6])
      .on("zoom", (e) => {
        root.attr("transform", e.transform);
        labels.attr("opacity", e.transform.k > 1.4 ? 1 : 0);
      });
    svg.call(zoom as any);

    const link = root
      .append("g")
      .attr("stroke", LINK_COLOR)
      .attr("stroke-opacity", 0.5)
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke-width", 0.6);

    const node = root
      .append("g")
      .selectAll<SVGCircleElement, GNode>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => (d.kind === "group" ? NODE_GROUP : NODE_DEFAULT))
      .attr("stroke", "none")
      .style("cursor", "pointer");

    const labels = root
      .append("g")
      .selectAll<SVGTextElement, GNode>("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("fill", "#c8cdd6")
      .attr("font-size", (d) => (d.kind === "group" ? 10 : 8))
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("dy", (d) => d.radius + 10)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    node
      .on("mouseenter", function (e, d) {
        const neighbors = adj.get(d.id) ?? new Set();
        node
          .transition().duration(150)
          .attr("opacity", (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.15))
          .attr("fill", (n) => {
            if (n.id === d.id) return n.color;
            if (neighbors.has(n.id)) return n.color;
            return n.kind === "group" ? NODE_GROUP : NODE_DEFAULT;
          });
        link
          .transition().duration(150)
          .attr("stroke-opacity", (l) => {
            const s = (l.source as GNode).id;
            const t = (l.target as GNode).id;
            return s === d.id || t === d.id ? 0.9 : 0.08;
          })
          .attr("stroke", (l) => {
            const s = (l.source as GNode).id;
            const t = (l.target as GNode).id;
            return s === d.id || t === d.id ? d.color : LINK_COLOR;
          });
        labels
          .transition().duration(150)
          .attr("opacity", (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0))
          .attr("fill", (n) => (n.id === d.id ? "#fff" : "#c8cdd6"));

        if (d.kind === "person") {
          const rect = wrapper.getBoundingClientRect();
          setTip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, node: d });
        }
      })
      .on("mousemove", (e, d) => {
        if (d.kind !== "person") return;
        const rect = wrapper.getBoundingClientRect();
        setTip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, node: d });
      })
      .on("mouseleave", () => {
        const k = d3.zoomTransform(svgRef.current!).k;
        node.transition().duration(200).attr("opacity", 1)
          .attr("fill", (n) => (n.kind === "group" ? NODE_GROUP : NODE_DEFAULT));
        link.transition().duration(200)
          .attr("stroke-opacity", 0.5).attr("stroke", LINK_COLOR);
        labels.transition().duration(200).attr("opacity", k > 1.4 ? 1 : 0).attr("fill", "#c8cdd6");
        setTip(null);
      })
      .on("click", (_e, d) => {
        if (d.kind === "person") onOpen(d.id.replace("person:", ""));
      });

    const sim = d3
      .forceSimulation<GNode>(nodes)
      .force(
        "link",
        d3.forceLink<GNode, GLink>(links).id((d) => d.id).distance(45).strength(0.5)
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d) => ((d as GNode).kind === "group" ? -180 : -60))
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide<GNode>().radius((d) => d.radius + 3));

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GNode).x ?? 0)
        .attr("y1", (d) => (d.source as GNode).y ?? 0)
        .attr("x2", (d) => (d.target as GNode).x ?? 0)
        .attr("y2", (d) => (d.target as GNode).y ?? 0);
      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      labels.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    const drag = d3
      .drag<SVGCircleElement, GNode>()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    node.call(drag as any);

    return () => { sim.stop(); };
  }, [friends, groups, activeGroupIds, onOpen]);

  return (
    <div
      ref={wrapperRef}
      className="relative h-[calc(100vh-180px)] overflow-hidden rounded-3xl border border-white/5 font-sans"
      style={{ background: BG }}
    >
      <svg ref={svgRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 text-[10px] uppercase tracking-[0.2em] text-white/30">
        drag · scroll to zoom · hover to focus
      </div>

      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-white/10 bg-[#26272b]/95 p-2.5 text-xs text-white/90 shadow-xl backdrop-blur"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="font-medium text-white">{tip.node.label}</p>
          {tip.node.city && <p className="text-white/50">{tip.node.city}</p>}
          {tip.node.lastUpdate ? (
            <p className="mt-1 line-clamp-2 text-white/70">{tip.node.lastUpdate}</p>
          ) : (
            <p className="mt-1 italic text-white/30">No updates yet</p>
          )}
          {tip.node.lastUpdateAt && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">
              {formatDistanceToNow(new Date(tip.node.lastUpdateAt), { addSuffix: true })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
