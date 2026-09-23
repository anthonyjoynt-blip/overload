/** Stroke icons, 24-grid, sized by CSS. */

type Props = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const TodayIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
  </svg>
);

export const CalendarIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const ProgramIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M19 18v3H6.5A2.5 2.5 0 0 1 4 18.5" />
  </svg>
);

export const LibraryIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11" />
  </svg>
);

export const ProgressIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M4 19h16" />
    <path d="m4 15 5-5 3.5 3.5L20 6" />
    <path d="M20 10V6h-4" />
  </svg>
);

export const SettingsIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M5 6h14M5 12h14M5 18h14" />
    <circle cx="9" cy="6" r="2" />
    <circle cx="15" cy="12" r="2" />
    <circle cx="8" cy="18" r="2" />
  </svg>
);

export const CheckIcon = ({ className }: Props) => (
  <svg {...base} strokeWidth={2.4} className={className}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const PlusIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const BackIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const CloseIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const InfoIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.2" />
  </svg>
);

export const TrashIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const TrendUpIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="m3 16 6-6 4 4 8-8" />
    <path d="M21 10V6h-4" />
  </svg>
);

export const ClockIcon = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
