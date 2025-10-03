'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useApp } from '../context/AppContext';
import { useAccount } from 'wagmi';
import type { User } from '../types';
import { useDefaultTipAmount } from '../hooks/useDefaultTipAmount';

interface UserProfileModalProps {
  address: string;
  onClose: () => void;
}

export function UserProfileModal({ address, onClose }: UserProfileModalProps) {
  const { recommendations, users, getUserOrCreate } = useApp();
  const { address: connectedAddress } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const { defaultTipAmount, setDefaultTipAmount } = useDefaultTipAmount();
  const [tipInput, setTipInput] = useState<string>(String(defaultTipAmount));
  const [tipSaveMessage, setTipSaveMessage] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      const normalizedAddress = address.toLowerCase();

      // Check cache first
      if (users.has(normalizedAddress)) {
        setUser(users.get(normalizedAddress) ?? null);
      } else {
        // Fetch from database
        try {
          const userData = await getUserOrCreate(address);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user:', error);
          setUser(null);
        }
      }
    };
    fetchUser();
  }, [address, users, getUserOrCreate]);

  useEffect(() => {
    setTipInput(String(defaultTipAmount));
  }, [defaultTipAmount]);

  const userRecommendations = recommendations.filter(
    (r) => r.curatorAddress.toLowerCase() === address.toLowerCase()
  );

  const isOwnProfile = connectedAddress?.toLowerCase() === address.toLowerCase();

  const handleSaveDefaultTip = () => {
    const parsed = parseInt(tipInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setTipSaveMessage('Tip amount must be 1 or greater.');
      return;
    }

    setDefaultTipAmount(parsed);
    setTipSaveMessage('Default tip saved.');
    setTimeout(() => setTipSaveMessage(''), 2000);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 backdrop-dream flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="modal-surface max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content px-8 py-10 text-center">
            <p className="text-ink">Loading…</p>
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
        className="modal-surface my-8 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content flex-1 px-10 py-8 space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-[rgba(17,17,17,0.4)] bg-white/70 shadow-inner">
                {user.farcasterPfpUrl ? (
                  <Image
                    src={user.farcasterPfpUrl}
                    alt={user.farcasterUsername || user.username}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-ink-soft">
                    ♫
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-semibold text-ink">
                  {user.farcasterUsername ? `@${user.farcasterUsername}` : user.username}
                </h2>
                {user.farcasterDisplayName && (
                  <p className="text-sm text-ink-soft">{user.farcasterDisplayName}</p>
                )}
                <p className="text-xs uppercase tracking-[0.3em] text-ink-soft">
                  {isOwnProfile ? 'My Profile' : 'Curator Profile'}
                </p>
                <p className="text-xs text-ink-soft font-mono break-all">
                  {address}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[rgba(17,17,17,0.2)] bg-white/70 px-3 py-2 text-ink">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-soft mb-1">Token Balance</p>
              <p className="text-xl font-semibold">{user.tokenBalance}</p>
            </div>
            <div className="rounded-lg border border-[rgba(17,17,17,0.2)] bg-white/70 px-3 py-2 text-ink">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-soft mb-1">Total Tips</p>
              <p className="text-xl font-semibold">{user.totalTipsReceived}</p>
            </div>
            <div className="rounded-lg border border-[rgba(17,17,17,0.2)] bg-white/70 px-3 py-2 text-ink">
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-soft mb-1">Recs Shared</p>
              <p className="text-xl font-semibold">{user.recommendationCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(17,17,17,0.15)] bg-white/60 px-5 py-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-ink-soft">Default tip amount</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1"
                value={tipInput}
                onChange={(event) => setTipInput(event.target.value)}
                className="input-shell w-24 md:w-36"
              />
              <button
                type="button"
                onClick={handleSaveDefaultTip}
                className="btn-pastel px-6"
              >
                Save
              </button>
            </div>
            {tipSaveMessage && (
              <p className="text-xs text-ink-soft">{tipSaveMessage}</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">
              {isOwnProfile ? 'My Recommendations' : 'Recommendations'}
            </h3>

            {userRecommendations.length === 0 ? (
              <div className="rounded-2xl border border-[rgba(17,17,17,0.15)] bg-white/70 px-8 py-12 text-center">
                <p className="text-ink-soft">No recommendations yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[26rem] overflow-y-auto pr-2">
                {userRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-[rgba(17,17,17,0.15)] bg-white/70 px-5 py-4 space-y-3"
                  >
                    <a
                      href={rec.musicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ink font-semibold underline-offset-4 hover:underline"
                    >
                      {rec.musicUrl}
                    </a>
                    <p className="text-sm text-ink">
                      {rec.review}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="pill-tag pill-tag--accent">{rec.genre}</span>
                      {rec.moods.map((mood) => (
                        <span key={mood} className="pill-tag">
                          {mood}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs uppercase tracking-[0.25em] text-ink-soft">
                      Tips received
                      <span className="ml-2 text-ink font-semibold">{rec.tipCount}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className="btn-pastel px-8">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
