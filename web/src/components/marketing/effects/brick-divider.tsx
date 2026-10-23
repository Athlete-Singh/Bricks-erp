import { cn } from '@/lib/cn';
import { mk } from './patterns';

type Surface = 'bg' | 'white' | 'green';

const fill: Record<Surface, string> = { bg: mk.bg, white: mk.white, green: mk.primary };

const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/**
 * A stepped brick edge between two sections instead of a straight line. The
 * next section's colour climbs into the previous one in brick-sized steps.
 * "a": two-course stagger. "b": a three-step staircase, mirrored every tile.
 */
function tile(shape: 'a' | 'b', colour: string): { image: string; width: number } {
  const outline = `stroke='${mk.primary}' stroke-opacity='.08' fill='none'`;
  if (shape === 'a') {
    return {
      width: 64,
      image: uri(
        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='24'><path d='M0 8h32v-8h32v24H0Z' fill='${colour}'/><path d='M0 8.5h32M32.5 0v8M32 .5h32M16.5 8v8M48.5 0v16M0 16.5h64' ${outline}/></svg>`,
      ),
    };
  }
  return {
    width: 192,
    image: uri(
      `<svg xmlns='http://www.w3.org/2000/svg' width='192' height='24'><path d='M0 16h32V8h32V0h64v8h32v8h32v8H0Z' fill='${colour}'/><path d='M0 16.5h32M32 8.5h32M64 .5h64M128 8.5h32M160 16.5h32M32.5 8v8M64.5 0v8M96.5 0v16M128.5 0v8M160.5 8v8' ${outline}/></svg>`,
    ),
  };
}

export function BrickDivider({
  from,
  to,
  shape = 'a',
  className,
}: {
  from: Surface;
  to: Surface;
  shape?: 'a' | 'b';
  className?: string;
}) {
  const { image, width } = tile(shape, fill[to]);
  return (
    <div
      aria-hidden
      className={cn('relative z-[1] -mb-px h-6 w-full', className)}
      style={{
        backgroundColor: fill[from],
        backgroundImage: image,
        backgroundSize: `${width}px 24px`,
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'center bottom',
      }}
    />
  );
}
