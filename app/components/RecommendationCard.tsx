'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import type { Recommendation, User } from '../types';
import { useApp } from '../context/AppContext';
import { useDefaultTipAmount } from '../hooks/useDefaultTipAmount';
import { useFarcasterAuth, type FarcasterAuthUser } from '../hooks/useFarcasterAuth';

const signerStatusCache = new Map<string, boolean>();

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
  const [isSharing, setIsSharing] = useState(false);
  const { user: farcasterAuthUser, isAuthenticated, login, isLoading: farcasterAuthLoading } = useFarcasterAuth();

  useEffect(() => {
    const fetchCurator = async () => {
      const normalizedAddress = recommendation.curatorAddress.toLowerCase();

      if (users.has(normalizedAddress)) {
        setCurator(users.get(normalizedAddress) ?? null);
        return;
      }

      try {
        const fetchedUser = await getUserOrCreate(recommendation.curatorAddress);
        setCurator(fetchedUser);
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
  const ensureSignerReady = async (farcasterUser: FarcasterAuthUser | null) => {
    if (!farcasterUser?.fid) {
      throw new Error('Farcaster fid unavailable. Please relogin in Warpcast.');
    }

    const addressToUse = farcasterUser.address;
    const cacheKey = addressToUse.toLowerCase();

    if (signerStatusCache.get(cacheKey)) {
      return;
    }

    const statusResponse = await fetch(`/api/signer/status?address=${encodeURIComponent(addressToUse)}`);

    if (statusResponse.ok) {
      const statusBody = await statusResponse.json().catch(() => null);
      if (statusBody?.confirmed) {
        signerStatusCache.set(cacheKey, true);
        return;
      }
    } else if (statusResponse.status !== 404) {
      const statusBody = await statusResponse.json().catch(() => null);
      const statusMessage = statusBody?.message ?? 'Failed to check signer status.';
      throw new Error(statusMessage);
    }

    const confirmPayload = {
      address: addressToUse,
      fid: farcasterUser.fid,
    };

    const confirm = async () =>
      fetch('/api/signer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmPayload),
      });

    let confirmResponse = await confirm();

    if (confirmResponse.ok) {
      signerStatusCache.set(cacheKey, true);
      return;
    }

    if (confirmResponse.status === 400) {
      const requestResponse = await fetch('/api/signer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressToUse }),
      });

      if (!requestResponse.ok) {
        const body = await requestResponse.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to prepare Farcaster signer.');
      }

      const requestBody = await requestResponse.json().catch(() => null);
      if (requestBody?.deepLink) {
        await sdk.actions.openUrl({ url: requestBody.deepLink });
      }

      confirmResponse = await confirm();
      if (confirmResponse.ok) {
        signerStatusCache.set(cacheKey, true);
        return;
      }
    }

    const errorBody = await confirmResponse.json().catch(() => null);
    const errorMessage = errorBody?.message ?? 'Signer confirmation failed.';
    throw new Error(errorMessage);
  };


  const handleShare = async () => {
    if (isSharing || farcasterAuthLoading) return;

    try {
      let farcasterUser = farcasterAuthUser;

      if (!isAuthenticated) {
        farcasterUser = await login();
        if (!farcasterUser) {
          setTipFeedback({ type: 'error', message: 'Farcaster login required to share.' });
          return;
        }
      }

      if (!farcasterUser) {
        setTipFeedback({ type: 'error', message: 'Farcaster session unavailable.' });
        return;
      }

      setIsSharing(true);
      setTipFeedback(null);

      try {
        await ensureSignerReady(farcasterUser);
      } catch (signerError) {
        const message = signerError instanceof Error ? signerError.message : 'Signer setup failed.';
        setTipFeedback({ type: 'error', message });
        return;
      }

      const response = await fetch('/api/farcaster/cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recommendationId: recommendation.id }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.message ?? 'Share failed.';
        throw new Error(message);
      }

      setTipFeedback({ type: 'success', message: 'Cast published to Farcaster.' });
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setTipFeedback(null);
      }, 2500);
    } catch (error) {
      console.error('Share failed:', error);
      const message = error instanceof Error ? error.message : 'Share failed.';
      setTipFeedback({ type: 'error', message });
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setTipFeedback(null);
      }, 3000);
    } finally {
      setIsSharing(false);
    }
  };


  const displayName = curator?.farcasterUsername
    ? `@${curator.farcasterUsername}`
    : curator?.username ?? 'Loading…';

  return (
    <div className="panel-surface transition-transform hover:-translate-y-1">
      <div className="panel-content px-6 py-5 space-y-4">
        {/* Header: Curator info and timestamp */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => onCuratorClick(recommendation.curatorAddress)}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-[rgba(17,17,17,0.35)] bg-white/70 shadow-inner">
              {curator?.farcasterPfpUrl ? (
                <Image
                  src={curator.farcasterPfpUrl}
                  alt={curator.farcasterUsername || curator?.username || 'Curator avatar'}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-soft">
                  ♪
                </div>
              )}
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              {displayName}
            </span>
          </button>
          <span className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-soft whitespace-nowrap">
            {formatTimestamp(recommendation.timestamp)}
          </span>
        </div>

        {/* Song title and artist */}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-ink leading-tight">
            {recommendation.songTitle}
          </h3>
          <p className="text-sm text-ink-soft">
            {recommendation.artist}
            {recommendation.album ? ` • ${recommendation.album}` : ''}
          </p>
        </div>

        {/* Review text */}
        <p className="text-[0.9375rem] leading-relaxed text-ink">
          {recommendation.review}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="pill-tag pill-tag--accent">{recommendation.genre}</span>
          {recommendation.moods.map((mood) => (
            <span key={mood} className="pill-tag">
              {mood}
            </span>
          ))}
        </div>

        {/* Actions bar */}
        <div className="flex flex-col gap-2 border-t border-[rgba(17,17,17,0.2)] pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <a
                href={recommendation.musicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Listen
              </a>
              <button
                type="button"
                onClick={handleShare}
                className="btn-ghost px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSharing}
              >
                {isSharing ? 'Sharing…' : 'Share'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">{recommendation.tipCount}</span> tips
              </span>
              <button
                onClick={handleTip}
                className="btn-pastel flex items-center gap-2 px-3 py-1.5 text-xs"
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
