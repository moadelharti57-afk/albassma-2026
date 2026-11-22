import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Float } from '@react-three/drei';
import * as THREE from 'three';
import { heroState } from './heroState';
import { EVENT } from '@/config/event';

/* ------------------------------------------------------------------ */
/*  Textures drawn on a 2D canvas: no font or image downloads needed   */
/* ------------------------------------------------------------------ */

const TICKET_W = 3.4;
const TICKET_H = 1.6;

function makeTicketFaceTexture(side: 'front' | 'back') {
  const W = 1700;
  const H = 800;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const ink = 'rgba(0, 0, 0, 0.9)'; // black
  const inkSoft = 'rgba(38, 70, 83, 0.85)'; // #264653

  // Inner frame
  ctx.strokeStyle = inkSoft;
  ctx.lineWidth = 6;
  ctx.setLineDash([]);
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 80, W - 160, H - 160);

  // Perforation line separating the stub
  ctx.setLineDash([14, 14]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(1240, 90);
  ctx.lineTo(1240, H - 90);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';

  if (side === 'front') {
    ctx.font = '600 38px "JetBrains Mono", monospace';
    ctx.fillText(`${EVENT.club.toUpperCase()} PRÉSENTE`, 140, 190);

    ctx.font = '210px Anton, Impact, sans-serif';
    ctx.fillText('ALBASSMA', 130, 420);
    ctx.font = '150px Anton, Impact, sans-serif';
    ctx.fillText(`FILM ${EVENT.year}`, 136, 590);

    ctx.font = '600 34px "JetBrains Mono", monospace';
    ctx.fillStyle = inkSoft;
    ctx.fillText('ADMIT ONE  ·  ENTRÉE UNIQUE  ·  BILLET NUMÉRIQUE', 140, 680);

    // Stub
    ctx.save();
    ctx.translate(1480, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = '120px Anton, Impact, sans-serif';
    ctx.fillText('ADMIT', 0, -10);
    ctx.fillText('ONE', 0, 110);
    ctx.restore();
  } else {
    ctx.font = '150px Anton, Impact, sans-serif';
    ctx.fillText('SCAN · ENTRÉE', 130, 330);
    ctx.font = '600 40px "JetBrains Mono", monospace';
    ctx.fillStyle = inkSoft;
    ctx.fillText('Présentez votre QR code à l’entrée.', 140, 440);
    ctx.fillText('Un billet = une personne = un passage.', 140, 510);

    // Faux QR block on the stub
    ctx.fillStyle = ink;
    const size = 300;
    const x0 = 1330;
    const y0 = (H - size) / 2;
    const cells = 15;
    const cell = size / cells;
    let seed = 7;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const finder =
          (x < 4 && y < 4) || (x > cells - 5 && y < 4) || (x < 4 && y > cells - 5);
        if (finder ? (x % 3 !== 1 || y % 3 !== 1) && !(x === 1 && y === 1) : rand() > 0.52) {
          ctx.fillRect(x0 + x * cell, y0 + y * cell, cell - 2, cell - 2);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeFilmStripTexture() {
  const W = 2048;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
  ctx.fillRect(0, 0, W, H);

  // Sprocket holes
  ctx.fillStyle = 'rgba(255, 220, 160, 0.0)';
  ctx.globalCompositeOperation = 'destination-out';
  for (let x = 12; x < W; x += 40) {
    ctx.fillRect(x, 14, 22, 26);
    ctx.fillRect(x, H - 40, 22, 26);
  }
  ctx.globalCompositeOperation = 'source-over';

  // Frames with a warm gradient, like lit celluloid
  const frames = 8;
  const fw = W / frames;
  for (let i = 0; i < frames; i++) {
    const g = ctx.createLinearGradient(i * fw, 60, i * fw + fw, H - 60);
    // Alternate the club palette: #86de76 → #32b577 → #264653
    const stops = [
      ['rgba(134, 222, 118, 0.6)', 'rgba(50, 181, 119, 0.4)'],
      ['rgba(50, 181, 119, 0.6)', 'rgba(38, 70, 83, 0.5)'],
      ['rgba(234, 234, 234, 0.35)', 'rgba(50, 181, 119, 0.35)'],
    ][i % 3];
    g.addColorStop(0, stops[0]);
    g.addColorStop(1, stops[1]);
    ctx.fillStyle = g;
    ctx.fillRect(i * fw + 10, 56, fw - 20, H - 112);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Ticket                                                             */
/* ------------------------------------------------------------------ */

function ticketShape(w: number, h: number, r: number, notch: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  // right notch
  s.lineTo(x + w, -notch);
  s.absarc(x + w, 0, notch, -Math.PI / 2, Math.PI / 2, true);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  // left notch
  s.lineTo(x, notch);
  s.absarc(x, 0, notch, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function Ticket({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const { geometry, front, back } = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(ticketShape(TICKET_W, TICKET_H, 0.12, 0.18), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 4,
      curveSegments: 32,
    });
    geo.center();
    return { geometry: geo, front: makeTicketFaceTexture('front'), back: makeTicketFaceTexture('back') };
  }, []);

  useEffect(() => () => {
    geometry.dispose();
    front.dispose();
    back.dispose();
  }, [geometry, front, back]);

  // Smaller ticket on narrow screens so it never overflows
  const scale = Math.min(1, viewport.width / 3.6);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const s = heroState.scroll;

    // Pointer tilt + slow idle spin + scroll-driven flip to the back side
    const targetY = heroState.pointerX * 0.45 + s * Math.PI * 1.15 + (reduced ? 0 : Math.sin(t * 0.35) * 0.12);
    const targetX = -heroState.pointerY * 0.3 + 0.12 - s * 0.4;
    const targetZ = -0.08 + s * 0.35;

    const k = 1 - Math.exp(-delta * 4);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    g.rotation.z += (targetZ - g.rotation.z) * k;
    g.position.y += (s * 1.4 - g.position.y) * k;
    g.position.z += (-s * 2.2 - g.position.z) * k;
  });

  return (
    <group ref={group} scale={scale}>
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial
          color="#86de76"
          metalness={0.55}
          roughness={0.3}
          clearcoat={1}
          clearcoatRoughness={0.15}
          iridescence={0}
          iridescenceIOR={1.4}
        />
      </mesh>
      {/* Engraved printing on both faces */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[TICKET_W - 0.08, TICKET_H - 0.06]} />
        <meshStandardMaterial map={front} transparent metalness={0.6} roughness={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[TICKET_W - 0.08, TICKET_H - 0.06]} />
        <meshStandardMaterial map={back} transparent metalness={0.6} roughness={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Film strip ring                                                    */
/* ------------------------------------------------------------------ */

function FilmRing({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makeFilmStripTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (!reduced) ref.current.rotation.y += delta * 0.12;
    tex.offset.x -= reduced ? 0 : delta * 0.02;
  });

  return (
    <group rotation={[0.42, 0, -0.22]}>
      <mesh ref={ref}>
        <cylinderGeometry args={[2.9, 2.9, 0.42, 128, 1, true]} />
        <meshStandardMaterial
          map={tex}
          transparent
          side={THREE.DoubleSide}
          metalness={0.3}
          roughness={0.6}
          emissive={new THREE.Color('#32b577')}
          emissiveMap={tex}
          emissiveIntensity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Projector beam + dust                                              */
/* ------------------------------------------------------------------ */

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // vUv.y: 1 at the lens, 0 at the far end
    float along = smoothstep(0.0, 1.0, vUv.y);
    float edge = sin(vUv.x * 3.14159265);
    float flicker = 0.92 + 0.08 * sin(uTime * 23.0) * sin(uTime * 7.0);
    float streaks = 0.75 + 0.25 * sin(vUv.x * 60.0 + uTime * 0.6);
    float a = along * pow(edge, 2.2) * 0.22 * flicker * streaks;
    gl_FragColor = vec4(uColor, a);
  }
`;

function ProjectorBeam({ reduced }: { reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color('#86de76') } }),
    []
  );
  useFrame((state) => {
    if (mat.current && !reduced) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh position={[-3.6, 3.2, -3]} rotation={[0, 0, -0.95]}>
      <coneGeometry args={[3.2, 9, 64, 1, true]} />
      <shaderMaterial
        ref={mat}
        vertexShader={beamVertex}
        fragmentShader={beamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Dust({ count, reduced }: { count: number; reduced: boolean }) {
  const points = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 14;
      p[i * 3 + 1] = (Math.random() - 0.5) * 8;
      p[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      s[i] = 0.05 + Math.random() * 0.15;
    }
    return { positions: p, speeds: s };
  }, [count]);

  const sprite = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(234,255,230,1)');
    g.addColorStop(0.35, 'rgba(134,222,118,0.5)');
    g.addColorStop(1, 'rgba(134,222,118,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame((state, delta) => {
    if (reduced || !points.current) return;
    const arr = points.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta * 0.4;
      arr[i * 3] += Math.sin(t * 0.3 + i) * delta * 0.02;
      if (arr[i * 3 + 1] > 4) arr[i * 3 + 1] = -4;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.07}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#c9f5c0"
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas                                                             */
/* ------------------------------------------------------------------ */

/**
 * Places the ticket where the page copy isn't: to the right on wide screens,
 * above the title on narrow ones.
 */
function Rig({ children }: { children: React.ReactNode }) {
  const { viewport, size } = useThree();
  // Side-by-side only when there's real room for both the title and the ticket
  const wide = size.width >= 1024 && viewport.width > viewport.height * 1.15;
  const x = wide ? viewport.width * 0.27 : 0;
  const y = wide ? viewport.height * 0.12 : viewport.height * 0.3;
  const scale = wide ? 0.85 : Math.min(0.62, (viewport.height * 0.34) / TICKET_H);
  return (
    <group position={[x, y, 0]} scale={scale}>
      {children}
    </group>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function TicketScene({ active = true }: { active?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
  const [fontsReady, setFontsReady] = useState(
    () => typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded'
  );

  // The ticket printing is drawn with web fonts, so wait for them.
  useEffect(() => {
    if (fontsReady) return;
    let alive = true;
    Promise.all([
      document.fonts.load('120px Anton'),
      document.fonts.load('600 40px "JetBrains Mono"'),
    ])
      .catch(() => undefined)
      .finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <Canvas
      dpr={[1, isSmall ? 1.5 : 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={!active ? 'never' : reduced ? 'demand' : 'always'}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <spotLight position={[-2, 5, 5]} angle={0.6} penumbra={1} intensity={90} color="#ffffff" />
      <pointLight position={[5, -3, 2]} intensity={14} color="#32b577" />

      <Rig>
        <Float
          enabled={!reduced}
          speed={1.4}
          rotationIntensity={0.25}
          floatIntensity={0.6}
          floatingRange={[-0.08, 0.08]}
        >
          <Ticket reduced={reduced} />
        </Float>
        <FilmRing reduced={reduced} />
      </Rig>
      <ProjectorBeam reduced={reduced} />
      <Dust count={isSmall ? 180 : 520} reduced={reduced} />

      {/* Studio reflections built from light panels: no HDR download */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[-3, 3, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#32b577" position={[4, -1, 2]} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={3} color="#eaeaea" position={[0, 0, 5]} scale={[4, 3, 1]} />
        <Lightformer form="ring" intensity={3} color="#ffffff" position={[0, 4, -4]} scale={3} />
        <Lightformer form="rect" intensity={1.5} color="#264653" position={[0, -4, 2]} scale={[8, 1, 1]} />
      </Environment>
    </Canvas>
  );
}
