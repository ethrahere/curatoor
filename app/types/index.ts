export interface Recommendation {
  id: string;
  curatorAddress: string;
  musicUrl: string;
  songTitle: string;
  artist: string;
  album?: string;
  review: string;
  genre: string;
  moods: string[];
  tipCount: number;
  timestamp: number;
  frameUrl: string;
}

export interface User {
  address: string;
  username: string;
  tokenBalance: number;
  totalTipsReceived: number;
  recommendationCount: number;
  farcasterUsername?: string;
  farcasterDisplayName?: string;
  farcasterFid?: number;
  farcasterPfpUrl?: string;
}

export const GENRES = [
  'Electronic',
  'Hip-Hop',
  'Rock',
  'Jazz',
  'Indie',
  'Pop',
  'Classical',
  'Other',
] as const;

export const MOODS = [
  'Chill',
  'Energetic',
  'Melancholic',
  'Happy',
  'Focus',
] as const;

export type Genre = (typeof GENRES)[number];
export type Mood = (typeof MOODS)[number];

export const INITIAL_TOKEN_BALANCE = 500;
