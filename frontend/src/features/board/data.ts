export type BoardProduct = {
  id: string;
  rank: number;
  name: string;
  description: string;
  maker: string;
  makerHandle: string;
  category: string;
  amount: number;
  backers: number;
  upvotes: number;
  logoColor: string;
  logoInitials: string;
  makerColor: string;
};

export type BoardMaker = {
  name: string;
  handle: string;
  backed: number;
  color: string;
};

export const BOARD_STATS = {
  totalEtb: 15843,
  fans: 33,
  makers: 30
};

export const SORT_OPTIONS = [
  { id: 'backed', label: 'Most backed' },
  { id: 'upvoted', label: 'Most upvoted' },
  { id: 'new', label: 'Newest' }
] as const;

export const KIND_OPTIONS = [
  { id: 'all', label: 'Everything' },
  { id: 'product', label: 'Products' },
  { id: 'creative', label: 'Creative work' }
] as const;

export const CATEGORIES = [
  'All',
  'AI',
  'APIs',
  'Business',
  'Commerce',
  'Data',
  'Design',
  'Dev tools',
  'DevOps',
  'Education',
  'Finance',
  'Gaming',
  'Health',
  'Marketing',
  'No-code',
  'Productivity',
  'Security',
  'Branding',
  'Product design',
  'Illustration',
  'Photography',
  'Music',
  'Writing',
  'Film',
  'Animation',
  'Fashion',
  'Crafts'
] as const;

export const PRODUCTS: BoardProduct[] = [
  {
    id: 'scholarxiv',
    rank: 1,
    name: 'ScholarXIV',
    description: 'Autonomous Research Agents',
    maker: 'Dagmawi Esayas',
    makerHandle: 'dagmawibabi',
    category: 'AI',
    amount: 5079,
    backers: 9,
    upvotes: 26,
    logoColor: '#1a1a2e',
    logoInitials: 'SX',
    makerColor: '#c45c26'
  },
  {
    id: 'veritas',
    rank: 2,
    name: 'Veritas',
    description: 'One API to verify payments across Ethiopia. Formerly verify.leul.et',
    maker: 'Leul Zenebe',
    makerHandle: 'leul',
    category: 'APIs',
    amount: 3000,
    backers: 4,
    upvotes: 12,
    logoColor: '#0f766e',
    logoInitials: 'V',
    makerColor: '#2563eb'
  },
  {
    id: 'odit',
    rank: 3,
    name: 'Odit',
    description: 'Manage exactly where you spend your finances all automatically from…',
    maker: 'Robi',
    makerHandle: 'robi',
    category: 'Finance',
    amount: 2950,
    backers: 7,
    upvotes: 11,
    logoColor: '#7c3aed',
    logoInitials: 'O',
    makerColor: '#db2777'
  },
  {
    id: 'totals',
    rank: 4,
    name: 'Totals',
    description: 'A personal finance app built for Ethiopian bank users.',
    maker: 'Totals',
    makerHandle: 'totals',
    category: 'Finance',
    amount: 1652,
    backers: 5,
    upvotes: 8,
    logoColor: '#0369a1',
    logoInitials: 'T',
    makerColor: '#0891b2'
  },
  {
    id: 'links-et',
    rank: 5,
    name: 'links.et',
    description: 'Trust and verification, for 17+ banks & providers.',
    maker: 'Robi',
    makerHandle: 'robi',
    category: 'APIs',
    amount: 1650,
    backers: 1,
    upvotes: 7,
    logoColor: '#15803d',
    logoInitials: 'L',
    makerColor: '#db2777'
  },
  {
    id: 'veritas-api',
    rank: 6,
    name: 'Veritas API',
    description: 'The original open-source payment verifier for Ethiopia. Formerly…',
    maker: 'Leul Zenebe',
    makerHandle: 'leul',
    category: 'APIs',
    amount: 1000,
    backers: 1,
    upvotes: 9,
    logoColor: '#0f766e',
    logoInitials: 'VA',
    makerColor: '#2563eb'
  },
  {
    id: 'launchpot',
    rank: 7,
    name: 'Launchpot',
    description: 'Launchpot is a launch board where products are ranked by what their…',
    maker: 'Ken',
    makerHandle: 'ken',
    category: 'Business',
    amount: 403,
    backers: 4,
    upvotes: 15,
    logoColor: '#c6f432',
    logoInitials: 'LP',
    makerColor: '#111210'
  },
  {
    id: 'softship',
    rank: 8,
    name: 'Softship',
    description: 'Softship is an Ethiopian software marketplace based in Addis Ababa…',
    maker: 'Ephrem Mandefro',
    makerHandle: 'ephrem',
    category: 'Marketing',
    amount: 101,
    backers: 1,
    upvotes: 5,
    logoColor: '#ea580c',
    logoInitials: 'S',
    makerColor: '#b45309'
  },
  {
    id: 'equb',
    rank: 9,
    name: 'Equb Manager',
    description: 'Equb Manager is a digital platform for Equb organizers to manage…',
    maker: 'አቶ codes',
    makerHandle: 'atocodes',
    category: 'Business',
    amount: 10,
    backers: 1,
    upvotes: 13,
    logoColor: '#be123c',
    logoInitials: 'EM',
    makerColor: '#9f1239'
  },
  {
    id: 'rory',
    rank: 10,
    name: 'Rory',
    description: 'Rory is a social productivity app that helps you lock in, stay…',
    maker: 'Yeab Noah',
    makerHandle: 'yeab',
    category: 'Productivity',
    amount: 0,
    backers: 0,
    upvotes: 11,
    logoColor: '#4f46e5',
    logoInitials: 'R',
    makerColor: '#4338ca'
  },
  {
    id: 'sma',
    rank: 11,
    name: 'sma.et | sma.robi.work',
    description: 'Send messages anonymously',
    maker: 'Robi',
    makerHandle: 'robi',
    category: 'Productivity',
    amount: 0,
    backers: 0,
    upvotes: 8,
    logoColor: '#334155',
    logoInitials: 'sm',
    makerColor: '#db2777'
  },
  {
    id: 'veloxdb',
    rank: 12,
    name: 'veloxdb',
    description: 'Database client that feels fast and clean',
    maker: 'Abenezer Asefa',
    makerHandle: 'abenezer',
    category: 'Dev tools',
    amount: 0,
    backers: 0,
    upvotes: 8,
    logoColor: '#0ea5e9',
    logoInitials: 'vx',
    makerColor: '#0284c7'
  }
];

export const TOP_MAKERS: BoardMaker[] = [
  { name: 'Dagmawi Esayas', handle: 'dagmawibabi', backed: 5079, color: '#c45c26' },
  { name: 'Robi', handle: 'robi', backed: 4600, color: '#db2777' },
  { name: 'Leul Zenebe', handle: 'leul', backed: 4000, color: '#2563eb' },
  { name: 'Totals', handle: 'totals', backed: 1652, color: '#0891b2' }
];

export function formatEtb(n: number): string {
  return `${n.toLocaleString('en-US')} ETB`;
}
