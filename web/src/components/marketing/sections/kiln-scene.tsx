'use client';

import { motion } from 'framer-motion';

/**
 * Soil → bricks → sun → chimney → sorted stacks → truck → books, drawn as one
 * strip of six 120-wide panels so each lines up with its step above. The
 * active panel is in full colour and lifted; the rest wait in pale green.
 */

const ink = 'rgb(var(--mk-primary))';
const brick = 'rgb(var(--mk-brick))';
const amber = 'rgb(var(--mk-amber))';

function Making() {
  return (
    <g>
      <path d="M14 120q22-34 48-34t44 34Z" fill="#B98B5E" opacity=".75" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={66 + c * 13 - (r % 2) * 6}
            y={108 - r * 9}
            width="12"
            height="8"
            rx="1.5"
            fill="#8DBF9B"
          />
        )),
      )}
    </g>
  );
}

function Drying({ on }: { on: boolean }) {
  return (
    <g>
      <motion.g
        style={{ originX: '90px', originY: '38px' }}
        animate={on ? { rotate: 360 } : { rotate: 0 }}
        transition={on ? { duration: 18, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <circle cx="90" cy="38" r="12" fill={amber} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={90 + Math.cos(a) * 16}
              y1={38 + Math.sin(a) * 16}
              x2={90 + Math.cos(a) * 21}
              y2={38 + Math.sin(a) * 21}
              stroke={amber}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}
      </motion.g>
      {[0, 1].map((r) => (
        <g key={r}>
          <rect x="14" y={92 + r * 14} width="78" height="3" rx="1.5" fill={ink} opacity=".35" />
          {[0, 1, 2, 3, 4].map((c) => (
            <rect key={c} x={18 + c * 15} y={83 + r * 14} width="12" height="8" rx="1.5" fill="#C9A27A" />
          ))}
        </g>
      ))}
    </g>
  );
}

function Firing({ on }: { on: boolean }) {
  return (
    <g>
      <path d="M46 120 54 28h14l8 92Z" fill="#E7EFE9" stroke={ink} strokeOpacity=".5" />
      <rect x="52" y="34" width="18" height="4" fill={ink} opacity=".4" />
      <rect x="20" y="88" width="82" height="32" rx="3" fill="#E7EFE9" stroke={ink} strokeOpacity=".5" />
      <path d="M50 120v-14a11 11 0 0 1 22 0v14Z" fill={brick} />
      <motion.path
        d="M56 118q5-12 5-4 4-8 5 4Z"
        fill={amber}
        animate={on ? { scaleY: [1, 1.25, 0.9, 1] } : {}}
        style={{ originY: '118px' }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="62"
          cy="22"
          r={6 + i * 2}
          fill="#CFE3D5"
          animate={on ? { y: [-0, -26], x: [0, 14], opacity: [0.9, 0] } : { opacity: 0.5, y: -i * 8, x: i * 5 }}
          transition={on ? { duration: 2.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' } : { duration: 0 }}
        />
      ))}
    </g>
  );
}

function Sorting() {
  const pile = (x: number, rows: number, fill: string, label: string) => (
    <g key={label}>
      {Array.from({ length: rows }, (_, r) =>
        [0, 1].map((c) => (
          <rect
            key={`${r}${c}`}
            x={x + c * 13 - (r % 2) * 4}
            y={110 - r * 9}
            width="12"
            height="8"
            rx="1.5"
            fill={fill}
          />
        )),
      )}
      <text x={x + 12} y="132" textAnchor="middle" fontSize="9" fontWeight="700" fill={ink}>
        {label}
      </text>
    </g>
  );
  return <g>{[pile(12, 5, brick, 'C1'), pile(46, 4, '#D9826C', 'C2'), pile(80, 2, '#E8B3A5', 'C3')]}</g>;
}

function Dispatch({ on }: { on: boolean }) {
  return (
    <motion.g
      animate={on ? { x: [0, 6, 0] } : { x: 0 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <rect x="10" y="78" width="66" height="30" rx="3" fill={ink} />
      {[0, 1, 2].map((c) => (
        <rect key={c} x={16 + c * 19} y="70" width="16" height="8" rx="1.5" fill={brick} />
      ))}
      <path d="M76 86h20l12 12v10H76Z" fill="#3E8A5A" />
      <rect x="84" y="89" width="10" height="7" rx="1" fill="#DDEEE3" />
      <circle cx="28" cy="112" r="8" fill="#1E293B" />
      <circle cx="92" cy="112" r="8" fill="#1E293B" />
      <circle cx="28" cy="112" r="3" fill="#CBD5E1" />
      <circle cx="92" cy="112" r="3" fill="#CBD5E1" />
    </motion.g>
  );
}

function Sales() {
  return (
    <g>
      <rect x="22" y="40" width="70" height="84" rx="6" fill="#fff" stroke={ink} strokeOpacity=".5" />
      <rect x="22" y="40" width="70" height="16" rx="6" fill={ink} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="30" y={64 + i * 12} width="30" height="4" rx="2" fill={ink} opacity=".25" />
          <rect x="66" y={64 + i * 12} width="18" height="4" rx="2" fill={ink} opacity=".5" />
        </g>
      ))}
      <circle cx="96" cy="44" r="14" fill={amber} />
      <text x="96" y="49" textAnchor="middle" fontSize="15" fontWeight="800" fill="#5B3A00">
        ₹
      </text>
    </g>
  );
}

export function KilnScene({ active }: { active: number }) {
  const parts = [
    <Making key="m" />,
    <Drying key="d" on={active === 1} />,
    <Firing key="f" on={active === 2} />,
    <Sorting key="s" />,
    <Dispatch key="t" on={active === 4} />,
    <Sales key="a" />,
  ];
  return (
    <svg viewBox="0 0 720 150" className="mt-6 hidden w-full md:block" aria-hidden>
      <path d="M0 122h720" stroke={ink} strokeOpacity=".2" strokeDasharray="4 6" />
      {parts.map((part, i) => (
        <motion.g
          key={i}
          transform={`translate(${i * 120} 0)`}
          animate={{ opacity: i === active ? 1 : 0.32, y: i === active ? -4 : 0 }}
          transition={{ duration: 0.35 }}
          style={{ filter: i === active ? 'none' : 'grayscale(0.7)' }}
        >
          {i === active && <ellipse cx="60" cy="126" rx="50" ry="6" fill={ink} opacity=".12" />}
          {part}
        </motion.g>
      ))}
    </svg>
  );
}
