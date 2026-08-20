/**
 * SetHub icon set — hand-drawn duotone flat icons.
 *
 * Every icon is a 24×24 SVG built from two layers: a soft filled shape that
 * picks up the current colour at low opacity, and a crisp mark on top. That
 * gives the "flaticon" weight the dashboard navigation needs while staying a
 * single inline component with no icon-font or sprite request.
 */
import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

const soft = { fill: "currentColor", opacity: 0.18 } as const;
const line = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* ── Navigation ─────────────────────────────────────────────────────────── */

export const IconDashboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="8" height="8.5" rx="2.6" {...soft} />
    <rect x="13" y="3" width="8" height="5.5" rx="2.2" {...soft} />
    <rect x="3" y="14" width="8" height="7" rx="2.4" {...line} />
    <rect x="13" y="11" width="8" height="10" rx="2.6" {...line} />
    <rect x="13" y="3" width="8" height="5.5" rx="2.2" {...line} />
    <rect x="3" y="3" width="8" height="8.5" rx="2.6" {...line} />
  </Svg>
);

export const IconPeople = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.6" {...soft} />
    <circle cx="9" cy="8" r="3.6" {...line} />
    <path d="M2.8 20c.5-3.4 3.1-5.4 6.2-5.4s5.7 2 6.2 5.4" {...line} />
    <path d="M16 5.2a3.3 3.3 0 0 1 0 6.2" {...line} />
    <path d="M17.4 14.9c2.1.6 3.6 2.4 3.9 5.1" {...line} />
  </Svg>
);

export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.6A3.1 3.1 0 0 1 6.1 3.5h11.8A3.1 3.1 0 0 1 21 6.6v7a3.1 3.1 0 0 1-3.1 3.1H9.4L4.6 20.3a.7.7 0 0 1-1.1-.6v-3.2A3.1 3.1 0 0 1 3 13.6z" {...soft} />
    <path d="M3 6.6A3.1 3.1 0 0 1 6.1 3.5h11.8A3.1 3.1 0 0 1 21 6.6v7a3.1 3.1 0 0 1-3.1 3.1H9.4L4.6 20.3a.7.7 0 0 1-1.1-.6v-3.2" {...line} />
    <path d="M7.6 8.4h8.8M7.6 11.8h5.6" {...line} />
  </Svg>
);

export const IconDepartment = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.6" y="13.6" width="6.4" height="7.4" rx="1.9" {...soft} />
    <rect x="15" y="13.6" width="6.4" height="7.4" rx="1.9" {...soft} />
    <rect x="8.8" y="2.6" width="6.4" height="6.4" rx="2" {...line} />
    <rect x="2.6" y="13.6" width="6.4" height="7.4" rx="1.9" {...line} />
    <rect x="15" y="13.6" width="6.4" height="7.4" rx="1.9" {...line} />
    <path d="M12 9v2.6M5.8 13.6v-2h12.4v2" {...line} />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3.2" {...soft} />
    <rect x="3" y="5" width="18" height="16" rx="3.2" {...line} />
    <path d="M3 10h18M8 3v4M16 3v4" {...line} />
    <rect x="7" y="13" width="3.4" height="3.2" rx="1" fill="currentColor" />
  </Svg>
);

export const IconProject = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V9.6l8-5.6 8 5.6V20a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 20z" {...soft} />
    <path d="M4 20V9.6l8-5.6 8 5.6V20a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 20z" {...line} />
    <path d="M9.4 21.4v-5.6h5.2v5.6" {...line} />
    <path d="M8 11.4h3M13 11.4h3" {...line} />
  </Svg>
);

export const IconCommunity = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" {...soft} />
    <circle cx="12" cy="12" r="9" {...line} />
    <circle cx="12" cy="8.4" r="2.1" {...line} />
    <circle cx="7.9" cy="15" r="2.1" {...line} />
    <circle cx="16.1" cy="15" r="2.1" {...line} />
    <path d="M10.4 9.9 9.2 13M13.6 9.9 14.8 13M10 15h4" {...line} />
  </Svg>
);

export const IconFinance = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.6" y="5.6" width="18.8" height="13.4" rx="3.2" {...soft} />
    <rect x="2.6" y="5.6" width="18.8" height="13.4" rx="3.2" {...line} />
    <path d="M2.6 10h18.8" {...line} />
    <path d="M6.4 15.2h3.2" {...line} />
    <circle cx="17.2" cy="15" r="1.5" fill="currentColor" />
  </Svg>
);

export const IconVote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.4 14.6 12 11l8.6 3.6-8.6 3.8z" {...soft} />
    <path d="M3.4 14.6 12 11l8.6 3.6-8.6 3.8z" {...line} />
    <path d="M3.4 14.6v3.1L12 21.4l8.6-3.7v-3.1" {...line} />
    <path d="M8.6 8.6 11 11l5-6.4" {...line} />
  </Svg>
);

