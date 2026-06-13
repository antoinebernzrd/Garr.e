import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FriendWithUpdate } from "@/lib/types";
import { findCityPreset } from "@/lib/cities";
import type { UserGroup } from "@/lib/groups";
import { supabase } from "@/integrations/supabase/client";

type Pin = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  color: string;
  groups: UserGroup[];
  latestText: string | null;
  latestAt: string | null;
};

// World scale (Three.js units)
const MAP_W = 4;
const MAP_H = 2;
const RADIUS = 1;

function flatPos(lat: number, lng: number) {
  return new THREE.Vector3((lng / 360) * MAP_W, -(lat / 180) * MAP_H, 0);
}
function spherePos(lat: number, lng: number, r = RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

function buildPins(friends: FriendWithUpdate[]): Pin[] {
  const list: Pin[] = [];
  for (const f of friends) {
    const cityName = f.latestUpdate?.city ?? f.profile.city;
    let lat = f.latestUpdate?.lat ?? null;
    let lng = f.latestUpdate?.lng ?? null;
    if ((lat == null || lng == null) && cityName) {
      const p = findCityPreset(cityName);
      if (p) {
        lat = p.lat;
        lng = p.lng;
      }
    }
    if (lat == null || lng == null) continue;
    list.push({
      id: f.profile.id,
      name: f.profile.name,
      city: cityName ?? "",
      lat,
      lng,
      color: f.groups[0]?.color || f.profile.avatar_color || "#9bbf6a",
      groups: f.groups,
      latestText: f.latestUpdate?.text ?? null,
      latestAt: f.latestUpdate?.created_at ?? null,
    });
  }
  return list;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const VERT = `
attribute vec3 aPosFlat;
attribute vec3 aPosSphere;
uniform float uMorph;
void main() {
  vec3 p = mix(aPosFlat, aPosSphere, uMorph);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
void main() { gl_FragColor = vec4(uColor, uOpacity); }`;

function buildContourGeometry(world: FeatureCollection): THREE.BufferGeometry {
  const flatArr: number[] = [];
  const sphArr: number[] = [];
  const push = (lat: number, lng: number) => {
    const f = flatPos(lat, lng);
    const s = spherePos(lat, lng);
    flatArr.push(f.x, f.y, f.z);
    sphArr.push(s.x, s.y, s.z);
  };
  const pushSeg = (a: number[], b: number[]) => {
    const dLng = b[0] - a[0];
    const dLat = b[1] - a[1];
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dLng), Math.abs(dLat)) / 4));
    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;
      push(a[1] + dLat * t1, a[0] + dLng * t1);
      push(a[1] + dLat * t2, a[0] + dLng * t2);
    }
  };
  for (const f of world.features) {
    const g = f.geometry as { type: string; coordinates: unknown } | null;
    if (!g) continue;
    const polys =
      g.type === "Polygon"
        ? [g.coordinates as number[][][]]
        : g.type === "MultiPolygon"
          ? (g.coordinates as number[][][][])
          : [];
    for (const poly of polys) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          if (Math.abs(ring[i + 1][0] - ring[i][0]) > 180) continue;
          pushSeg(ring[i], ring[i + 1]);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  const flat32 = new Float32Array(flatArr);
  geo.setAttribute("aPosFlat", new THREE.BufferAttribute(flat32, 3));
  geo.setAttribute("aPosSphere", new THREE.BufferAttribute(new Float32Array(sphArr), 3));
  geo.setAttribute("position", new THREE.BufferAttribute(flat32, 3));
  return geo;
}

