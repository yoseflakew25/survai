import {
  IconActivity,
  IconAdjustments,
  IconAlertCircle,
  IconArrowRight,
  IconBrightness,
  IconBold,
  IconCalendar,
  IconCamera,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconCode,
  IconCreditCard,
  IconEdit,
  IconEye,
  IconExternalLink,
  IconEyeDown,
  IconFileZip,
  IconForms,
  IconGripVertical,
  IconItalic,
  IconLock,
  IconMusic,
  IconNotification,
  IconPalette,
  IconPhone,
  IconSearch,
  IconSend,
  IconShare,
  IconSettings,
  IconSlash,
  IconTrendingDown,
  IconTrendingUp,
  IconTrash,
  IconUnderline,
  IconUpload,
  IconUser,
  IconUsers,
  IconVideo,
} from '@tabler/icons-react';

import type { Icon as TablerIcon } from '@tabler/icons-react';

// ----- Inline SVG shims for app-used icon names Tabler doesn't ship -----
type InlineIconProps = Omit<React.SVGProps<SVGSVGElement>, 'children'> & {
  children?: React.ReactNode;
  size?: number | string;
};

type InlineIconComponent = React.FunctionComponent<InlineIconProps>;


const InlineIcon = Object.assign(
  (props: InlineIconProps) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={props.size ?? props.width ?? 24}
      height={props.size ?? props.height ?? 24}
      viewBox={props.viewBox ?? '0 0 24 24'}
      fill={props.fill ?? 'none'}
      stroke={props.stroke ?? 'currentColor'}
      strokeWidth={props.strokeWidth ?? 2}
      strokeLinecap={props.strokeLinecap ?? 'round'}
      strokeLinejoin={props.strokeLinejoin ?? 'round'}
      aria-hidden={props['aria-hidden'] ?? true}
      {...props}
    />
  ),
  { displayName: 'InlineIcon' },
);