export const IconResources = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.2 6.4A2 2 0 0 1 5.2 4.4h3.4l1.9 2.2h8.3a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2z" {...soft} />
    <path d="M3.2 6.4A2 2 0 0 1 5.2 4.4h3.4l1.9 2.2h8.3a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2z" {...line} />
    <path d="M7.6 12.8h8.8M7.6 16h5.6" {...line} />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.6" {...soft} />
    <path d="M12 3.4a8.6 8.6 0 0 1 3.5.74l.5 2.06 1.9 1.1 2.05-.6A8.6 8.6 0 0 1 20.6 12a8.6 8.6 0 0 1-.65 3.3l-2.05-.6-1.9 1.1-.5 2.06a8.6 8.6 0 0 1-7 0l-.5-2.06-1.9-1.1-2.05.6A8.6 8.6 0 0 1 3.4 12" {...line} />
    <circle cx="12" cy="12" r="3.1" {...line} />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8 20 6v6.1c0 4.6-3.2 7.9-8 9.1-4.8-1.2-8-4.5-8-9.1V6z" {...soft} />
    <path d="M12 2.8 20 6v6.1c0 4.6-3.2 7.9-8 9.1-4.8-1.2-8-4.5-8-9.1V6z" {...line} />
    <path d="m8.8 12 2.3 2.3 4.1-4.6" {...line} />
  </Svg>
);

/* ── Actions & status ───────────────────────────────────────────────────── */

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 10.4a6 6 0 1 1 12 0v3.2l1.5 2.8H4.5L6 13.6z" {...soft} />
    <path d="M6 10.4a6 6 0 1 1 12 0v3.2l1.5 2.8H4.5L6 13.6z" {...line} />
    <path d="M10 19.4a2.1 2.1 0 0 0 4 0" {...line} />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.6" {...soft} />
    <circle cx="10.8" cy="10.8" r="6.6" {...line} />
    <path d="m15.7 15.7 4.1 4.1" {...line} />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.4v13.2M5.4 12h13.2" {...line} />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.6 4.6 4.6L19 6.6" {...line} />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6.6 6.6 10.8 10.8M17.4 6.6 6.6 17.4" {...line} />
  </Svg>
);

export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 5.5 6.4 6.5L9 18.5" {...line} />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5.5 9 6.5 6.4L18.5 9" {...line} />
  </Svg>
);

export const IconArrow = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.6 12h14M13.2 6.2 19 12l-5.8 5.8" {...line} />
  </Svg>
);

export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l3-3a3.6 3.6 0 0 0-5.1-5.1l-1.4 1.4" {...line} />
    <path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-3 3a3.6 3.6 0 0 0 5.1 5.1l1.4-1.4" {...line} />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2.6" {...soft} />
    <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2.6" {...line} />
    <path d="M15.6 5.6a2.2 2.2 0 0 0-2.2-2.2H6.6a3.2 3.2 0 0 0-3.2 3.2v6.8a2.2 2.2 0 0 0 2.2 2.2" {...line} />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15.4V18a2.4 2.4 0 0 0 2.4 2.4h11.2A2.4 2.4 0 0 0 20 18v-2.6" {...line} />
    <path d="M12 3.6v10.8M7.8 10.6 12 14.8l4.2-4.2" {...line} />
  </Svg>
);

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15.4V18a2.4 2.4 0 0 0 2.4 2.4h11.2A2.4 2.4 0 0 0 20 18v-2.6" {...line} />
    <path d="M12 15V4.2M7.8 8.4 12 4.2l4.2 4.2" {...line} />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.4 3.6 10.6 13.4M20.4 3.6l-6.3 17.1-3.5-7.3-7.3-3.5z" {...soft} />
    <path d="M20.4 3.6 10.6 13.4M20.4 3.6l-6.3 17.1-3.5-7.3-7.3-3.5z" {...line} />
  </Svg>
);

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.2 8.2A2.6 2.6 0 0 1 5.8 5.6h11.4A2.6 2.6 0 0 1 19.8 8.2v9A2.6 2.6 0 0 1 17.2 19.8H5.8A2.6 2.6 0 0 1 3.2 17.2z" {...soft} />
    <path d="M3.2 8.2A2.6 2.6 0 0 1 5.8 5.6h11.4A2.6 2.6 0 0 1 19.8 8.2v9A2.6 2.6 0 0 1 17.2 19.8H5.8A2.6 2.6 0 0 1 3.2 17.2z" {...line} />
    <path d="M14.6 12.7h6.2v-2.4h-6.2a1.2 1.2 0 0 0 0 2.4z" {...line} />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.4" {...soft} />
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.4" {...line} />
    <path d="M8 15.6v-3M12 15.6V8.8M16 15.6v-4.8" {...line} />
  </Svg>
);

