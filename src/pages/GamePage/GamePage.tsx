import React, { useEffect, useMemo, useRef, useState } from 'react';
import './GamePage.css';

type Vec3 = [number, number, number];

type WorldObject = {
  kind: 'cube' | 'beacon' | 'enemy';
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  lit?: boolean;
  alive?: boolean;
};

const objectsSeed: WorldObject[] = [
  { kind: 'cube', x: -8, y: 1, z: -6, w: 2.4, h: 2, d: 2.6, color: '#293331' },
  { kind: 'cube', x: -3, y: 1.4, z: -9, w: 2.8, h: 2.8, d: 2.3, color: '#2f2d2a' },
  { kind: 'cube', x: 5, y: 1.2, z: -7, w: 3, h: 2.4, d: 2.8, color: '#2b3437' },
  { kind: 'cube', x: 9, y: 1.6, z: 0, w: 2.4, h: 3.2, d: 2.4, color: '#35302c' },
  { kind: 'cube', x: -7, y: 1.1, z: 4, w: 3.2, h: 2.2, d: 2.6, color: '#262f36' },
  { kind: 'cube', x: 1, y: 0.75, z: 8, w: 7.2, h: 1.5, d: 1.8, color: '#3d352d' },
  { kind: 'beacon', x: -10, y: 1.4, z: -1, w: 0.55, h: 2.8, d: 0.55, color: '#71664b', lit: false },
  { kind: 'beacon', x: 0, y: 1.4, z: -11, w: 0.55, h: 2.8, d: 0.55, color: '#71664b', lit: false },
  { kind: 'beacon', x: 10, y: 1.4, z: 6, w: 0.55, h: 2.8, d: 0.55, color: '#71664b', lit: false },
  { kind: 'enemy', x: -5.5, y: 1, z: -1.5, w: 1.2, h: 2, d: 1.2, color: '#130e1b', alive: true },
  { kind: 'enemy', x: 5.5, y: 1, z: -3.2, w: 1.2, h: 2, d: 1.2, color: '#130e1b', alive: true },
  { kind: 'enemy', x: 3.2, y: 1, z: 5.5, w: 1.2, h: 2, d: 1.2, color: '#130e1b', alive: true },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const dist2 = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

const GamePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({ x: 0, z: 1.5, light: 100, pulse: 0, angle: 0 });
  const world = useRef<WorldObject[]>(objectsSeed.map((item) => ({ ...item })));
  const [light, setLight] = useState(100);
  const [beaconsLit, setBeaconsLit] = useState(0);
  const [shadowsLeft, setShadowsLeft] = useState(3);
  const [callOpen, setCallOpen] = useState(true);

  const objectiveText = useMemo(() => {
    if (beaconsLit === 3 && shadowsLeft === 0) return 'The village spell is broken. The Valley of Fear has opened.';
    if (beaconsLit === 3) return 'The beacons are awake. Drive back the remaining shadows.';
    return 'Light the three watch beacons and protect the Ember from Fear.';
  }, [beaconsLit, shadowsLeft]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let raf = 0;
    let last = performance.now();

    const onKeyDown = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
      if (event.key === ' ') {
        event.preventDefault();
        if (player.current.light > 14) {
          player.current.pulse = 1;
          player.current.light = Math.max(0, player.current.light - 15);
        }
      }
      if (event.key.toLowerCase() === 'e') {
        world.current.forEach((item) => {
          if (item.kind === 'beacon' && !item.lit && dist2(player.current.x, player.current.z, item.x, item.z) < 2.2) {
            item.lit = true;
          }
        });
      }
      if (event.key === 'Escape') setCallOpen((open) => !open);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const project = (point: Vec3, cameraX: number, cameraZ: number, cameraY: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dx = point[0] - cameraX;
      const dy = point[1] - cameraY;
      const dz = point[2] - cameraZ;
      const scale = Math.min(width / 34, height / 22);
      const x = width / 2 + (dx - dz) * scale * 0.82;
      const y = height * 0.55 + (dx + dz) * scale * 0.36 - dy * scale * 1.35;
      const z = dx + dz + dy * 0.5;
      return { x, y, z, scale };
    };

    const drawPoly = (points: Vec3[], color: string, cameraX: number, cameraZ: number, cameraY: number) => {
      const mapped = points.map((p) => project(p, cameraX, cameraZ, cameraY));
      context.beginPath();
      mapped.forEach((p, index) => {
        if (index === 0) context.moveTo(p.x, p.y);
        else context.lineTo(p.x, p.y);
      });
      context.closePath();
      context.fillStyle = color;
      context.fill();
      return mapped.reduce((total, p) => total + p.z, 0) / mapped.length;
    };

    const shade = (hex: string, amount: number) => {
      const n = parseInt(hex.slice(1), 16);
      const r = clamp(((n >> 16) & 255) + amount, 0, 255);
      const g = clamp(((n >> 8) & 255) + amount, 0, 255);
      const b = clamp((n & 255) + amount, 0, 255);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const drawCube = (item: WorldObject, cameraX: number, cameraZ: number, cameraY: number, time: number) => {
      const x0 = item.x - item.w / 2;
      const x1 = item.x + item.w / 2;
      const y0 = item.y - item.h / 2;
      const y1 = item.y + item.h / 2;
      const z0 = item.z - item.d / 2;
      const z1 = item.z + item.d / 2;
      const color = item.kind === 'beacon' && item.lit ? '#eecf65' : item.color;
      const faces = [
        { p: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]] as Vec3[], c: shade(color, -18) },
        { p: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] as Vec3[], c: shade(color, -34) },
        { p: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] as Vec3[], c: shade(color, 18) },
      ];
      faces
        .map((face) => ({ ...face, depth: face.p.reduce((sum, p) => sum + project(p, cameraX, cameraZ, cameraY).z, 0) / 4 }))
        .sort((a, b) => b.depth - a.depth)
        .forEach((face) => drawPoly(face.p, face.c, cameraX, cameraZ, cameraY));

      if (item.kind === 'beacon' && item.lit) {
        const top = project([item.x, item.y + item.h * 0.75, item.z], cameraX, cameraZ, cameraY);
        const glow = 22 + Math.sin(time * 0.006) * 6;
        const gradient = context.createRadialGradient(top.x, top.y, 2, top.x, top.y, glow * top.scale * 0.08);
        gradient.addColorStop(0, 'rgba(255, 239, 154, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 214, 89, 0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(top.x, top.y, Math.max(14, glow), 0, Math.PI * 2);
        context.fill();
      }
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = player.current;
      const speed = keys.current.shift ? 6.8 : 4.2;
      let dx = 0;
      let dz = 0;
      if (keys.current.w || keys.current.arrowup) dz -= 1;
      if (keys.current.s || keys.current.arrowdown) dz += 1;
      if (keys.current.a || keys.current.arrowleft) dx -= 1;
      if (keys.current.d || keys.current.arrowright) dx += 1;
      if (dx || dz) {
        const length = Math.hypot(dx, dz);
        p.x = clamp(p.x + (dx / length) * speed * dt, -13, 13);
        p.z = clamp(p.z + (dz / length) * speed * dt, -13, 13);
        p.angle += dt * 7;
        setCallOpen(false);
      }
      p.light = clamp(p.light + dt * 4, 0, 100);
      p.pulse = Math.max(0, p.pulse - dt * 1.9);

      world.current.forEach((item) => {
        if (item.kind !== 'enemy' || !item.alive) return;
        const distance = dist2(p.x, p.z, item.x, item.z);
        if (p.pulse > 0.15 && distance < 3.7) item.alive = false;
        if (distance < 7 && distance > 1.2) {
          item.x += ((p.x - item.x) / distance) * dt * 0.75;
          item.z += ((p.z - item.z) / distance) * dt * 0.75;
        }
        if (distance < 1.4) p.light = Math.max(0, p.light - dt * 9);
      });

      const nextBeacons = world.current.filter((item) => item.kind === 'beacon' && item.lit).length;
      const nextShadows = world.current.filter((item) => item.kind === 'enemy' && item.alive).length;
      setBeaconsLit(nextBeacons);
      setShadowsLeft(nextShadows);
      setLight(Math.round(p.light));

      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#090b14');
      sky.addColorStop(0.55, '#16211d');
      sky.addColorStop(1, '#070807');
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      const cameraX = p.x - 0.5;
      const cameraZ = p.z + 1.5;
      const cameraY = 1.6;
      drawPoly([[-20, 0, -20], [20, 0, -20], [20, 0, 20], [-20, 0, 20]], '#17221b', cameraX, cameraZ, cameraY);

      for (let i = -18; i <= 18; i += 3) {
        drawPoly([[i, 0.01, -20], [i + 0.08, 0.01, -20], [i + 0.08, 0.01, 20], [i, 0.01, 20]], 'rgba(219, 199, 126, 0.05)', cameraX, cameraZ, cameraY);
        drawPoly([[-20, 0.01, i], [20, 0.01, i], [20, 0.01, i + 0.08], [-20, 0.01, i + 0.08]], 'rgba(219, 199, 126, 0.05)', cameraX, cameraZ, cameraY);
      }

      world.current
        .filter((item) => item.kind !== 'enemy' || item.alive)
        .sort((a, b) => project([b.x, b.y, b.z], cameraX, cameraZ, cameraY).z - project([a.x, a.y, a.z], cameraX, cameraZ, cameraY).z)
        .forEach((item) => {
          if (item.kind === 'enemy') {
            item.y = 1 + Math.sin(now * 0.004 + item.x) * 0.18;
            drawCube(item, cameraX, cameraZ, cameraY, now);
            const head = project([item.x, item.y + 1.3, item.z], cameraX, cameraZ, cameraY);
            context.fillStyle = 'rgba(129, 89, 169, 0.42)';
            context.beginPath();
            context.arc(head.x, head.y, 26, 0, Math.PI * 2);
            context.fill();
          } else {
            drawCube(item, cameraX, cameraZ, cameraY, now);
          }
        });

      const footY = 0.65 + Math.sin(p.angle) * 0.05;
      drawCube({ kind: 'cube', x: p.x, y: footY, z: p.z, w: 0.8, h: 1.3, d: 0.8, color: '#d9c16a' }, cameraX, cameraZ, cameraY, now);
      const ember = project([p.x, 1.8, p.z], cameraX, cameraZ, cameraY);
      const radius = 34 + p.light * 0.32 + p.pulse * 80;
      const playerGlow = context.createRadialGradient(ember.x, ember.y, 4, ember.x, ember.y, radius);
      playerGlow.addColorStop(0, 'rgba(255, 246, 179, 0.98)');
      playerGlow.addColorStop(0.35, 'rgba(255, 218, 86, 0.32)');
      playerGlow.addColorStop(1, 'rgba(255, 218, 86, 0)');
      context.fillStyle = playerGlow;
      context.beginPath();
      context.arc(ember.x, ember.y, radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff8cb';
      context.beginPath();
      context.arc(ember.x, ember.y, 5, 0, Math.PI * 2);
      context.fill();

      const darkness = context.createRadialGradient(width / 2, height / 2, Math.max(160, p.light * 4), width / 2, height / 2, Math.max(width, height) * 0.75);
      darkness.addColorStop(0, 'rgba(0,0,0,0)');
      darkness.addColorStop(1, 'rgba(0,0,0,0.62)');
      context.fillStyle = darkness;
      context.fillRect(0, 0, width, height);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <main className="game-page">
      <canvas ref={canvasRef} className="game-canvas" aria-label="The Call: Warrior of Light game canvas" />
      <section className="game-hud" aria-live="polite">
        <div className="game-topbar">
          <div className="game-title">
            <p className="game-kicker">The Call</p>
            <h1>Warrior of Light</h1>
          </div>
          <aside className="game-objectives">
            <h2>Morrowgate Village</h2>
            <p>{objectiveText}</p>
            <p className={beaconsLit === 3 ? 'done' : ''}>Beacons awakened: {beaconsLit}/3</p>
            <p className={shadowsLeft === 0 ? 'done' : ''}>Shadows remaining: {shadowsLeft}</p>
          </aside>
        </div>
        <div className="game-meter">
          <div className="game-meter-label">
            <span>Ember</span>
            <span>{light}%</span>
          </div>
          <div className="game-meter-track">
            <div className="game-meter-fill" style={{ width: `${light}%` }} />
          </div>
        </div>
        <div className="game-bottom">
          {callOpen && (
            <div className="game-call">
              <p>In the days when courage slept and songs were forgotten, the Light began searching for a bearer.</p>
              <span>Move to answer the call. Stand near a beacon and press E. Use Space to release the Ember.</span>
            </div>
          )}
          <div className="game-controls">
            <span><strong>WASD</strong> move</span>
            <span><strong>Shift</strong> run</span>
            <span><strong>E</strong> light beacon</span>
            <span><strong>Space</strong> light pulse</span>
            <span><strong>Esc</strong> call</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default GamePage;
