import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

export interface PhotoTreeEntry {
  id: string;
  title: string;
  href: string;
  image: string;
}

interface Point {
  x: number;
  y: number;
}

interface OrganicLeaf {
  photo: PhotoTreeEntry;
  number: number;
  point: Point;
  anchor: Point;
  bend: Point;
  rotation: number;
  scale: number;
}

interface OrganicTree {
  trunk: string;
  trunkTop: Point;
  leaves: OrganicLeaf[];
  boughs: Array<{ id: string; path: string; width: number; empty?: boolean }>;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origin: Point;
  moved: boolean;
}

interface TornadoProfile {
  duration: number;
  direction: number;
  strength: number;
}

const width = 1000;
const height = 760;
const forestSeed = 0x5eed1234;

const quietTornado: TornadoProfile = {
  duration: 3200,
  direction: 1,
  strength: 1,
};

const christmasLights = [
  { x: 292, y: 188 },
  { x: 360, y: 211 },
  { x: 432, y: 226 },
  { x: 505, y: 229 },
  { x: 578, y: 224 },
  { x: 650, y: 207 },
  { x: 716, y: 184 },
  { x: 224, y: 316 },
  { x: 312, y: 348 },
  { x: 405, y: 367 },
  { x: 500, y: 374 },
  { x: 596, y: 368 },
  { x: 690, y: 348 },
  { x: 780, y: 314 },
];

const sakuraBlossoms = [
  { x: 158, y: 397, scale: 0.82 },
  { x: 205, y: 258, scale: 1.05 },
  { x: 274, y: 188, scale: 0.78 },
  { x: 334, y: 148, scale: 1.08 },
  { x: 405, y: 112, scale: 0.88 },
  { x: 475, y: 82, scale: 1.18 },
  { x: 542, y: 108, scale: 0.8 },
  { x: 611, y: 132, scale: 1.08 },
  { x: 680, y: 161, scale: 0.84 },
  { x: 735, y: 184, scale: 1.14 },
  { x: 808, y: 238, scale: 0.76 },
  { x: 850, y: 300, scale: 1.05 },
  { x: 772, y: 424, scale: 0.9 },
  { x: 684, y: 390, scale: 1.08 },
  { x: 585, y: 340, scale: 0.8 },
  { x: 500, y: 292, scale: 1.02 },
  { x: 408, y: 292, scale: 0.75 },
  { x: 320, y: 344, scale: 1.08 },
  { x: 230, y: 360, scale: 0.82 },
];

const sakuraPetals = [
  { x: 255, y: 150, drift: -38, delay: -0.8 },
  { x: 362, y: 95, drift: 24, delay: -2.6 },
  { x: 455, y: 165, drift: -18, delay: -4.2 },
  { x: 550, y: 88, drift: 42, delay: -1.7 },
  { x: 645, y: 148, drift: -27, delay: -3.5 },
  { x: 735, y: 220, drift: 33, delay: -5.1 },
  { x: 300, y: 290, drift: 45, delay: -4.8 },
  { x: 420, y: 355, drift: -32, delay: -2.1 },
  { x: 580, y: 300, drift: 22, delay: -5.6 },
  { x: 690, y: 370, drift: -44, delay: -3.1 },
];

const fireflies = Array.from({ length: 18 }, (_, index) => ({
  x: 125 + ((index * 137) % 750),
  y: 85 + ((index * 83) % 470),
  delay: index * -0.41,
  duration: 3.2 + (index % 5) * 0.55,
}));

const rainDrops = Array.from({ length: 42 }, (_, index) => ({
  x: 20 + ((index * 89) % 960),
  y: -80 + ((index * 137) % 690),
  length: 22 + (index % 5) * 7,
  delay: index * -0.09,
  duration: 0.72 + (index % 4) * 0.11,
}));

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith]!, result[index]!];
  }
  return result;
}

interface BoughGeometry {
  id: string;
  start: Point;
  controlA: Point;
  controlB: Point;
  end: Point;
  width: number;
}

function cubicPoint(bough: BoughGeometry, t: number): Point {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * bough.start.x +
      3 * inverse ** 2 * t * bough.controlA.x +
      3 * inverse * t ** 2 * bough.controlB.x +
      t ** 3 * bough.end.x,
    y:
      inverse ** 3 * bough.start.y +
      3 * inverse ** 2 * t * bough.controlA.y +
      3 * inverse * t ** 2 * bough.controlB.y +
      t ** 3 * bough.end.y,
  };
}

