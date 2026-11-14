import {CHARACTERS, type CharacterId} from '@binary/shared';

import {cn} from '@/lib/utils';

/** How a character feels right now. The chat changes it as a reply arrives. */
export type Mood = 'idle' | 'thinking' | 'talking' | 'happy' | 'oops';

/** Drawing settings per character. Coordinates are in a 200×200 box. */
interface Look {
  shape: 'round' | 'box' | 'ghost' | 'cloud';
  /** Eye height and the distance from the middle to each eye. */
  eyeY: number;
  eyeGap: number;
  mouthY: number;
  mouthWidth: number;
  /** Color of pupils, mouth and brows. */
  ink: string;
  /** A darker body tone for ears, tufts and other details. */
  dark: string;
  /** False for Bolt, whose eyes glow on a screen instead. */
  sclera: boolean;
  cheeks: boolean;
}

const BASE: Omit<Look, 'shape' | 'ink' | 'dark'> = {
  eyeY: 106,
  eyeGap: 22,
  mouthY: 132,
  mouthWidth: 11,
  sclera: true,
  cheeks: true,
};

const LOOKS: Record<CharacterId, Look> = {
  nova: {
    ...BASE,
    shape: 'round',
    eyeY: 102,
    eyeGap: 24,
    mouthY: 138,
    ink: '#1f2233',
    dark: '#2f8c9c',
  },
  bolt: {
    ...BASE,
    shape: 'box',
    eyeGap: 20,
    mouthY: 130,
    ink: '#d1fe17',
    dark: '#5a67c9',
    sclera: false,
    cheeks: false,
  },
  mimi: {...BASE, shape: 'round', eyeY: 108, ink: '#3a2533', dark: '#e0608a'},
  sunny: {...BASE, shape: 'round', ink: '#4a3510', dark: '#e0a826'},
  ember: {
    ...BASE,
    shape: 'round',
    eyeY: 104,
    mouthY: 136,
    ink: '#3a1d10',
    dark: '#c4532a',
  },
  moss: {
    ...BASE,
    shape: 'round',
    eyeY: 66,
    eyeGap: 30,
    mouthY: 120,
    mouthWidth: 22,
    ink: '#1d3a24',
    dark: '#4fa864',
  },
  pebble: {
    ...BASE,
    shape: 'cloud',
    eyeY: 112,
    eyeGap: 20,
    mouthY: 136,
    ink: '#2c2f40',
    dark: '#8d91ad',
  },
  juno: {
    ...BASE,
    shape: 'ghost',
    eyeY: 104,
    mouthY: 130,
    ink: '#2a1a4a',
    dark: '#8a63d9',
  },
};

// Where the pupils look in each mood: up and away while thinking, down when
// something went wrong.
const PUPIL_OFFSET: Record<Mood, [number, number]> = {
  idle: [0, 0],
  thinking: [4, -5],
  talking: [0, 1],
  happy: [0, 0],
  oops: [0, 4],
};

const SUN_RAYS = Array.from({length: 12}, (_, index) => (index * Math.PI) / 6);

function Body({shape, color}: {shape: Look['shape']; color: string}) {
  if (shape === 'box') {
    return <rect x="34" y="50" width="132" height="122" rx="38" fill={color} />;
  }
  if (shape === 'ghost') {
    return (
      <path
        d="M34 112a66 66 0 0 1 132 0v48q-11 14-22 0t-22 0-22 0-22 0-22 0-22 0z"
        fill={color}
      />
    );
  }
  if (shape === 'cloud') {
    return (
      <g fill={color}>
        <circle cx="64" cy="124" r="40" />
        <circle cx="136" cy="124" r="40" />
        <circle cx="100" cy="96" r="50" />
        <rect x="40" y="110" width="120" height="62" rx="31" />
      </g>
    );
  }
  return <ellipse cx="100" cy="112" rx="66" ry="62" fill={color} />;
}

