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

const width = 1000;
const height = 760;
const forestSeed = 0x5eed1234;

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
  const [windBurst, setWindBurst] = useState(0);
  const [isWindy, setIsWindy] = useState(false);

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

  const summonWind = () => {
    if (windTimerRef.current !== null) window.clearTimeout(windTimerRef.current);
    setWindBurst((current) => current + 1);
    setIsWindy(true);
    windTimerRef.current = window.setTimeout(() => {
      setIsWindy(false);
      windTimerRef.current = null;
    }, 1900);
  };

  if (entries.length === 0) return null;

  return (
    <div className="photo-tree-frame">
      <button
        className="wind-button"
        type="button"
        onClick={summonWind}
        aria-label="Blow through the tree"
        title="Blow through the tree"
      >
        <span aria-hidden="true">🌬️</span>
      </button>
      <svg
        ref={svgRef}
        className="photo-tree"
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
          <filter id="leaf-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#30305c" floodOpacity="0.2" />
          </filter>
        </defs>

        <path className="tree-trunk" d={organicTree.trunk} />

        <g
          key={windBurst}
          className={`tree-crown${isWindy ? ' tree-crown--windy' : ''}`}
          style={{ '--wind-delay': `${(windBurst % 3) * 0.02}s` } as CSSProperties}
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

          <g className="photo-leaves">
            {organicTree.leaves.map((leaf, index) => {
              const { photo } = leaf;
              const point = positioned(leaf);
              const labelWidth = Math.min(210, Math.max(90, photo.title.length * 6.4 + 20));

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
                          '--wind-leaf-delay': `${index * 0.025}s`,
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
      </svg>
    </div>
  );
}
