'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Recommendation, User } from '../types';
import { INITIAL_TOKEN_BALANCE } from '../types';
import { supabase } from '../lib/supabase';

type RecommendationRow = {
  id: string;
  curator_address: string;
  music_url: string;
  song_title: string;
  artist: string;
  album: string | null;
  review: string;
  genre: string;
  moods: string[] | null;
  tip_count: number;
  created_at: string;
};

type UserRow = {
  address: string;
  username: string;
  token_balance: number;
  total_tips_received: number;
  recommendation_count: number;
  farcaster_username: string | null;
  farcaster_display_name: string | null;
  farcaster_fid: number | null;
  farcaster_pfp_url: string | null;
};

type UserUpdateColumns = Partial<Pick<UserRow, 'token_balance' | 'total_tips_received' | 'recommendation_count'>>;

interface FarcasterData {
  farcasterUsername?: string;
  farcasterDisplayName?: string;
  farcasterFid?: number;
  farcasterPfpUrl?: string;
}

interface AppContextType {
  recommendations: Recommendation[];
  users: Map<string, User>;
  addRecommendation: (recommendation: Omit<Recommendation, 'id' | 'timestamp' | 'tipCount' | 'frameUrl'>) => Promise<Recommendation>;
  tipRecommendation: (recommendationId: string, amount: number, tipperAddress: string) => Promise<boolean>;
  getUserOrCreate: (address: string, farcasterData?: FarcasterData) => Promise<User>;
  updateUser: (address: string, updates: Partial<User>) => Promise<void>;
  loading: boolean;
}

const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://myapp.com';