const IconAnalytics = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M3 3v18h18' /><path d='M7 16l4-4 4 4 5-5' /><path d='M15 7h3' /><path d='M15 11h3' /><path d='M15 15h3' /></>
  </InlineIcon>
);
const IconBadgeCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M8 2l4 10 4-10' /><path d='M12 12v7' /><path d='M8 2v5' /><path d='M12 12l-4 5' /></>
  </InlineIcon>
);
const IconChat = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' /></>
  </InlineIcon>
);
const IconChordUpDownAlt = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M5 12h14' /><path d='M12 5l7 7-7 7' /></>
  </InlineIcon>
);
const IconChevronsUpDown = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M11 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2' /><path d='M9 9a3 3 0 1 0 6 0' /><path d='M13 9a3 3 0 1 0 0-6' /><path d='M8 14h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2' /></>
  </InlineIcon>
);
const IconClose = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M18 6 6 18' /><path d='m6 6 12 12' /></>
  </InlineIcon>
);
const IconEllipsis = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='12' cy='12' r='1' /><circle cx='19' cy='12' r='1' /><circle cx='5' cy='12' r='1' /></>
  </InlineIcon>
);
const IconGalleryVerticalEnd = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><rect width='7' height='16' x='3' y='4' rx='1' /><rect width='7' height='16' x='14' y='2' rx='1' /><path d='m21 16-3.5-3.5' /><path d='M12 16V8' /></>
  </InlineIcon>
);
const IconGithub = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7a5.44 5.44 0 0 0 0-11.07 5.07 5.07 0 0 0-7 5.07A5.44 5.44 0 0 0 20 4.12' /></>
  </InlineIcon>
);
const IconGoogle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    data-testid='google-g-mark'
    xmlns='http://www.w3.org/2000/svg'
    className='fill-current text-primary'
    width='1em'
    height='1em'
    viewBox='0 0 24 24'
    {...props}
  >
    <path d='M0 0h24v24H0z' fill='none' />
    <path
      fill='currentColor'
      d='M21.456 10.154c.123.659.19 1.348.19 2.067c0 5.624-3.764 9.623-9.449 9.623A9.84 9.84 0 0 1 2.353 12a9.84 9.84 0 0 1 9.844-9.844c2.658 0 4.879.978 6.583 2.566l-2.775 2.775V7.49c-1.033-.984-2.344-1.489-3.808-1.489c-3.248 0-5.888 2.744-5.888 5.993s2.64 5.999 5.888 5.999c2.947 0 4.953-1.686 5.365-4h-5.365v-3.839z' />
  </svg>
);
const IconKanban = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><rect width='18' height='10' x='3' y='3' rx='1.5' /><path d='M9 21v-5' /><path d='M15 21v-5' /><path d='M4.5 3v3' /><path d='M19.5 3v3' /><path d='M12 9v3' /></>
  </InlineIcon>
);
const IconLaptop = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><rect width='16' height='10' x='4' y='5' rx='1.5' /><path d='M4 5V3h8v2' /><path d='M16 5h2' /><path d='M10 15v.01' /></>
  </InlineIcon>
);
const IconLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><rect width='6' height='6' x='2' y='8' rx='1' /><rect width='6' height='6' x='16' y='2' rx='1' /><rect width='6' height='6' x='8' y='16' rx='1' /><path d='M6 8h12v2' /><path d='M8 16h8v-2' /></>
  </InlineIcon>
);
const IconDashboard = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <>
      <rect width='7' height='7' x='3' y='3' rx='1' />
      <rect width='7' height='7' x='14' y='3' rx='1' />
      <rect width='7' height='7' x='14' y='14' rx='1' />
      <rect width='7' height='7' x='3' y='14' rx='1' />
    </>
  </InlineIcon>
);
const IconProfile = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='12' cy='8' r='5' /><path d='M20 21a8 8 0 1 0-16 0' /></>
  </InlineIcon>
);
const IconMedia = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M8 4h8v12H8z' /><path d='M16 8h2' /><path d='M3 5h14' /></>
  </InlineIcon>
);
const IconOpenInNew = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='m18 13-3.22 3.22a2 2 0 0 1-2.83 0L9 10.82a2 2 0 0 1 0-2.83l3.22-3.22m0 0a2 2 0 1 1 2.83 2.83' /><path d='M5 3v2a2 2 0 0 0 2 2h10' /><path d='M3 5h18' /></>
  </InlineIcon>
);
const IconPage = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' /><path d='M15 3h6v6' /><path d='m15 21-6-6 6-6' /></>
  </InlineIcon>
);
const IconPlan = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><rect width='16' height='14' x='4' y='3' rx='2' /><path d='M9 3v4' /><path d='M5 8h6' /></>
  </InlineIcon>
);
const IconReview = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='m12 17-5-5 5-5' /><path d='M12 17V8' /><path d='M3 12h4' /><path d='M17 12h4' /></>
  </InlineIcon>
);
const IconPost = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M4 4h16v16H4z' /><path d='M4 8h16' /><path d='M8 12h8' /><path d='M8 16h4' /></>
  </InlineIcon>
);
const IconSurvey = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M4 4h16v16H4z' /><path d='M4 8h16' /><path d='M8 12h8' /><path d='M8 16h4' /></>
  </InlineIcon>
);
const IconWorkspace = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><rect width='20' height='14' x='2' y='8' rx='2' /><path d='M2 16h20' /><path d='M6 8V4h4' /><path d='M10 8V4h4' /></>
  </InlineIcon>
);
const IconWarning = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M12 9v4' /><path d='M12 17h.01' /><path d='M1 12h15' /><path d='m12 4 4 3-4 3' /></>
  </InlineIcon>
);
const IconReport = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><path d='M14 2v6h6' /><path d='M16 14h2' /><path d='M8 10h.01' /><path d='M12 10h.01' /><path d='M9 16h6' /></>
  </InlineIcon>
);
const IconAccount = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='12' cy='8' r='5' /><path d='M20 21a8 8 0 1 0-16 0' /></>
  </InlineIcon>
);
const IconAdd = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M12 5v14' /><path d='M5 12h14' /></>
  </InlineIcon>
);
const IconCollect = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' /><path d='M12 8v8' /><path d='M8 12h8' /></>
  </InlineIcon>
);
const IconChecks = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M2 7l4-3 5 5 4-3 5 5 4-3 4 9' /></>
  </InlineIcon>
);
const IconDot = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='12' cy='12' r='1.5' /></>
  </InlineIcon>
);
const IconDots = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='12' cy='12' r='1' /><circle cx='19' cy='12' r='1' /><circle cx='5' cy='12' r='1' /></>
  </InlineIcon>
);
const IconChevronsDown = (props: InlineIconProps) => (
  <InlineIcon {...props}>
    <><path d='m18 15-6-6-6 6' /><path d='m6 9 6 6 6-6' /></>
  </InlineIcon>
);
const IconChevronUp = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='m18 15-6-6-6 6' /></>
  </InlineIcon>
);
const IconEyeOff = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M3.9 4.2h16.2' /><path d='M12 2a10 10 0 0 0-7.07 17.07' /><path d='M12 2v10' /><path d='M17.95 21.95A10 10 0 1 1 12 7' /></>
  </InlineIcon>
);
const IconFileTypeDoc = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><path d='M14 2v6h6' /><path d='m6 11 3-3 3 3' /><path d='M9 14h6' /></>
  </InlineIcon>
);
const IconFileTypePdf = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M6 2h9a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6z' /><path d='M9 11h6' /><path d='M9 15h3.5' /><path d='m9 5 4 4' /></>
  </InlineIcon>
);
const IconFileTypeXls = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><path d='M14 2v6h6' /><path d='m6 10 3-3 3 3' /><path d='M9 16h6' /><path d='M9 12h6' /></>
  </InlineIcon>
);
const IconPlusCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='12' cy='12' r='10' /><path d='M12 8v8' /><path d='M8 12h8' /></>
  </InlineIcon>
);
const IconSparkles = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z' /></>
  </InlineIcon>
);
const IconSpinner = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M13 12h9' /><path d='M11 12H2m0 7l2-9 5 7-3 3z' /><path d='M2 22h4m12-9l2 9 5-7-3-3z' /></>
  </InlineIcon>
);
const IconText = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M3 12h14' /><path d='M3 6h14' /></>
  </InlineIcon>
);
const IconLogout = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' /><path d='M16 17l5-5-5-5' /><path d='M21 12H9' /></>
  </InlineIcon>
);

