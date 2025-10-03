'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import type { Recommendation, User } from '../types';
import { useApp } from '../context/AppContext';
import { useDefaultTipAmount } from '../hooks/useDefaultTipAmount';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onCuratorClick: (address: string) => void;
}

export function RecommendationCard({ recommendation, onCuratorClick }: RecommendationCardProps) {
  const { users, getUserOrCreate, tipRecommendation } = useApp();
  const { defaultTipAmount } = useDefaultTipAmount();
  const { address, isConnected } = useAccount();

  const [curator, setCurator] = useState<User | null>(null);
  const [isTipping, setIsTipping] = useState(false);
  const [tipFeedback, setTipFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchCurator = async () => {
      const normalizedAddress = recommendation.curatorAddress.toLowerCase();

      if (users.has(normalizedAddress)) {
        setCurator(users.get(normalizedAddress) ?? null);
        return;
      }

      try {
        const user = await getUserOrCreate(recommendation.curatorAddress);
        setCurator(user);
      } catch (error) {
        console.error('Error fetching curator:', error);
        setCurator(null);
      }
    };

    fetchCurator();
  }, [recommendation.curatorAddress, users, getUserOrCreate]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleTip = async () => {
    if (!address || !isConnected) {
      setTipFeedback({ type: 'error', message: 'Connect your wallet to tip.' });
      return;
    }

    if (address.toLowerCase() === recommendation.curatorAddress.toLowerCase()) {
      setTipFeedback({ type: 'error', message: "You can't tip your own recommendation." });
      return;
    }

    const amount = Math.max(1, defaultTipAmount);

    setIsTipping(true);
    setTipFeedback(null);

    const success = await tipRecommendation(recommendation.id, amount, address);

    setIsTipping(false);

    if (!success) {
      setTipFeedback({ type: 'error', message: 'Insufficient token balance.' });
      return;
    }

    setTipFeedback({
      type: 'success',
      message: `Tipped ${amount} token${amount === 1 ? '' : 's'}.`,
    });

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setTipFeedback(null);
    }, 2500);
  };

  const displayName = curator?.farcasterUsername
    ? `@${curator.farcasterUsername}`
    : curator?.username ?? 'Loading…';

  return (
    <div className="panel-surface transition-transform hover:-translate-y-1">
      <div className="panel-content px-8 py-7 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-[rgba(17,17,17,0.35)] bg-white/70 shadow-inner">
              {curator?.farcasterPfpUrl ? (
                <Image
                  src={curator.farcasterPfpUrl}
                  alt={curator.farcasterUsername || curator?.username || 'Curator avatar'}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-ink-soft">
                  ♪
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => onCuratorClick(recommendation.curatorAddress)}
                className="text-xs uppercase tracking-[0.25em] text-ink-soft transition-colors hover:text-ink"
              >
                {displayName}
              </button>
              <p className="mt-1 text-lg font-semibold text-ink">
                {recommendation.songTitle}
              </p>
            </div>
          </div>
          <span className="text-[0.65rem] uppercase tracking-[0.35em] text-ink-soft">
            {formatTimestamp(recommendation.timestamp)}
          </span>
        </div>

        <p className="text-sm text-ink-soft">
          {recommendation.artist}
          {recommendation.album ? ` • ${recommendation.album}` : ''}
        </p>

        <p className="text-base leading-relaxed text-ink">
          {recommendation.review}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="pill-tag pill-tag--accent">{recommendation.genre}</span>
          {recommendation.moods.map((mood) => (
            <span key={mood} className="pill-tag">
              {mood}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-[rgba(17,17,17,0.25)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <a
              href={recommendation.musicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost px-6 py-2 text-sm"
            >
              Listen
            </a>
            <div className="flex items-center gap-4">
              <span className="text-sm text-ink-soft">
                Tips
                <span className="ml-2 font-bold text-ink">{recommendation.tipCount}</span>
              </span>
              <button
                onClick={handleTip}
                className="btn-pastel flex items-center gap-2 px-6 py-2 text-sm"
                disabled={isTipping}
              >
                {isTipping ? 'Tipping…' : 'Tip'}
              </button>
            </div>
          </div>

          {tipFeedback && (
            <p
              className={`text-xs font-medium ${
                tipFeedback.type === 'error' ? 'text-[#d24b6a]' : 'text-[#1f7a5d]'
              }`}
            >
              {tipFeedback.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