// Generate username from address
function generateUsername(address: string): string {
  const adjectives = ['Cool', 'Happy', 'Swift', 'Bright', 'Lucky', 'Smart', 'Bold', 'Wild', 'Calm', 'Kind'];
  const nouns = ['Panda', 'Tiger', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Lion', 'Hawk', 'Owl', 'Lynx'];

  // Use address to deterministically pick adjective and noun
  const adjectiveIndex = parseInt(address.slice(2, 4), 16) % adjectives.length;
  const nounIndex = parseInt(address.slice(-2), 16) % nouns.length;
  const number = parseInt(address.slice(4, 7), 16) % 1000;

  return `${adjectives[adjectiveIndex]}${nouns[nounIndex]}${number}`;
}

function mapUserRow(row: UserRow): User {
  return {
    address: row.address,
    username: row.username,
    tokenBalance: row.token_balance,
    totalTipsReceived: row.total_tips_received,
    recommendationCount: row.recommendation_count,
    farcasterUsername: row.farcaster_username ?? undefined,
    farcasterDisplayName: row.farcaster_display_name ?? undefined,
    farcasterFid: row.farcaster_fid ?? undefined,
    farcasterPfpUrl: row.farcaster_pfp_url ?? undefined,
  };
}

function mapRecommendationRow(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    curatorAddress: row.curator_address,
    musicUrl: row.music_url,
    songTitle: row.song_title,
    artist: row.artist,
    album: row.album ?? undefined,
    review: row.review,
    genre: row.genre,
    moods: row.moods ?? [],
    tipCount: row.tip_count ?? 0,
    timestamp: new Date(row.created_at).getTime(),
    frameUrl: `${APP_BASE_URL}/api/frame/${row.id}`,
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch recommendations from Supabase on mount
  useEffect(() => {
    fetchRecommendations();

    // Subscribe to realtime changes
    const recommendationsChannel = supabase
      .channel('recommendations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recommendations' }, () => {
        fetchRecommendations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(recommendationsChannel);
    };
  }, []);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as RecommendationRow[];
      const formattedRecs: Recommendation[] = rows.map(mapRecommendationRow);

      setRecommendations(formattedRecs);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserOrCreate = async (address: string, farcasterData?: FarcasterData): Promise<User> => {
    const normalizedAddress = address.toLowerCase();

    if (users.has(normalizedAddress)) {
      return users.get(normalizedAddress)!;
    }

    try {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('address', normalizedAddress)
        .maybeSingle();

      if (error) throw error;

      const userRow = existingUser as UserRow | null;

      if (userRow) {
        const user = mapUserRow(userRow);

        if (
          farcasterData &&
          (
            farcasterData.farcasterUsername !== user.farcasterUsername ||
            farcasterData.farcasterFid !== user.farcasterFid ||
            farcasterData.farcasterDisplayName !== user.farcasterDisplayName ||
            farcasterData.farcasterPfpUrl !== user.farcasterPfpUrl
          )
        ) {
          await supabase
            .from('users')
            .update({
              farcaster_username: farcasterData.farcasterUsername,
              farcaster_display_name: farcasterData.farcasterDisplayName,
              farcaster_fid: farcasterData.farcasterFid,
              farcaster_pfp_url: farcasterData.farcasterPfpUrl,
            })
            .eq('address', normalizedAddress);

          user.farcasterUsername = farcasterData.farcasterUsername;
          user.farcasterDisplayName = farcasterData.farcasterDisplayName;
          user.farcasterFid = farcasterData.farcasterFid;
          user.farcasterPfpUrl = farcasterData.farcasterPfpUrl;
        }

        const newUsers = new Map(users);
        newUsers.set(normalizedAddress, user);
        setUsers(newUsers);

        return user;
      }

      const newUser: User = {
        address: normalizedAddress,
        username: generateUsername(normalizedAddress),
        tokenBalance: INITIAL_TOKEN_BALANCE,
        totalTipsReceived: 0,
        recommendationCount: 0,
        ...farcasterData,
      };

      const { error: insertError } = await supabase.from('users').insert({
        address: normalizedAddress,
        username: newUser.username,
        token_balance: newUser.tokenBalance,
        total_tips_received: 0,
        recommendation_count: 0,
        farcaster_username: farcasterData?.farcasterUsername ?? null,
        farcaster_display_name: farcasterData?.farcasterDisplayName ?? null,
        farcaster_fid: farcasterData?.farcasterFid ?? null,
        farcaster_pfp_url: farcasterData?.farcasterPfpUrl ?? null,
      });

      if (insertError) throw insertError;

      const newUsersMap = new Map(users);
      newUsersMap.set(normalizedAddress, newUser);
      setUsers(newUsersMap);

      return newUser;
    } catch (error) {
      console.error('Error getting/creating user:', error);
      const defaultUser: User = {
        address: normalizedAddress,
        username: generateUsername(normalizedAddress),
        tokenBalance: INITIAL_TOKEN_BALANCE,
        totalTipsReceived: 0,
        recommendationCount: 0,
        ...farcasterData,
      };
      return defaultUser;
    }
  };

  const updateUser = async (address: string, updates: Partial<User>) => {
    const normalizedAddress = address.toLowerCase();

    try {
      const dbUpdates: UserUpdateColumns = {};
      if (updates.tokenBalance !== undefined) dbUpdates.token_balance = updates.tokenBalance;
      if (updates.totalTipsReceived !== undefined) dbUpdates.total_tips_received = updates.totalTipsReceived;
      if (updates.recommendationCount !== undefined) dbUpdates.recommendation_count = updates.recommendationCount;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(dbUpdates)
          .eq('address', normalizedAddress);

        if (error) throw error;
      }

      const user = await getUserOrCreate(normalizedAddress);
      const newUsers = new Map(users);
      newUsers.set(normalizedAddress, { ...user, ...updates });
      setUsers(newUsers);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const addRecommendation = async (recommendation: Omit<Recommendation, 'id' | 'timestamp' | 'tipCount' | 'frameUrl'>) => {
    try {
      const { data: insertedRow, error } = await supabase
        .from('recommendations')
        .insert({
          curator_address: recommendation.curatorAddress.toLowerCase(),
          music_url: recommendation.musicUrl,
          song_title: recommendation.songTitle,
          artist: recommendation.artist,
          album: recommendation.album,
          review: recommendation.review,
          genre: recommendation.genre,
          moods: recommendation.moods,
          tip_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      if (!insertedRow) throw new Error('Recommendation insert did not return a row.');

      const formattedRecommendation = mapRecommendationRow(insertedRow as RecommendationRow);

      // Update user's recommendation count
      const user = await getUserOrCreate(recommendation.curatorAddress);
      await updateUser(recommendation.curatorAddress, {
        recommendationCount: user.recommendationCount + 1,
      });

      // Refresh recommendations
      await fetchRecommendations();
      return formattedRecommendation;
    } catch (error) {
      console.error('Error adding recommendation:', error);
      throw error;
    }
  };

  const tipRecommendation = async (recommendationId: string, amount: number, tipperAddress: string): Promise<boolean> => {
    try {
      const recommendation = recommendations.find(r => r.id === recommendationId);
      if (!recommendation) return false;

      const tipper = await getUserOrCreate(tipperAddress);

      // Check if tipper has enough tokens
      if (tipper.tokenBalance < amount) {
        return false;
      }

      const curator = await getUserOrCreate(recommendation.curatorAddress);

      // Insert tip record
      const { error: tipError } = await supabase.from('tips').insert({
        recommendation_id: recommendationId,
        tipper_address: tipperAddress,
        curator_address: recommendation.curatorAddress,
        amount: amount,
      });

      if (tipError) throw tipError;

      // Update tipper's balance
      await updateUser(tipperAddress, {
        tokenBalance: tipper.tokenBalance - amount,
      });

      // Update curator's balance and total tips received
      await updateUser(recommendation.curatorAddress, {
        tokenBalance: curator.tokenBalance + amount,
        totalTipsReceived: curator.totalTipsReceived + amount,
      });

      // Update recommendation's tip count
      const { error: recError } = await supabase
        .from('recommendations')
        .update({ tip_count: recommendation.tipCount + amount })
        .eq('id', recommendationId);

      if (recError) throw recError;

      // Refresh recommendations
      await fetchRecommendations();

      return true;
    } catch (error) {
      console.error('Error tipping recommendation:', error);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        recommendations,
        users,
        addRecommendation,
        tipRecommendation,
        getUserOrCreate,
        updateUser,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