export function MapView({
  friends,
  groups,
  onOpen,
  activeGroupIds,
  onToggleGroup,
  meId,
  meName: _meName,
  meColor: _meColor,
  meCity,
}: {
  friends: FriendWithUpdate[];
  groups: UserGroup[];
  onOpen: (id: string) => void;
  activeGroupIds: Set<string>;
  onToggleGroup: (id: string) => void;
  meId: string;
  meName: string;
  meColor: string;
  meCity: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [waving, setWaving] = useState(false);
  const [isGlobe] = useState(true);

  const { data: world } = useQuery({
    queryKey: ["world-atlas-110m"],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
      );
      const topo = await res.json();
      return feature(topo, topo.objects.countries) as unknown as FeatureCollection;
    },
  });

  const pins = useMemo(() => buildPins(friends), [friends]);
  const pinsRef = useRef<Pin[]>(pins);
  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  const activeRef = useRef(activeGroupIds);
  useEffect(() => {
    activeRef.current = activeGroupIds;
  }, [activeGroupIds]);

  const isActive = (p: Pin) => {
    const a = activeRef.current;
    return a.size === 0 || p.groups.some((g) => a.has(g.id));
  };

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldGroupRef = useRef<THREE.Group | null>(null);
  const lineMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const pinOverlaysRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // morph: 0 flat, 1 globe — locked to globe
  const morphRef = useRef(1);
  const targetMorphRef = useRef(1);

  // flat camera state
  const flatPanRef = useRef({ x: 0, y: 0 });
  const flatZoomRef = useRef(1.6);
  const FLAT_NEAR = 0.55;
  const FLAT_FAR = 2.6;
  const GLOBE_DIST = 2.8;
  const globeZoomRef = useRef(1);

  // globe rotation
  const worldRotRef = useRef({ yaw: 0, pitch: -0.2 });
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Three.js
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f0f0f");
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
    cam.position.set(0, 0, FLAT_FAR);
    cameraRef.current = cam;

    const grp = new THREE.Group();
    scene.add(grp);
    worldGroupRef.current = grp;

    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    });
    ro.observe(wrap);

    const updateOverlays = () => {
      const camera = cameraRef.current;
      const wrapEl = wrapRef.current;
      if (!camera || !wrapEl) return;
      const w = wrapEl.clientWidth;
      const h = wrapEl.clientHeight;
      const m = morphRef.current;
      const grpQuat = worldGroupRef.current?.quaternion ?? new THREE.Quaternion();
      const tmp = new THREE.Vector3();
      const proj = new THREE.Vector3();
      pinOverlaysRef.current.forEach((el, id) => {
        const pin = pinsRef.current.find((p) => p.id === id);
        if (!pin) return;
        const f = flatPos(pin.lat, pin.lng);
        const s = spherePos(pin.lat, pin.lng);
        tmp.copy(f).lerp(s, m).applyQuaternion(grpQuat);
        let visible = true;
        if (m > 0.55 && tmp.z < -0.02) visible = false;
        proj.copy(tmp).project(camera);
        const px = (proj.x * 0.5 + 0.5) * w;
        const py = (-proj.y * 0.5 + 0.5) * h;
        const a = activeRef.current;
        const active = a.size === 0 || pin.groups.some((g) => a.has(g.id));
        const op = active ? 1 : 0.2;
        el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
        el.style.opacity = visible ? String(op) : "0";
        el.style.pointerEvents = visible && active ? "auto" : "none";
      });
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const a = 1 - Math.exp(-dt / 220);
      morphRef.current += (targetMorphRef.current - morphRef.current) * a;
      if (lineMatRef.current) lineMatRef.current.uniforms.uMorph.value = morphRef.current;

      // slow auto-rotate when in globe and idle
      if (morphRef.current > 0.5 && !draggingRef.current) {
        worldRotRef.current.yaw += dt * 0.00006;
      }
      if (worldGroupRef.current) {
        worldGroupRef.current.rotation.y = worldRotRef.current.yaw * morphRef.current;
        worldGroupRef.current.rotation.x = worldRotRef.current.pitch * morphRef.current;
      }

      const m = morphRef.current;
      cam.position.x = flatPanRef.current.x * (1 - m);
      cam.position.y = flatPanRef.current.y * (1 - m);
      cam.position.z = flatZoomRef.current * (1 - m) + GLOBE_DIST * globeZoomRef.current * m;
      cam.lookAt(cam.position.x, cam.position.y, 0);

      renderer.render(scene, cam);
      updateOverlays();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
    };
  }, []);

  // Build line mesh when world loads
  useEffect(() => {
    if (!world || !worldGroupRef.current) return;
    const geo = buildContourGeometry(world);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uMorph: { value: morphRef.current },
        uColor: { value: new THREE.Color("#7da06a") },
        uOpacity: { value: 0.95 },
      },
    });
    lineMatRef.current = mat;
    const lines = new THREE.LineSegments(geo, mat);
    const grp = worldGroupRef.current;
    grp.add(lines);
    return () => {
      grp.remove(lines);
      geo.dispose();
      mat.dispose();
    };
  }, [world]);

  // Initial pan to user's continent
  useEffect(() => {
    const home = findCityPreset(meCity ?? "Paris");
    if (home) {
      const p = flatPos(home.lat, home.lng);
      flatPanRef.current = { x: p.x, y: p.y };
    } else {
      flatPanRef.current = { x: 0, y: 0 };
    }
    flatZoomRef.current = 1.8;
  }, [meCity]);

  function enterGlobeView() {
    setIsGlobe(true);
    targetMorphRef.current = 1;
    flatZoomRef.current = FLAT_FAR;
    globeZoomRef.current = Math.max(0.9, globeZoomRef.current);
  }

  function enterFlatView() {
    setIsGlobe(false);
    targetMorphRef.current = 0;
    globeZoomRef.current = 0.9;
    flatZoomRef.current = Math.min(flatZoomRef.current, FLAT_FAR - 0.1);
  }

  function handleWheel(e: React.WheelEvent) {
    const dy = e.deltaY;
    globeZoomRef.current = Math.max(0.45, Math.min(2.5, globeZoomRef.current + dy * 0.0018));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-no-pan]")) return;
    draggingRef.current = true;
    dragMovedRef.current = false;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || !lastPointerRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMovedRef.current = true;
    if (isGlobe) {
      worldRotRef.current.yaw += dx * 0.005;
      worldRotRef.current.pitch = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, worldRotRef.current.pitch + dy * 0.005),
      );
    } else {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const camZ = flatZoomRef.current;
      const fov = (50 * Math.PI) / 180;
      const visH = 2 * Math.tan(fov / 2) * camZ;
      const visW = visH * (w / h);
      flatPanRef.current.x -= (dx / w) * visW;
      flatPanRef.current.y += (dy / h) * visH;
    }
  }
  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  function toggleView() {
    if (isGlobe) {
      enterFlatView();
    } else {
      enterGlobeView();
    }
  }

  async function sendWave(toId: string, toName: string) {
    setWaving(true);
    const { error } = await supabase
      .from("waves")
      .insert({ from_user_id: meId, to_user_id: toId });
    setWaving(false);
    if (error) toast.error("Couldn't send wave");
    else toast.success(`Wave sent to ${toName} 👋`);
  }

  return (
    <div
      ref={wrapRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative h-[calc(100vh-180px)] w-full select-none overflow-hidden rounded-3xl border border-white/5 font-sans"
      style={{ cursor: isGlobe ? "grab" : "crosshair", background: "#0f0f0f" }}
    >
      <style>{`
        @keyframes pin-pulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.6); opacity: 0.15; } }
        @keyframes pin-fadein { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* pin overlays */}
      {pins.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => {
            if (el) pinOverlaysRef.current.set(p.id, el);
            else pinOverlaysRef.current.delete(p.id);
          }}
          className="absolute left-0 top-0 z-10"
          style={{
            opacity: 0,
            transition: "opacity 220ms ease",
            animation: `pin-fadein 700ms ease-out ${Math.min(i * 50, 1200)}ms both`,
          }}
          onMouseEnter={() => setHoverId(p.id)}
          onMouseLeave={() =>
            setHoverId((curr) => (curr === p.id ? null : curr))
          }
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (dragMovedRef.current) return;
              onOpen(p.id);
            }}
            className="relative flex h-4 w-4 items-center justify-center"
            title={p.name}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: p.color,
                animation: "pin-pulse 2.6s ease-in-out infinite",
                boxShadow: `0 0 14px ${p.color}`,
              }}
            />
            <span
              className="relative h-1.5 w-1.5 rounded-full"
              style={{
                background: p.color,
                boxShadow: `0 0 6px ${p.color}, 0 0 2px #fff`,
              }}
            />
          </button>
          {hoverId === p.id && (
            <div
              className="absolute left-1/2 top-0 z-20 w-56 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-white/10 bg-[#1a1a1a]/95 p-3 shadow-2xl backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-semibold text-white">{p.name}</div>
              <div className="text-[11px] text-white/50">
                {p.city || "somewhere"} · {timeAgo(p.latestAt)}
              </div>
              {p.latestText && (
                <p className="mt-1.5 line-clamp-2 text-xs text-white/70">
                  &ldquo;{p.latestText}&rdquo;
                </p>
              )}
              <div className="mt-2 flex gap-1.5">
                <button
                  disabled={waving}
                  onClick={() => sendWave(p.id, p.name)}
                  className="flex-1 rounded bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15 disabled:opacity-50"
                >
                  Wave 👋
                </button>
                <button
                  onClick={() => onOpen(p.id)}
                  className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:bg-white/5"
                >
                  Open
                </button>
              </div>
              <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-[#1a1a1a]" />
            </div>
          )}
        </div>
      ))}

      {/* HUD */}
      <div className="pointer-events-none absolute left-4 top-3 z-40 text-[10px] uppercase tracking-[0.25em] text-white/60">
        <div className="text-white/80">◆ Topo · Globe</div>
        <div className="text-white/35">
          {pins.length} {pins.length === 1 ? "friend" : "friends"} · scroll to zoom
        </div>
      </div>

      {/* group filter */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-40 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-[90%] flex-wrap items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2 py-1.5 backdrop-blur">
          {groups.length === 0 && (
            <span className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
              no categories
            </span>
          )}
          {groups.map((g) => {
            const on = activeGroupIds.has(g.id);
            return (
              <button
                key={g.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleGroup(g.id);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition ${
                  on ? "text-white" : "text-white/40"
                }`}
                style={{
                  background: on ? `${g.color}25` : "transparent",
                  border: `1px solid ${on ? g.color + "66" : "transparent"}`,
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: g.color }}
                />
                {g.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
