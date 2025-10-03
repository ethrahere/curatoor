'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useApp } from '../context/AppContext';
import { MOODS } from '../types';
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
      <div className="fixed inset-0 backdrop-dream flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="modal-surface max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content px-8 py-10 space-y-6 text-center">
            <h2 className="text-2xl font-semibold text-ink">Connect Wallet to Share Music</h2>
            <p className="text-sm text-ink-soft">
              You need to connect your wallet to share music recommendations.
            </p>
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
            <button
              onClick={onClose}
              className="btn-ghost w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 backdrop-dream flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="modal-surface max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content px-8 py-10 text-center space-y-4">
            <div className="text-5xl">🎵</div>
            <h2 className="text-2xl font-semibold text-ink">Posted!</h2>
            <p className="text-sm text-ink-soft">
              Your recommendation is live for the community.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 backdrop-dream flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="modal-surface my-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content px-8 py-10">
          <h2 className="mb-6 text-2xl font-semibold text-ink">Share Music</h2>

          {error && (
            <div className="mb-6 rounded-2xl border border-[#ff8fad] bg-[#ffe6ef] px-4 py-3 text-sm text-ink">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
                Music URL <span className="text-ink">*</span>
              </label>
              <input
                type="url"
                value={musicUrl}
                onChange={(e) => {
                  setMusicUrl(e.target.value);
                  setError('');
                }}
                placeholder="https://music.youtube.com/..."
                className="input-shell mt-2"
                required
              />
              <p className="mt-2 text-xs text-ink-soft">
                YouTube Music, Spotify, Apple Music, or SoundCloud
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
                Review / Context <span className="text-ink">*</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => {
                  setReview(e.target.value);
                  setError('');
                }}
                placeholder="Why do you love this track? (2-3 sentences)"
                maxLength={MAX_REVIEW_LENGTH}
                rows={4}
                className="input-shell mt-2 resize-none"
                required
              />
              <p className="mt-2 text-right text-xs text-ink-soft">
                {review.length}/{MAX_REVIEW_LENGTH}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
                Mood Tags (max 2)
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {MOODS.map((mood) => {
                  const selected = selectedMoods.includes(mood);
                  const disabled = selectedMoods.length >= 2 && !selected;
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => toggleMood(mood)}
                      disabled={disabled}
                      className={`pill-tag transition-transform ${
                        selected ? 'pill-tag--accent shadow-md scale-105' : 'hover:-translate-y-0.5 hover:shadow-md'
                      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-pastel flex-1 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
