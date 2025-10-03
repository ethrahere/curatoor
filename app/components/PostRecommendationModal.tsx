'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useApp } from '../context/AppContext';
import { GENRES, MOODS } from '../types';
import type { Genre, Mood } from '../types';

interface PostRecommendationModalProps {
  onClose: () => void;
}

export function PostRecommendationModal({ onClose }: PostRecommendationModalProps) {
  const { address, isConnected } = useAccount();
  const { addRecommendation } = useApp();

  const [musicUrl, setMusicUrl] = useState('');
  const [review, setReview] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const MAX_REVIEW_LENGTH = 280;

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const toggleMood = (mood: Mood) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else {
      if (selectedMoods.length < 2) {
        setSelectedMoods([...selectedMoods, mood]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!musicUrl.trim()) {
      setError('Music URL is required');
      return;
    }

    if (!isValidUrl(musicUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    if (!review.trim()) {
      setError('Review is required');
      return;
    }

    if (review.length > MAX_REVIEW_LENGTH) {
      setError(`Review must be ${MAX_REVIEW_LENGTH} characters or less`);
      return;
    }

    setLoading(true);

    // Fetch metadata from URL
    try {
      // First, ensure user exists in database
      const { getUserOrCreate } = await import('../context/AppContext');
      const { supabase } = await import('../lib/supabase');

      // Check if user exists, create if not
      const { data: existingUser } = await supabase
        .from('users')
        .select('address')
        .eq('address', address.toLowerCase())
        .single();

      if (!existingUser) {
        // User doesn't exist, create them first
        const adjectives = ['Cool', 'Happy', 'Swift', 'Bright', 'Lucky', 'Smart', 'Bold', 'Wild', 'Calm', 'Kind'];
        const nouns = ['Panda', 'Tiger', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Lion', 'Hawk', 'Owl', 'Lynx'];
        const adjectiveIndex = parseInt(address.slice(2, 4), 16) % adjectives.length;
        const nounIndex = parseInt(address.slice(-2), 16) % nouns.length;
        const number = parseInt(address.slice(4, 7), 16) % 1000;
        const username = `${adjectives[adjectiveIndex]}${nouns[nounIndex]}${number}`;

        await supabase.from('users').insert({
          address: address.toLowerCase(),
          username: username,
          token_balance: 1000,
          total_tips_received: 0,
          recommendation_count: 0,
        });
      }

      const metadata = await fetchMusicMetadata(musicUrl.trim());

      await addRecommendation({
        curatorAddress: address,
        musicUrl: musicUrl.trim(),
        songTitle: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        review: review.trim(),
        genre: 'Electronic' as Genre,
        moods: selectedMoods,
      });

      setSuccess(true);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Post recommendation error:', error);
      setError('Failed to post recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|music\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const getYouTubeMetadata = async (url: string) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube metadata');
    }

    const data = await response.json();

    // Parse title to extract song and artist
    // YouTube titles are often in format "Artist - Song Title" or "Song Title - Artist"
    const title = data.title;
    const author = data.author_name;

    let songTitle = title;
    let artist = author;

    // Try to parse "Artist - Song" or "Song - Artist" format
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        songTitle = parts[1].trim();
        artist = parts[0].trim();
      }
    }

    return {
      title: songTitle,
      artist: artist,
      album: undefined,
    };
  };

  const fetchMusicMetadata = async (url: string) => {
    const urlLower = url.toLowerCase();

    // Fetch from YouTube/YouTube Music URLs
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return await getYouTubeMetadata(url);
    }

    // Extract from Spotify URLs (placeholder for now)
    if (urlLower.includes('spotify.com')) {
      return {
        title: 'Spotify Track',
        artist: 'Unknown Artist',
        album: undefined,
      };
    }

    // Default fallback
    return {
      title: 'Music Track',
      artist: 'Unknown Artist',
      album: undefined,
    };
  };

  if (!isConnected || !address) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-content2 rounded-lg p-6 max-w-md w-full border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4 text-foreground">Connect Wallet to Share Music</h2>
          <p className="text-foreground/70 mb-6">
            You need to connect your wallet to share music recommendations.
          </p>
          <div className="flex justify-center mb-4">
            <ConnectWallet />
          </div>
          <button
            onClick={onClose}
            className="w-full bg-content3 hover:bg-content4 text-foreground border-2 border-content4 hover:border-foreground/30 px-4 py-2 rounded-lg transition-all font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-content2 rounded-lg p-6 max-w-md w-full text-center border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold text-success mb-2">
            Posted!
          </h2>
          <p className="text-foreground/70">
            Your recommendation has been shared
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-content2 rounded-lg p-6 max-w-md w-full my-8 border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-foreground">Share Music</h2>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/30 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Music URL <span className="text-danger">*</span>
            </label>
            <input
              type="url"
              value={musicUrl}
              onChange={(e) => setMusicUrl(e.target.value)}
              placeholder="https://music.youtube.com/..."
              className="w-full px-4 py-2 border-2 border-content4 rounded-lg bg-white text-black placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <p className="text-xs text-foreground/50 mt-1">
              YouTube Music, Spotify, Apple Music, or SoundCloud
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Review/Context <span className="text-danger">*</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Why do you love this track? (2-3 sentences)"
              maxLength={MAX_REVIEW_LENGTH}
              rows={4}
              className="w-full px-4 py-2 border-2 border-content4 rounded-lg bg-white text-black placeholder:text-gray-500 resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <p className="text-xs text-foreground/50 mt-1 text-right">
              {review.length}/{MAX_REVIEW_LENGTH}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Mood Tags (max 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => toggleMood(mood)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all border-2 ${
                    selectedMoods.includes(mood)
                      ? 'bg-primary border-primary text-primary-foreground shadow-lg scale-105'
                      : 'bg-content3 border-content4 text-foreground hover:bg-content4 hover:border-primary/50'
                  } ${selectedMoods.length >= 2 && !selectedMoods.includes(mood) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={selectedMoods.length >= 2 && !selectedMoods.includes(mood)}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-content3 hover:bg-content4 text-foreground border-2 border-content4 hover:border-foreground/30 px-4 py-2 rounded-lg transition-all min-h-[44px] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary-600 text-primary-foreground border-2 border-primary px-4 py-2 rounded-lg font-bold transition-all min-h-[44px] shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
