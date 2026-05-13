'use client';

interface ColorWheelProps {
  colors: string[];
  scheme: string;
  size?: number;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # prefix
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));

  if (diff !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, l };
}

export default function ColorWheel({ colors, scheme, size = 200 }: ColorWheelProps) {
  const center = size / 2;
  const outerRadius = size / 2 - 8;
  const donutRadius = outerRadius * 0.45; // inner hole
  const dotRadius = 8;
  const dotRingRadius = outerRadius * 0.75; // where dots sit on the wheel

  // Calculate dot positions based on hue angle
  const dotPositions = colors.map(hex => {
    let hsl = { h: 0, s: 0.5, l: 0.5 };
    try {
      hsl = hexToHsl(hex);
    } catch {
      // fallback
    }
    const angleRad = ((hsl.h - 90) * Math.PI) / 180; // -90 to start at top
    const x = center + dotRingRadius * Math.cos(angleRad);
    const y = center + dotRingRadius * Math.sin(angleRad);
    return { x, y, color: hex };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Hue wheel using CSS conic-gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(
              hsl(0,100%,50%),
              hsl(30,100%,50%),
              hsl(60,100%,50%),
              hsl(90,100%,50%),
              hsl(120,100%,50%),
              hsl(150,100%,50%),
              hsl(180,100%,50%),
              hsl(210,100%,50%),
              hsl(240,100%,50%),
              hsl(270,100%,50%),
              hsl(300,100%,50%),
              hsl(330,100%,50%),
              hsl(360,100%,50%)
            )`,
            width: size - 16,
            height: size - 16,
            margin: 8,
          }}
        />

        {/* White donut hole */}
        <div
          className="absolute bg-white rounded-full"
          style={{
            width: donutRadius * 2,
            height: donutRadius * 2,
            left: center - donutRadius,
            top: center - donutRadius,
          }}
        />

        {/* SVG layer for dots and connecting lines */}
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Connecting lines between dots */}
          {dotPositions.length > 1 &&
            dotPositions.map((pos, i) => {
              const next = dotPositions[(i + 1) % dotPositions.length];
              if (i === dotPositions.length - 1 && dotPositions.length === 2) return null;
              return (
                <line
                  key={`line-${i}`}
                  x1={pos.x}
                  y1={pos.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="white"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  opacity={0.8}
                />
              );
            })}
          {/* If exactly 2 dots, draw their connecting line */}
          {dotPositions.length === 2 && (
            <line
              x1={dotPositions[0].x}
              y1={dotPositions[0].y}
              x2={dotPositions[1].x}
              y2={dotPositions[1].y}
              stroke="white"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.8}
            />
          )}

          {/* Color dots */}
          {dotPositions.map((pos, i) => (
            <g key={`dot-${i}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={dotRadius + 2}
                fill="white"
                opacity={0.9}
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={dotRadius}
                fill={pos.color}
                stroke="white"
                strokeWidth={2}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Scheme label */}
      <div className="text-center">
        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full capitalize">
          {scheme} harmony
        </span>
      </div>

      {/* Color swatches row */}
      {colors.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {colors.map((color, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-500 font-mono">{color}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