const IconTeams = (props: React.SVGProps<SVGSVGElement>) => (
  <InlineIcon {...props}>
    <><circle cx='18' cy='5' r='3' /><circle cx='6' cy='12' r='3' /><circle cx='6' cy='5' r='3' /><circle cx='18' cy='19' r='3' /><circle cx='6' cy='19' r='3' /><path d='M13 12h5' /></>
  </InlineIcon>
);

type AnyIcon = InlineIconComponent;
const _AsAnyIcon = (c: React.ComponentType<React.SVGProps<SVGSVGElement>>) => c as AnyIcon;

export const Icons: Record<string, AnyIcon> = {
  activity: _AsAnyIcon(IconActivity),
  account: IconAccount,
  add: IconAdd,
  dashboard: IconDashboard,
  adjustments: _AsAnyIcon(IconAdjustments),
  adjustmentsVertical: _AsAnyIcon(IconAdjustments),
  alertCircle: _AsAnyIcon(IconAlertCircle),
  analytics: IconAnalytics,
  arrowRight: _AsAnyIcon(IconArrowRight),
  badgeCheck: IconBadgeCheck,
  brightness: _AsAnyIcon(IconBrightness),
  bold: _AsAnyIcon(IconBold),
  calendar: _AsAnyIcon(IconCalendar),
  camera: _AsAnyIcon(IconCamera),
  check: _AsAnyIcon(IconCheck),
  checks: IconChecks,
  chat: IconChat,
  chordUpDownAlt: IconChordUpDownAlt,
  chevronDown: _AsAnyIcon(IconChevronRight),
  chevronLeft: _AsAnyIcon(IconChevronLeft),
  chevronRight: _AsAnyIcon(IconChevronRight),
  chevronsDown: IconChevronsDown,
  chevronsLeft: _AsAnyIcon(IconChevronsLeft),
  chevronsRight: _AsAnyIcon(IconChevronsRight),
  chevronsUpDown: IconChevronsUpDown,
  chevronUp: _AsAnyIcon(IconChevronLeft),
  circleCheck: _AsAnyIcon(IconCircleCheck),
  circleX: _AsAnyIcon(IconCircleX),
  close: IconClose,
  clock: _AsAnyIcon(IconClock),
  collect: IconCollect,
  code: _AsAnyIcon(IconCode),
  creditCard: _AsAnyIcon(IconCreditCard),
  dots: IconDots,
  dot: IconDot,
  edit: _AsAnyIcon(IconEdit),
  ellipsis: IconEllipsis,
  eye: _AsAnyIcon(IconEye),
  eyeOff: IconEyeOff,
  externalLink: _AsAnyIcon(IconExternalLink),
  fileTypeDoc: IconFileTypeDoc,
  fileTypePdf: IconFileTypePdf,
  fileTypeXls: IconFileTypeXls,
  fileZip: _AsAnyIcon(IconFileZip),
  forms: _AsAnyIcon(IconForms),
  galleryVerticalEnd: IconGalleryVerticalEnd,
  github: IconGithub,
  google: IconGoogle,
  gripVertical: _AsAnyIcon(IconGripVertical),
  info: _AsAnyIcon(IconNotification),
  italic: _AsAnyIcon(IconItalic),
  kanban: IconKanban,
  laptop: IconLaptop,
  lock: _AsAnyIcon(IconLock),
  logo: IconLogo,
  logout: IconLogout,
  media: IconMedia,
  minus: IconClose,
  plus: IconAdd,
  music: _AsAnyIcon(IconMusic),
  notification: _AsAnyIcon(IconNotification),
  openInNew: IconOpenInNew,
  page: IconPage,
  palette: _AsAnyIcon(IconPalette),
  profile: IconProfile,
  report: IconReport,
  phone: _AsAnyIcon(IconPhone),
  plan: IconPlan,
  plusCircle: IconPlusCircle,
  post: IconPost,
  review: IconReview,
  search: _AsAnyIcon(IconSearch),
  send: _AsAnyIcon(IconSend),
  share: _AsAnyIcon(IconShare),
  settings: _AsAnyIcon(IconSettings),
  slash: _AsAnyIcon(IconSlash),
  sparkles: IconSparkles,
  spinner: IconSpinner,
  survey: IconSurvey,
  text: IconText,
  teams: IconTeams,
  trash: _AsAnyIcon(IconTrash),
  trendingDown: _AsAnyIcon(IconTrendingDown),
  trendingUp: _AsAnyIcon(IconTrendingUp),
  underline: _AsAnyIcon(IconUnderline),
  upload: _AsAnyIcon(IconUpload),
  user: _AsAnyIcon(IconUser),
  users: _AsAnyIcon(IconUsers),
  video: _AsAnyIcon(IconVideo),
  warning: IconWarning,
  workspace: IconWorkspace,
  x: IconClose,
  xCircle: _AsAnyIcon(IconCircleX),
  xSquare: _AsAnyIcon(IconCircleX),
};

export type Icon = keyof typeof Icons;
