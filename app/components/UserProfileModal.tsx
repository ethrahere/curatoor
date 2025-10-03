'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAccount } from 'wagmi';

interface UserProfileModalProps {
  address: string;
  onClose: () => void;
}

export function UserProfileModal({ address, onClose }: UserProfileModalProps) {
  const { recommendations, users, getUserOrCreate } = useApp();
  const { address: connectedAddress } = useAccount();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const normalizedAddress = address.toLowerCase();

      // Check cache first
      if (users.has(normalizedAddress)) {
        setUser(users.get(normalizedAddress));
      } else {
        // Fetch from database
        try {
          const userData = await getUserOrCreate(address);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }
    };
    fetchUser();
  }, [address, users, getUserOrCreate]);
  const userRecommendations = recommendations.filter(
    (r) => r.curatorAddress.toLowerCase() === address.toLowerCase()
  );

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isOwnProfile = connectedAddress?.toLowerCase() === address.toLowerCase();

  if (!user) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-content2 rounded-lg p-6 max-w-md w-full border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-foreground text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-content2 rounded-lg p-6 max-w-2xl w-full my-8 border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-3">
            {user.farcasterPfpUrl ? (
              <img
                src={user.farcasterPfpUrl}
                alt={user.farcasterUsername || user.username}
                className="w-16 h-16 rounded-full border-2 border-primary"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-primary mb-1">
                {user.farcasterUsername ? `@${user.farcasterUsername}` : user.username}
              </h2>
              {user.farcasterDisplayName && (
                <p className="text-foreground text-sm mb-1">
                  {user.farcasterDisplayName}
                </p>
              )}
              <p className="text-sm text-foreground/50 mb-1">
                {isOwnProfile ? 'My Profile' : 'Curator Profile'}
              </p>
              <p className="text-foreground/60 text-xs font-mono">
                {address}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/50 hover:text-foreground text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
            <p className="text-sm text-foreground/70 mb-1">Token Balance</p>
            <p className="text-2xl font-bold text-success">
              {user.tokenBalance}
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <p className="text-sm text-foreground/70 mb-1">Total Tips Received</p>
            <p className="text-2xl font-bold text-primary">
              {user.totalTipsReceived}
            </p>
          </div>

          <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-lg col-span-2 md:col-span-1">
            <p className="text-sm text-foreground/70 mb-1">Recommendations</p>
            <p className="text-2xl font-bold text-secondary">
              {user.recommendationCount}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {isOwnProfile ? 'My Recommendations' : 'Recommendations'}
          </h3>

          {userRecommendations.length === 0 ? (
            <div className="text-center py-8 text-foreground/50">
              <p>No recommendations yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {userRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-content3 p-4 rounded-lg border border-content4 hover:border-primary/30 transition-colors"
                >
                  <a
                    href={rec.musicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-secondary-600 hover:underline text-sm mb-2 block break-all transition-colors"
                  >
                    {rec.musicUrl}
                  </a>
                  <p className="text-foreground text-sm mb-2">
                    {rec.review}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="bg-secondary/20 text-secondary border border-secondary/30 px-2 py-1 rounded-full text-xs">
                      {rec.genre}
                    </span>
                    {rec.moods.map((mood) => (
                      <span
                        key={mood}
                        className="bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded-full text-xs"
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-foreground/60">
                    Tips received: <span className="font-bold text-success">{rec.tipCount}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-primary hover:bg-primary-600 text-primary-foreground border-2 border-primary px-4 py-2 rounded-lg transition-all font-bold shadow-md hover:shadow-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}