function boughPath(bough: BoughGeometry) {
  return `M ${bough.start.x} ${bough.start.y} C ${bough.controlA.x} ${bough.controlA.y}, ${bough.controlB.x} ${bough.controlB.y}, ${bough.end.x} ${bough.end.y}`;
}

function buildOrganicTree(entries: PhotoTreeEntry[], seed: number): OrganicTree {
  const random = mulberry32(seed);
  const jitter = (amount: number) => (random() - 0.5) * amount * 2;
  const center = 505 + jitter(14);
  const trunkTop = { x: center + 22 + jitter(15), y: 205 + jitter(12) };
  const trunk = `M ${center + jitter(7)} 765 C ${center - 42 + jitter(12)} 650, ${center + 48 + jitter(14)} 545, ${center + jitter(11)} 442 C ${center - 25 + jitter(12)} 355, ${trunkTop.x + 15 + jitter(10)} 275, ${trunkTop.x} ${trunkTop.y}`;

  const boughGeometry: BoughGeometry[] = [
    {
      id: 'left-bough',
      start: { x: center - 4, y: 520 },
      controlA: { x: center - 110 + jitter(12), y: 470 },
      controlB: { x: 285 + jitter(14), y: 365 },
      end: { x: 175 + jitter(12), y: 245 + jitter(10) },
      width: 8.2,
    },
    {
      id: 'crown-bough',
      start: { x: center + 2, y: 448 },
      controlA: { x: center + 58 + jitter(10), y: 350 },
      controlB: { x: center - 30 + jitter(12), y: 225 },
      end: trunkTop,
      width: 6.8,
    },
    {
      id: 'right-bough',
      start: { x: center + 8, y: 475 },
      controlA: { x: center + 125 + jitter(12), y: 430 },
      controlB: { x: 725 + jitter(14), y: 330 },
      end: { x: 825 + jitter(12), y: 275 + jitter(10) },
      width: 7.6,
    },
  ];

  const slots = [
    { x: 145, y: 405, bough: 0, t: 0.56 },
    { x: 205, y: 255, bough: 0, t: 0.82 },
    { x: 330, y: 145, bough: 0, t: 0.96 },
    { x: 475, y: 82, bough: 1, t: 0.88 },
    { x: 610, y: 130, bough: 1, t: 0.63 },
    { x: 730, y: 175, bough: 2, t: 0.72 },
    { x: 850, y: 295, bough: 2, t: 0.93 },
    { x: 770, y: 425, bough: 2, t: 0.48 },
    { x: 585, y: 340, bough: 1, t: 0.34 },
  ];
  const orderedEntries = shuffled(entries, random);

  const leaves = orderedEntries.map((photo, index) => {
    const slot = slots[index] ?? {
      x: center + jitter(280),
      y: 180 + random() * 250,
      bough: 1,
      t: 0.5,
    };
    const point = { x: slot.x + jitter(16), y: slot.y + jitter(14) };
    const anchor = cubicPoint(boughGeometry[slot.bough]!, slot.t + jitter(0.025));
    const bend = {
      x: anchor.x + (point.x - anchor.x) * (0.48 + jitter(0.04)),
      y: anchor.y + (point.y - anchor.y) * (0.42 + jitter(0.05)),
    };

    return {
      photo,
      number: entries.indexOf(photo) + 1,
      point,
      anchor,
      bend,
      rotation: jitter(3.5),
      scale: index === 3 ? 1.1 : index % 3 === 0 ? 1.02 : 0.94 + random() * 0.06,
    };
  });

  const boughs = [
    ...boughGeometry.map((bough) => ({ id: bough.id, path: boughPath(bough), width: bough.width })),
    {
      id: 'empty-left',
      path: `M ${center - 65} 430 C ${center - 145} 380, ${center - 205} 305, ${center - 245} 220`,
      width: 2.25,
      empty: true,
    },
    {
      id: 'empty-right',
      path: `M ${center + 115} 392 C ${center + 185} 330, ${center + 220} 250, ${center + 205} 190`,
      width: 1.8,
      empty: true,
    },
  ];

  return { trunk, trunkTop, leaves, boughs };
}

function branchPath(anchor: Point, bend: Point, tip: Point) {
  return `M ${anchor.x} ${anchor.y} C ${bend.x} ${anchor.y - 18}, ${bend.x} ${bend.y}, ${tip.x} ${tip.y}`;
}

