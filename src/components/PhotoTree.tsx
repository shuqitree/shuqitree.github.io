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
}

interface OrganicTree {
  trunk: string;
  trunkTop: Point;
  leaves: OrganicLeaf[];
  shoots: Array<{ id: string; path: string; width: number }>;
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

function buildOrganicTree(entries: PhotoTreeEntry[], seed: number): OrganicTree {
  const random = mulberry32(seed);
  const jitter = (amount: number) => (random() - 0.5) * amount * 2;
  const center = 500 + jitter(32);
  const trunkTop = { x: center + jitter(42), y: 205 + jitter(25) };
  const trunk = `M ${center + jitter(16)} 765 C ${center - 52 + jitter(28)} 650, ${center + 62 + jitter(34)} 555, ${center + jitter(28)} 455 C ${center - 38 + jitter(28)} 365, ${trunkTop.x + 24 + jitter(24)} 285, ${trunkTop.x} ${trunkTop.y}`;

  const slots = shuffled(
    [
      { x: 135, y: 420 },
      { x: 195, y: 245 },
      { x: 330, y: 125 },
      { x: 500, y: 78 },
      { x: 675, y: 128 },
      { x: 820, y: 240 },
      { x: 880, y: 410 },
      { x: 305, y: 385 },
      { x: 700, y: 365 },
      { x: 470, y: 300 },
      { x: 590, y: 475 },
    ].slice(0, entries.length),
    random,
  );

  const leaves = entries.map((photo, index) => {
    const slot = slots[index] ?? { x: center + jitter(360), y: 130 + random() * 340 };
    const point = { x: slot.x + jitter(38), y: slot.y + jitter(32) };
    const side = point.x < center ? -1 : 1;
    const anchorY = Math.min(610, Math.max(245, point.y + 105 + random() * 125));
    const progress = (610 - anchorY) / 365;
    const anchor = {
      x: center + Math.sin(progress * Math.PI * 1.7) * 27 + jitter(15),
      y: anchorY,
    };
    const bend = {
      x: anchor.x + (point.x - anchor.x) * (0.4 + random() * 0.18) + side * jitter(38),
      y: anchor.y + (point.y - anchor.y) * (0.33 + random() * 0.22) + jitter(24),
    };

    return {
      photo,
      number: index + 1,
      point,
      anchor,
      bend,
      rotation: jitter(8),
    };
  });

  const shoots = Array.from({ length: 5 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const startY = 330 + index * 55 + jitter(22);
    const startX = center + jitter(22);
    const endX = startX + side * (95 + random() * 95);
    const endY = startY - 70 - random() * 85;
    return {
      id: `shoot-${index}`,
      path: `M ${startX} ${startY} C ${startX + side * 24} ${startY - 28}, ${endX - side * 35} ${endY + 24}, ${endX} ${endY}`,
      width: 3.4 - index * 0.32,
    };
  });

  return { trunk, trunkTop, leaves, shoots };
}

function branchPath(anchor: Point, bend: Point, tip: Point) {
  return `M ${anchor.x} ${anchor.y} C ${bend.x} ${anchor.y - 18}, ${bend.x} ${bend.y}, ${tip.x} ${tip.y}`;
}

export default function PhotoTree({ entries }: { entries: PhotoTreeEntry[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const [offsets, setOffsets] = useState<Record<string, Point>>({});
  const [seed, setSeed] = useState(forestSeed);

  useEffect(() => {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    setSeed(values[0] ?? Date.now());
  }, []);

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

  if (entries.length === 0) return null;

  return (
    <div className="photo-tree-frame">
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

        <g className="tree-branches" aria-hidden="true">
          {organicTree.shoots.map((shoot) => (
            <path key={shoot.id} d={shoot.path} style={{ strokeWidth: shoot.width }} />
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
            <circle key={`joint-${leaf.photo.id}`} cx={leaf.anchor.x} cy={leaf.anchor.y} r="3.2" />
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
                        '--leaf-delay': `${index * -0.63}s`,
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
      </svg>
    </div>
  );
}