/** Ears, tufts, rays and antennas: everything drawn behind the body. */
function BackDetails({
  id,
  color,
  look,
}: {
  id: CharacterId;
  color: string;
  look: Look;
}) {
  switch (id) {
    case 'nova':
      // Small feather tufts; the beak and glasses are drawn over the face.
      return (
        <g fill={look.dark}>
          <path d="M62 60 50 32l28 20z" />
          <path d="m138 60 12-28-28 20z" />
        </g>
      );
    case 'mimi':
    case 'ember':
      return (
        <g>
          <path d="M50 80 42 26l48 32z" fill={color} />
          <path d="m150 80 8-54-48 32z" fill={color} />
          <path
            d="M56 70 51 40l26 18z"
            fill={id === 'mimi' ? '#ffc2d4' : look.dark}
          />
          <path
            d="m144 70 5-30-26 18z"
            fill={id === 'mimi' ? '#ffc2d4' : look.dark}
          />
        </g>
      );
    case 'sunny':
      return (
        <g
          className="character-spin"
          stroke={look.dark}
          strokeWidth="9"
          strokeLinecap="round"
        >
          {SUN_RAYS.map((angle) => (
            <line
              key={angle}
              x1={100 + Math.cos(angle) * 74}
              y1={112 + Math.sin(angle) * 74}
              x2={100 + Math.cos(angle) * 90}
              y2={112 + Math.sin(angle) * 90}
            />
          ))}
        </g>
      );
    case 'moss':
      return (
        <g fill={color}>
          <circle cx="70" cy="66" r="26" />
          <circle cx="130" cy="66" r="26" />
        </g>
      );
    case 'bolt':
      return (
        <g>
          <line
            x1="100"
            y1="52"
            x2="100"
            y2="26"
            stroke={look.dark}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle
            className="character-pulse"
            cx="100"
            cy="20"
            r="9"
            fill="#d1fe17"
          />
          <rect x="24" y="98" width="14" height="28" rx="6" fill={look.dark} />
          <rect x="162" y="98" width="14" height="28" rx="6" fill={look.dark} />
        </g>
      );
    default:
      return null;
  }
}

/** Bellies, screens, muzzles and headsets: drawn on the body, under the face. */
function FrontDetails({id}: {id: CharacterId}) {
  switch (id) {
    case 'nova':
      return (
        <ellipse cx="100" cy="148" rx="34" ry="20" fill="#fff" opacity="0.22" />
      );
    case 'bolt':
      return (
        <rect x="54" y="76" width="92" height="74" rx="24" fill="#1d2140" />
      );
    case 'ember':
      return <ellipse cx="100" cy="138" rx="32" ry="20" fill="#fff1e6" />;
    case 'mimi':
      return (
        <g fill="none" stroke="#3b3550" strokeWidth="4" strokeLinecap="round">
          <rect
            x="30"
            y="98"
            width="16"
            height="30"
            rx="8"
            fill="#3b3550"
            stroke="none"
          />
          <path d="M40 126q8 26 38 24" />
          <circle cx="81" cy="150" r="5" fill="#3b3550" stroke="none" />
        </g>
      );
    default:
      return null;
  }
}