export const IconTrophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" {...soft} />
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" {...line} />
    <path d="M7 5.6H4.6a2.6 2.6 0 0 0 2.6 4.4M17 5.6h2.4a2.6 2.6 0 0 1-2.6 4.4" {...line} />
    <path d="M12 14v3.4M8.6 20.4h6.8" {...line} />
  </Svg>
);

export const IconMegaphone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.6 17.4 4.4v15.2L4 14.4z" {...soft} />
    <path d="M4 9.6 17.4 4.4v15.2L4 14.4z" {...line} />
    <path d="M4 9.6H3.4A1.6 1.6 0 0 0 1.8 11.2v1.6A1.6 1.6 0 0 0 3.4 14.4H4" {...line} />
    <path d="M7.4 15.2v3.4a1.9 1.9 0 0 0 3.8 0v-2M20.4 9.4a3 3 0 0 1 0 5.2" {...line} />
  </Svg>
);

export const IconPhoto = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="3" {...soft} />
    <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="3" {...line} />
    <circle cx="9" cy="10" r="1.7" {...line} />
    <path d="m4 17.4 4.6-4a2 2 0 0 1 2.7 0l4.1 3.7 1.3-1.1a2 2 0 0 1 2.6 0l1.5 1.3" {...line} />
  </Svg>
);

export const IconDocument = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.6 4.6A2 2 0 0 1 7.6 2.6h5.2l5.6 5.6v11.2a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2z" {...soft} />
    <path d="M5.6 4.6A2 2 0 0 1 7.6 2.6h5.2l5.6 5.6v11.2a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2z" {...line} />
    <path d="M12.8 2.6v5.6h5.6M9 13.4h6M9 16.6h4" {...line} />
  </Svg>
);

export const IconSchool = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.4 22 8.2 12 13 2 8.2z" {...soft} />
    <path d="M12 3.4 22 8.2 12 13 2 8.2z" {...line} />
    <path d="M6.4 10.6v5.1c0 1.9 2.5 3.4 5.6 3.4s5.6-1.5 5.6-3.4v-5.1M20.4 9.2v5.4" {...line} />
  </Svg>
);

export const IconBriefcase = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.8" y="7" width="18.4" height="13" rx="2.8" {...soft} />
    <rect x="2.8" y="7" width="18.4" height="13" rx="2.8" {...line} />
    <path d="M8.8 7V5.6A2.2 2.2 0 0 1 11 3.4h2a2.2 2.2 0 0 1 2.2 2.2V7M2.8 12.4h18.4" {...line} />
  </Svg>
);

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.6 10.4 12 3.4l8.4 7v9a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8z" {...soft} />
    <path d="M3.6 10.4 12 3.4l8.4 7v9a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8z" {...line} />
    <path d="M9.4 21.2v-6h5.2v6" {...line} />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.4" y="10" width="15.2" height="10.8" rx="3" {...soft} />
    <rect x="4.4" y="10" width="15.2" height="10.8" rx="3" {...line} />
    <path d="M8 10V7.6a4 4 0 0 1 8 0V10" {...line} />
    <circle cx="12" cy="15.4" r="1.5" fill="currentColor" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" {...soft} />
    <circle cx="12" cy="12" r="8.8" {...line} />
    <path d="M3.4 12h17.2M12 3.2c2.3 2.4 3.5 5.5 3.5 8.8s-1.2 6.4-3.5 8.8c-2.3-2.4-3.5-5.5-3.5-8.8s1.2-6.4 3.5-8.8z" {...line} />
  </Svg>
);

export const IconWhatsapp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.8 21.2l4.6-1.2A9.2 9.2 0 1 0 12 2.8z" {...soft} />
    <path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.8 21.2l4.6-1.2A9.2 9.2 0 1 0 12 2.8z" {...line} />
    <path d="M8.8 8.2c.3-.1.8 0 1 .4l.7 1.4c.2.4 0 .7-.2.9l-.5.5c.5 1.1 1.4 2 2.5 2.5l.5-.5c.2-.2.5-.4.9-.2l1.4.7c.4.2.5.7.4 1-.3.8-1.2 1.3-2 1.2-3-.4-5.6-3-6-6-.1-.8.4-1.7 1.3-2z" {...line} />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 13.8 9 19.6 10.8 13.8 12.6 12 18.4 10.2 12.6 4.4 10.8 10.2 9z" {...soft} />
    <path d="M12 3.2 13.8 9 19.6 10.8 13.8 12.6 12 18.4 10.2 12.6 4.4 10.8 10.2 9z" {...line} />
    <path d="M18.4 16.4 19 18.4l2 .6-2 .6-.6 2-.6-2-2-.6 2-.6z" {...line} />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" {...soft} />
    <circle cx="12" cy="12" r="8.8" {...line} />
    <path d="M12 7v5.2l3.4 2" {...line} />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.4S5 15.6 5 10.4a7 7 0 0 1 14 0c0 5.2-7 11-7 11z" {...soft} />
    <path d="M12 21.4S5 15.6 5 10.4a7 7 0 0 1 14 0c0 5.2-7 11-7 11z" {...line} />
    <circle cx="12" cy="10.2" r="2.4" {...line} />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h11" {...line} />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.4 4.4H7.2a2.4 2.4 0 0 0-2.4 2.4v10.4a2.4 2.4 0 0 0 2.4 2.4h7.2" {...line} />
    <path d="M18.2 12H10m5-3.6 3.6 3.6-3.6 3.6" {...line} />
  </Svg>
);