export default function PhotoTree({ entries }: { entries: PhotoTreeEntry[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const windTimerRef = useRef<number | null>(null);
  const [offsets, setOffsets] = useState<Record<string, Point>>({});
  const [seed, setSeed] = useState(forestSeed);
  const [tornadoBurst, setTornadoBurst] = useState(0);
  const [isTornado, setIsTornado] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [isRaining, setIsRaining] = useState(false);
  const [treeTheme, setTreeTheme] = useState<'christmas' | 'sakura' | null>(null);
  const [tornado, setTornado] = useState<TornadoProfile>(quietTornado);
  const isChristmas = treeTheme === 'christmas';
  const isSakura = treeTheme === 'sakura';

  useEffect(() => {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    setSeed(values[0] ?? Date.now());
  }, []);

  useEffect(
    () => () => {
      if (windTimerRef.current !== null) window.clearTimeout(windTimerRef.current);
    },
    [],
  );

  const organicTree = useMemo(() => buildOrganicTree(entries, seed), [entries, seed]);

  const positioned = (leaf: OrganicLeaf): Point => {
    const offset = offsets[leaf.photo.id] ?? { x: 0, y: 0 };
    return { x: leaf.point.x + offset.x, y: leaf.point.y + offset.y };
  };

  const onPointerDown = (event: PointerEvent<SVGGElement>, id: string) => {
    const origin = offsets[id] ?? { x: 0, y: 0 };
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;

    const bounds = svg.getBoundingClientRect();
    const scale = width / bounds.width;
    const deltaX = (event.clientX - drag.startX) * scale;
    const deltaY = (event.clientY - drag.startY) * scale;
    drag.moved ||= Math.abs(deltaX) + Math.abs(deltaY) > 6;

    setOffsets((current) => ({
      ...current,
      [drag.id]: {
        x: drag.origin.x + deltaX,
        y: drag.origin.y + deltaY,
      },
    }));
  };

  const onPointerUp = (event: PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.moved) {
      suppressClickRef.current = drag.id;
      window.setTimeout(() => {
        if (suppressClickRef.current === drag.id) suppressClickRef.current = null;
      }, 120);
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const summonTornado = () => {
    if (windTimerRef.current !== null) window.clearTimeout(windTimerRef.current);

    const nextTornado: TornadoProfile = {
      duration: Math.round(2850 + Math.random() * 950),
      direction: Math.random() < 0.5 ? -1 : 1,
      strength: 0.82 + Math.random() * 0.42,
    };

    setTornado(nextTornado);
    setTornadoBurst((current) => current + 1);
    setIsTornado(true);
    windTimerRef.current = window.setTimeout(() => {
      setIsTornado(false);
      windTimerRef.current = null;
    }, nextTornado.duration + 260);
  };

  if (entries.length === 0) return null;

  return (
    <div className={`photo-tree-frame${isNight ? ' photo-tree-frame--night' : ''}`}>
      <div className="weather-controls" aria-label="Tree controls">
        <button
          className="weather-button tornado-button"
          type="button"
          onClick={summonTornado}
          aria-label="Send a tornado through the tree"
          title="Send a tornado through the tree"
        >
          <span aria-hidden="true">🌪️</span>
        </button>
        <button
          className="weather-button christmas-button"
          type="button"
          onClick={() => setTreeTheme((current) => (current === 'christmas' ? null : 'christmas'))}
          aria-label={isChristmas ? 'Turn off Christmas tree' : 'Turn on Christmas tree'}
          aria-pressed={isChristmas}
          title={isChristmas ? 'Turn off Christmas tree' : 'Turn on Christmas tree'}
        >
          <span aria-hidden="true">🎄</span>
        </button>
        <button
          className="weather-button sakura-button"
          type="button"
          onClick={() => setTreeTheme((current) => (current === 'sakura' ? null : 'sakura'))}
          aria-label={isSakura ? 'Turn off cherry blossom tree' : 'Turn on cherry blossom tree'}
          aria-pressed={isSakura}
          title={isSakura ? 'Turn off cherry blossom tree' : 'Turn on cherry blossom tree'}
        >
          <span aria-hidden="true">🌸</span>
        </button>
        <button
          className="weather-button night-button"
          type="button"
          onClick={() => setIsNight((current) => !current)}
          aria-label={isNight ? 'Turn off moonlight' : 'Turn on moonlight and fireflies'}
          aria-pressed={isNight}
          title={isNight ? 'Turn off moonlight' : 'Turn on moonlight and fireflies'}
        >
          <span aria-hidden="true">🌙</span>
        </button>
        <button
          className="weather-button rain-button"
          type="button"
          onClick={() => setIsRaining((current) => !current)}
          aria-label={isRaining ? 'Stop the rain' : 'Make it rain'}
          aria-pressed={isRaining}
          title={isRaining ? 'Stop the rain' : 'Make it rain'}
        >
          <span aria-hidden="true">🌧️</span>
        </button>
      </div>
      <svg
        ref={svgRef}
        className={`photo-tree${isChristmas ? ' photo-tree--christmas' : ''}${isSakura ? ' photo-tree--sakura' : ''}${isNight ? ' photo-tree--night' : ''}${isRaining ? ' photo-tree--rain' : ''}`}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="photo-tree-title photo-tree-description"
      >
        <title id="photo-tree-title">Shuqi's photography tree</title>
        <desc id="photo-tree-description">
          A branching tree whose leaves are draggable photographs linking to photography projects.
        </desc>

        <defs>
          <linearGradient id="trunk-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#15131e" />
            <stop offset="0.55" stopColor="#303b92" />
            <stop offset="1" stopColor="#b56ba9" />
          </linearGradient>
          <linearGradient id="christmas-tree-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#173f32" />
            <stop offset="0.58" stopColor="#24644d" />
            <stop offset="1" stopColor="#d2a746" />
          </linearGradient>
          <linearGradient id="sakura-tree-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#392c3a" />
            <stop offset="0.52" stopColor="#70445f" />
            <stop offset="1" stopColor="#c26f91" />
          </linearGradient>
          <filter id="christmas-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="leaf-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#30305c" floodOpacity="0.2" />
          </filter>
        </defs>

        {isNight && (
          <g className="moonlight-scene" aria-hidden="true">
            <circle className="moon-halo" cx="118" cy="102" r="64" />
            <circle className="moon-disc" cx="118" cy="102" r="38" />
            <circle className="moon-shadow" cx="137" cy="87" r="36" />
            <g className="night-stars">
              <circle cx="235" cy="76" r="2.2" />
              <circle cx="318" cy="118" r="1.5" />
              <circle cx="565" cy="63" r="1.8" />
              <circle cx="685" cy="97" r="2.3" />
              <circle cx="812" cy="142" r="1.6" />
              <circle cx="905" cy="88" r="2" />
              <circle cx="92" cy="236" r="1.4" />
              <circle cx="884" cy="284" r="1.7" />
            </g>
          </g>
        )}

        <path className="tree-trunk" d={organicTree.trunk} />

        <g
          key={tornadoBurst}
          className={`tree-crown${isTornado ? ' tree-crown--tornado' : ''}`}
          style={
            {
              '--tornado-duration': `${tornado.duration}ms`,
              '--tornado-direction': tornado.direction,
              '--tornado-twist': `${tornado.direction * tornado.strength * 6.2}deg`,
              '--tornado-counter': `${tornado.direction * tornado.strength * -3.1}deg`,
              '--tornado-settle': `${tornado.direction * tornado.strength * 1.05}deg`,
              '--tornado-rebound': `${tornado.direction * tornado.strength * -0.58}deg`,
              '--tornado-shift': `${tornado.direction * tornado.strength * 23}px`,
              '--tornado-counter-shift': `${tornado.direction * tornado.strength * -12}px`,
            } as CSSProperties
          }
        >
          <g className="tree-branches" aria-hidden="true">
            {organicTree.boughs.map((bough) => (
              <path
                key={bough.id}
                d={bough.path}
                className={bough.empty ? 'empty-branch' : undefined}
                style={{ strokeWidth: bough.width }}
              />
            ))}
            {organicTree.leaves.map((leaf) => {
              const tip = positioned(leaf);
              return (
                <path
                  key={`branch-${leaf.photo.id}`}
                  d={branchPath(leaf.anchor, leaf.bend, tip)}
                  style={{ strokeWidth: Math.max(2.1, 5.4 - (610 - leaf.anchor.y) / 190) }}
                />
              );
            })}
          </g>

          <g className="branch-joints" aria-hidden="true">
            {organicTree.leaves.map((leaf) => (
              <circle
                key={`joint-${leaf.photo.id}`}
                cx={leaf.anchor.x}
                cy={leaf.anchor.y}
                r="3.2"
              />
            ))}
            <circle cx={organicTree.trunkTop.x} cy={organicTree.trunkTop.y} r="2.5" />
          </g>

          {isChristmas && (
            <g className="christmas-decorations" aria-hidden="true">
              <g className="christmas-garlands">
                <path d="M 252 168 C 385 245, 615 247, 750 165" />
                <path d="M 188 282 C 355 391, 660 397, 820 280" />
              </g>
              <g className="christmas-lights">
                {christmasLights.map((light, index) => (
                  <circle
                    key={`${light.x}-${light.y}`}
                    cx={light.x}
                    cy={light.y}
                    r={index % 3 === 0 ? 5 : 4}
                  />
                ))}
              </g>
              <g className="christmas-ornaments">
                <circle cx="325" cy="270" r="11" />
                <circle cx="438" cy="315" r="9" />
                <circle cx="565" cy="280" r="12" />
                <circle cx="676" cy="315" r="9" />
                <circle cx="520" cy="405" r="10" />
              </g>
              <g className="christmas-star" transform="translate(475 51)">
                <path d="M 0 -24 L 6 -8 L 23 -8 L 9 3 L 14 20 L 0 10 L -14 20 L -9 3 L -23 -8 L -6 -8 Z" />
              </g>
            </g>
          )}

          {isSakura && (
            <g className="sakura-decorations" aria-hidden="true">
              <g className="sakura-blossoms">
                {sakuraBlossoms.map((blossom, index) => (
                  <g
                    key={`${blossom.x}-${blossom.y}`}
                    transform={`translate(${blossom.x} ${blossom.y})`}
                  >
                    <g
                      className="sakura-blossom"
                      style={
                        {
                          '--blossom-scale': blossom.scale,
                          '--blossom-delay': `${index * -0.17}s`,
                        } as CSSProperties
                      }
                    >
                      <ellipse cx="0" cy="-9" rx="5.7" ry="9" />
                      <ellipse cx="8.6" cy="-2.7" rx="5.7" ry="9" transform="rotate(72 8.6 -2.7)" />
                      <ellipse cx="5.3" cy="7.3" rx="5.7" ry="9" transform="rotate(144 5.3 7.3)" />
                      <ellipse
                        cx="-5.3"
                        cy="7.3"
                        rx="5.7"
                        ry="9"
                        transform="rotate(216 -5.3 7.3)"
                      />
                      <ellipse
                        cx="-8.6"
                        cy="-2.7"
                        rx="5.7"
                        ry="9"
                        transform="rotate(288 -8.6 -2.7)"
                      />
                      <circle r="3.4" />
                    </g>
                  </g>
                ))}
              </g>
              <g className="sakura-falling-petals">
                {sakuraPetals.map((petal, index) => (
                  <g key={`${petal.x}-${petal.y}`} transform={`translate(${petal.x} ${petal.y})`}>
                    <path
                      d="M 0 -7 C 7 -6, 8 2, 0 8 C -6 5, -7 -3, 0 -7 Z"
                      style={
                        {
                          '--petal-drift': `${petal.drift}px`,
                          '--petal-delay': `${petal.delay}s`,
                          '--petal-turn': `${index % 2 === 0 ? 210 : -190}deg`,
                        } as CSSProperties
                      }
                    />
                  </g>
                ))}
              </g>
            </g>
          )}

          <g className="photo-leaves">
            {organicTree.leaves.map((leaf, index) => {
              const { photo } = leaf;
              const point = positioned(leaf);
              const labelWidth = Math.min(210, Math.max(90, photo.title.length * 6.4 + 20));
              const tornadoRandom = mulberry32(tornadoBurst * 1877 + index * 83 + 29);
              const tornadoReach = tornado.strength * (0.78 + tornadoRandom() * 0.44);
              const tornadoDirection = tornado.direction;

              return (
                <g
                  key={photo.id}
                  className="photo-leaf-position"
                  transform={`translate(${point.x} ${point.y})`}
                  onPointerDown={(event) => onPointerDown(event, photo.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <a
                    href={photo.href}
                    aria-label={`Open ${photo.title}`}
                    onClick={(event) => {
                      if (suppressClickRef.current === photo.id) event.preventDefault();
                    }}
                  >
                    <g
                      className="photo-leaf"
                      style={
                        {
                          '--leaf-rotation': `${leaf.rotation}deg`,
                          '--leaf-scale': leaf.scale,
                          '--leaf-delay': `${index * -0.63}s`,
                          '--idle-sway': `${0.58 + ((index * 7) % 5) * 0.11}deg`,
                          '--idle-lift': `${0.8 + ((index * 11) % 4) * 0.35}px`,
                          '--idle-sway-settle': `${(0.58 + ((index * 7) % 5) * 0.11) * 0.35}deg`,
                          '--idle-lift-settle': `${(0.8 + ((index * 11) % 4) * 0.35) * -0.35}px`,
                          '--idle-duration': `${7.6 + ((index * 13) % 6) * 0.72}s`,
                          '--tornado-duration': `${tornado.duration}ms`,
                          '--tornado-delay': `${tornadoRandom() * 0.18}s`,
                          '--tornado-x1': `${tornadoDirection * tornadoReach * (24 + tornadoRandom() * 38)}px`,
                          '--tornado-y1': `${tornadoReach * (-18 - tornadoRandom() * 32)}px`,
                          '--tornado-r1': `${tornadoDirection * (55 + tornadoRandom() * 90)}deg`,
                          '--tornado-x2': `${-tornadoDirection * tornadoReach * (48 + tornadoRandom() * 74)}px`,
                          '--tornado-y2': `${tornadoReach * (-70 - tornadoRandom() * 78)}px`,
                          '--tornado-r2': `${tornadoDirection * (190 + tornadoRandom() * 170)}deg`,
                          '--tornado-x3': `${tornadoDirection * tornadoReach * (22 + tornadoRandom() * 46)}px`,
                          '--tornado-y3': `${tornadoReach * (-28 - tornadoRandom() * 46)}px`,
                          '--tornado-r3': `${tornadoDirection * (330 + tornadoRandom() * 220)}deg`,
                        } as CSSProperties
                      }
                    >
                      <rect className="photo-mat" x="-55" y="-42" width="110" height="84" rx="1" />
                      <image
                        href={photo.image}
                        x="-50"
                        y="-37"
                        width="100"
                        height="70"
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <text className="leaf-number" x="48" y="39" textAnchor="end">
                        {String(leaf.number).padStart(2, '0')}
                      </text>
                      <g className="leaf-label" transform="translate(0 52)">
                        <rect x={-labelWidth / 2} y="-12" width={labelWidth} height="24" rx="12" />
                        <text textAnchor="middle" dominantBaseline="middle">
                          {photo.title}
                        </text>
                      </g>
                    </g>
                  </a>
                </g>
              );
            })}
          </g>
        </g>

        {isNight && (
          <g className="fireflies" aria-hidden="true">
            {fireflies.map((firefly, index) => (
              <circle
                key={`${firefly.x}-${firefly.y}`}
                cx={firefly.x}
                cy={firefly.y}
                r={index % 4 === 0 ? 3.6 : 2.5}
                style={
                  {
                    '--firefly-delay': `${firefly.delay}s`,
                    '--firefly-duration': `${firefly.duration}s`,
                    '--firefly-drift': `${index % 2 === 0 ? 18 : -16}px`,
                  } as CSSProperties
                }
              />
            ))}
          </g>
        )}

        {isTornado && (
          <g
            key={`vortex-${tornadoBurst}`}
            className="tornado-vortex"
            aria-hidden="true"
            style={
              {
                '--tornado-duration': `${tornado.duration}ms`,
                '--tornado-vortex-turn': `${tornado.direction * 8}deg`,
              } as CSSProperties
            }
          >
            <path d="M 225 245 C 355 155, 665 150, 795 260" />
            <path d="M 285 340 C 410 275, 660 285, 750 370" />
            <path d="M 350 430 C 455 390, 620 400, 680 475" />
            <path d="M 420 510 C 490 485, 575 490, 615 535" />
          </g>
        )}

        {isRaining && (
          <g className="rain-curtain" aria-hidden="true">
            {rainDrops.map((drop, index) => (
              <line
                key={`${drop.x}-${drop.y}`}
                x1={drop.x}
                y1={drop.y}
                x2={drop.x - 9}
                y2={drop.y + drop.length}
                style={
                  {
                    '--rain-delay': `${drop.delay}s`,
                    '--rain-duration': `${drop.duration}s`,
                    '--rain-opacity': 0.42 + (index % 4) * 0.1,
                  } as CSSProperties
                }
              />
            ))}
            <ellipse className="rain-puddle" cx="510" cy="728" rx="205" ry="15" />
          </g>
        )}
      </svg>
    </div>
  );
}