function Eye({
  cx,
  look,
  mood,
  color,
  sleepy,
}: {
  cx: number;
  look: Look;
  mood: Mood;
  color: string;
  sleepy: boolean;
}) {
  const cy = look.eyeY;
  if (mood === 'happy') {
    return (
      <path
        d={`M${cx - 10} ${cy + 3}Q${cx} ${cy - 10} ${cx + 10} ${cy + 3}`}
        fill="none"
        stroke={look.ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
    );
  }
  const [dx, dy] = PUPIL_OFFSET[mood];
  if (!look.sclera) {
    return (
      <rect
        x={cx + dx - 6}
        y={cy + dy - 9}
        width="12"
        height="18"
        rx="6"
        fill={look.ink}
      />
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r="14" fill="#fff" />
      <circle cx={cx + dx} cy={cy + dy} r="7.5" fill={look.ink} />
      <circle cx={cx + dx + 2.5} cy={cy + dy - 2.5} r="2.6" fill="#fff" />
      {/* Pebble's half-closed lids give it a calm, dry look. */}
      {sleepy && (
        <path d={`M${cx - 15} ${cy - 1}a15 15 0 0 1 30 0z`} fill={color} />
      )}
    </g>
  );
}

function Mouth({look, mood}: {look: Look; mood: Mood}) {
  const y = look.mouthY;
  const w = look.mouthWidth;
  const stroke = {
    fill: 'none',
    stroke: look.ink,
    strokeWidth: 4,
    strokeLinecap: 'round' as const,
  };
  switch (mood) {
    case 'talking':
      return (
        <ellipse
          className="character-talk"
          cx="100"
          cy={y + 4}
          rx={w * 0.8}
          ry="7"
          fill={look.ink}
        />
      );
    case 'happy':
      return (
        <g>
          <path
            d={`M${100 - w - 3} ${y}Q100 ${y + 20} ${100 + w + 3} ${y}z`}
            fill={look.ink}
          />
          <ellipse cx="100" cy={y + 8} rx="6" ry="3.5" fill="#ff7a93" />
        </g>
      );
    case 'thinking':
      return <path d={`M94 ${y + 3}Q100 ${y + 1} 108 ${y + 4}`} {...stroke} />;
    case 'oops':
      return <path d={`M88 ${y + 6}q4-4 8 0t8 0 8 0`} {...stroke} />;
    default:
      return (
        <path d={`M${100 - w} ${y}Q100 ${y + 9} ${100 + w} ${y}`} {...stroke} />
      );
  }
}

interface CharacterProps {
  id: CharacterId;
  mood?: Mood;
  /** Width and height in pixels. */
  size?: number;
  /** "face" crops to the head, for avatars in lists and chat. */
  variant?: 'full' | 'face';
  /** Read out by screen readers; leave empty when a name is already shown. */
  label?: string;
  className?: string;
}

/**
 * One of Binary's cartoon characters, drawn in SVG. It floats, blinks and
 * changes expression with `mood`; animations live in globals.css and stop
 * for people who prefer reduced motion.
 */
export function Character({
  id,
  mood = 'idle',
  size = 160,
  variant = 'full',
  label,
  className,
}: CharacterProps) {
  const look = LOOKS[id];
  const {color} = CHARACTERS[id];
  const sleepy = id === 'pebble' && (mood === 'idle' || mood === 'talking');
  const cheekX = look.eyeGap + 16;
  const cheekY = look.mouthY - 6;

  return (
    <svg
      viewBox={variant === 'face' ? '25 28 150 150' : '0 0 200 200'}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('character shrink-0 overflow-visible', className)}
      data-mood={mood}
    >
      {variant === 'full' && (
        <ellipse cx="100" cy="188" rx="48" ry="7" fill="#000" opacity="0.3" />
      )}
      <g className="character-float">
        <BackDetails id={id} color={color} look={look} />
        <Body shape={look.shape} color={color} />
        <FrontDetails id={id} />
        {look.cheeks && (
          <g fill="#ff6b8b" opacity={mood === 'happy' ? 0.55 : 0.32}>
            <ellipse cx={100 - cheekX} cy={cheekY} rx="9" ry="6" />
            <ellipse cx={100 + cheekX} cy={cheekY} rx="9" ry="6" />
          </g>
        )}
        <g className={mood === 'happy' ? undefined : 'character-eyes'}>
          <Eye
            cx={100 - look.eyeGap}
            look={look}
            mood={mood}
            color={color}
            sleepy={sleepy}
          />
          <Eye
            cx={100 + look.eyeGap}
            look={look}
            mood={mood}
            color={color}
            sleepy={sleepy}
          />
        </g>
        {mood === 'oops' && (
          <g stroke={look.ink} strokeWidth="4" strokeLinecap="round">
            <line
              x1={100 - look.eyeGap - 9}
              y1={look.eyeY - 19}
              x2={100 - look.eyeGap + 9}
              y2={look.eyeY - 25}
            />
            <line
              x1={100 + look.eyeGap + 9}
              y1={look.eyeY - 19}
              x2={100 + look.eyeGap - 9}
              y2={look.eyeY - 25}
            />
          </g>
        )}
        <Mouth look={look} mood={mood} />
        {id === 'nova' && <path d="M93 116h14l-7 11z" fill="#ffb347" />}
        {id === 'ember' && (
          <ellipse cx="100" cy="127" rx="7" ry="5" fill={look.ink} />
        )}
        {id === 'nova' && (
          <g fill="none" stroke="#1f2233" strokeWidth="4">
            <circle cx={100 - look.eyeGap} cy={look.eyeY} r="19" />
            <circle cx={100 + look.eyeGap} cy={look.eyeY} r="19" />
            <path
              d={`M${100 - look.eyeGap + 19} ${look.eyeY}h${2 * look.eyeGap - 38}`}
            />
          </g>
        )}
        {id === 'juno' && (
          <g fill="#fff">
            <path
              className="character-twinkle"
              d="m34 50 2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z"
            />
            <path
              className="character-twinkle [animation-delay:0.8s]"
              d="m168 74 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
            />
          </g>
        )}
        {mood === 'thinking' && (
          <g fill="#fff">
            <circle className="character-dot" cx="152" cy="44" r="4" />
            <circle
              className="character-dot [animation-delay:0.2s]"
              cx="166"
              cy="31"
              r="5"
            />
            <circle
              className="character-dot [animation-delay:0.4s]"
              cx="181"
              cy="17"
              r="6.5"
            />
          </g>
        )}
        {mood === 'oops' && (
          <path d="M156 62q7 11 0 16-7-5 0-16z" fill="#8fd3ff" />
        )}
      </g>
    </svg>
  );
}

interface CharacterAvatarProps {
  id: CharacterId;
  mood?: Mood;
  size?: number;
  className?: string;
}

/** The character's face in a round tile tinted with its color. */
export function CharacterAvatar({
  id,
  mood,
  size = 40,
  className,
}: CharacterAvatarProps) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${CHARACTERS[id].color}2e`,
      }}
    >
      <Character id={id} mood={mood} variant="face" size={size * 1.05} />
    </span>
  );
}