export const IconUserPlus = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.6" cy="8" r="3.6" {...soft} />
    <circle cx="9.6" cy="8" r="3.6" {...line} />
    <path d="M3.2 20c.5-3.4 3.2-5.4 6.4-5.4 1.3 0 2.5.3 3.5.9" {...line} />
    <path d="M17.6 14v6M14.6 17h6" {...line} />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.4" y="3.4" width="7.4" height="7.4" rx="2.4" {...soft} />
    <rect x="13.2" y="3.4" width="7.4" height="7.4" rx="2.4" {...line} />
    <rect x="3.4" y="13.2" width="7.4" height="7.4" rx="2.4" {...line} />
    <rect x="13.2" y="13.2" width="7.4" height="7.4" rx="2.4" {...soft} />
    <rect x="3.4" y="3.4" width="7.4" height="7.4" rx="2.4" {...line} />
    <rect x="13.2" y="13.2" width="7.4" height="7.4" rx="2.4" {...line} />
  </Svg>
);

export const IconQuiz = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" {...soft} />
    <circle cx="12" cy="12" r="9" {...line} />
    <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.4" {...line} />
    <circle cx="12" cy="16.6" r="1.05" fill="currentColor" />
  </Svg>
);

export const IconPoll = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.4" y="4.4" width="17.2" height="15.2" rx="3.2" {...soft} />
    <rect x="3.4" y="4.4" width="17.2" height="15.2" rx="3.2" {...line} />
    <path d="M7.4 15.6V9.8M12 15.6v-3.4M16.6 15.6V8.4" {...line} />
  </Svg>
);

export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.4S3.6 15.6 3.6 9.8a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 5.8-8.4 10.6-8.4 10.6z" {...soft} />
    <path d="M12 20.4S3.6 15.6 3.6 9.8a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 5.8-8.4 10.6-8.4 10.6z" {...line} />
  </Svg>
);

export const IconHash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.4 3.6 7.6 20.4M16.4 3.6l-1.8 16.8M4.2 8.6h16M3.4 15.4h16" {...line} />
  </Svg>
);

/** Icon lookup used by the sidebar and by DB-driven records (calendar icons). */
export const ICONS = {
  dashboard: IconDashboard,
  people: IconPeople,
  chat: IconChat,
  department: IconDepartment,
  calendar: IconCalendar,
  project: IconProject,
  community: IconCommunity,
  finance: IconFinance,
  wallet: IconWallet,
  vote: IconVote,
  resources: IconResources,
  settings: IconSettings,
  shield: IconShield,
  bell: IconBell,
  search: IconSearch,
  plus: IconPlus,
  check: IconCheck,
  close: IconClose,
  chevron: IconChevron,
  chevronDown: IconChevronDown,
  arrow: IconArrow,
  link: IconLink,
  copy: IconCopy,
  download: IconDownload,
  upload: IconUpload,
  send: IconSend,
  chart: IconChart,
  trophy: IconTrophy,
  megaphone: IconMegaphone,
  photo: IconPhoto,
  document: IconDocument,
  school: IconSchool,
  briefcase: IconBriefcase,
  home: IconHome,
  lock: IconLock,
  globe: IconGlobe,
  whatsapp: IconWhatsapp,
  sparkle: IconSparkle,
  clock: IconClock,
  pin: IconPin,
  menu: IconMenu,
  logout: IconLogout,
  "user-plus": IconUserPlus,
  grid: IconGrid,
  quiz: IconQuiz,
  poll: IconPoll,
  heart: IconHeart,
  hash: IconHash,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...rest }: { name: string } & IconProps) {
  const Cmp = (ICONS as Record<string, (p: IconProps) => ReactElement>)[name] ?? IconSparkle;
  return <Cmp {...rest} />;
}
