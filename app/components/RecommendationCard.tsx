'use client';

import React, { useState, useEffect } from 'react';
import type { Recommendation } from '../types';
import { TipModal } from './TipModal';
import { useAccount } from 'wagmi';
import { useApp } from '../context/AppContext';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onCuratorClick: (address: string) => void;
}

export function RecommendationCard({ recommendation, onCuratorClick }: RecommendationCardProps) {
  const [showTipModal, setShowTipModal] = useState(false);
  const { address, isConnected } = useAccount();
  const { users, getUserOrCreate } = useApp();
  const [curator, setCurator] = useState<any>(null);

  useEffect(() => {
    const fetchCurator = async () => {
      const normalizedAddress = recommendation.curatorAddress.toLowerCase();

      // Check cache first
      if (users.has(normalizedAddress)) {
        setCurator(users.get(normalizedAddress));
      } else {
        // Fetch from database
        try {
          const user = await getUserOrCreate(recommendation.curatorAddress);
          setCurator(user);
        } catch (error) {
          console.error('Error fetching curator:', error);
          setCurator({ username: 'Unknown User' });
        }
      }
    };
    fetchCurator();
  }, [recommendation.curatorAddress, users, getUserOrCreate]);


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

  const handleTipClick = () => {
    setShowTipModal(true);
  };

  return (
    <>
      <div className="bg-content2 rounded-lg shadow-lg p-4 mb-4 hover:shadow-xl transition-all border border-content3 hover:border-primary/50">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {curator?.farcasterPfpUrl ? (
              <img
                src={curator.farcasterPfpUrl}
                alt={curator.farcasterUsername || curator.username}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary" />
            )}
            <button
              onClick={() => onCuratorClick(recommendation.curatorAddress)}
              className="text-primary hover:text-primary-600 font-medium text-sm transition-colors"
            >
              {curator?.farcasterUsername ? `@${curator.farcasterUsername}` : curator?.username || 'Loading...'}
            </button>
          </div>
          <span className="text-foreground/50 text-xs">
            {formatTimestamp(recommendation.timestamp)}
          </span>
        </div>

        <div className="mb-3">
          <h3 className="text-secondary text-base font-semibold mb-1">
            {recommendation.songTitle}
          </h3>
          <p className="text-foreground/70 text-sm mb-2">
            {recommendation.artist}{recommendation.album ? ` • ${recommendation.album}` : ''}
          </p>
          <a
            href={recommendation.musicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary-600 text-secondary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 border-secondary shadow-md hover:shadow-lg"
          >
            <span>Listen</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </a>
        </div>

        <p className="text-foreground mb-3 text-base leading-relaxed">
          {recommendation.review}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-xs font-medium">
            {recommendation.genre}
          </span>
          {recommendation.moods.map((mood) => (
            <span
              key={mood}
              className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full text-xs"
            >
              {mood}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-content3">
          <div className="flex items-center gap-2">
            <span className="text-foreground/60 text-sm">
              Tips: <span className="font-bold text-success">{recommendation.tipCount}</span>
            </span>
          </div>
          <button
            onClick={handleTipClick}
            className="bg-warning hover:bg-warning-600 text-warning-foreground px-6 py-3 rounded-lg text-base font-bold transition-colors min-h-[48px] flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            Tip ⭐
          </button>
        </div>
      </div>

      {showTipModal && (
        <TipModal
          recommendation={recommendation}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </>
  );
}
