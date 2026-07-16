import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

export interface PhotoTreeEntry {
  id: string;
  title: string;
  href: string;
  image: string;
}

interface TreeDatum {
  name: string;
  photo?: PhotoTreeEntry;
  children?: TreeDatum[];
}

interface Point {
  x: number;
  y: number;
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

function buildBranches(entries: PhotoTreeEntry[], branch = 'forest'): TreeDatum {
  const [onlyEntry] = entries;
  if (entries.length === 1 && onlyEntry) return { name: onlyEntry.id, photo: onlyEntry };

  const midpoint = Math.ceil(entries.length / 2);
  return {
    name: branch,
    children: [
      buildBranches(entries.slice(0, midpoint), `${branch}-left`),
      buildBranches(entries.slice(midpoint), `${branch}-right`),
    ],
  };
}

function branchPath(parent: Point, child: Point) {
  const middleY = parent.y + (child.y - parent.y) * 0.52;
  return `M ${parent.x} ${parent.y} C ${parent.x} ${middleY}, ${child.x} ${middleY}, ${child.x} ${child.y}`;
}

export default function PhotoTree({ entries }: { entries: PhotoTreeEntry[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const [offsets, setOffsets] = useState<Record<string, Point>>({});

  const root = useMemo(() => {
    if (entries.length === 0) return null;
    const hierarchyRoot = hierarchy(buildBranches(entries));
    return tree<TreeDatum>().size([850, 520])(hierarchyRoot);
  }, [entries]);

  const positioned = (node: HierarchyPointNode<TreeDatum>): Point => {
    const base = {
      x: node.x + 75,
      y: 680 - node.y,
    };

    if (!node.data.photo) return base;
    const offset = offsets[node.data.photo.id] ?? { x: 0, y: 0 };
    return { x: base.x + offset.x, y: base.y + offset.y };
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

  if (!root) return null;

  const descendants = root.descendants();
  const leaves = descendants.filter((node) => node.data.photo);
  const rootPoint = positioned(root);

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

        <path
          className="tree-trunk"
          d={`M ${rootPoint.x - 8} 758 C ${rootPoint.x - 16} 730, ${rootPoint.x + 10} 710, ${rootPoint.x} ${rootPoint.y}`}
        />

        <g className="tree-branches" aria-hidden="true">
          {descendants.slice(1).map((node) => {
            const parent = positioned(node.parent!);
            const child = positioned(node);
            return (
              <path
                key={node.data.name}
                d={branchPath(parent, child)}
                style={{ strokeWidth: Math.max(2.2, 12 - node.depth * 2.25) }}
              />
            );
          })}
        </g>

        <g className="branch-joints" aria-hidden="true">
          {descendants
            .filter((node) => !node.data.photo)
            .map((node) => {
              const point = positioned(node);
              return (
                <circle
                  key={node.data.name}
                  cx={point.x}
                  cy={point.y}
                  r={Math.max(2.5, 7 - node.depth)}
                />
              );
            })}
        </g>

        <g className="photo-leaves">
          {leaves.map((node, index) => {
            const photo = node.data.photo!;
            const point = positioned(node);
            const labelWidth = Math.min(210, Math.max(90, photo.title.length * 6.4 + 20));
            const rotation = ((index % 5) - 2) * 1.4;

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
                        '--leaf-rotation': `${rotation}deg`,
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
                      {String(index + 1).padStart(2, '0')}
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
