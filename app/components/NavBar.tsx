'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  Wallet,
} from '@coinbase/onchainkit/wallet';
import {
  Avatar,
} from '@coinbase/onchainkit/identity';
import { PostRecommendationModal } from './PostRecommendationModal';
import { UserProfileModal } from './UserProfileModal';
import { useApp } from '../context/AppContext';

export function NavBar() {
  const { address, isConnected } = useAccount();
  const { users, getUserOrCreate } = useApp();
  const [showPostModal, setShowPostModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Create or fetch user when wallet connects
  // Farcaster data will be added later when MiniKit is properly configured
  useEffect(() => {
    if (address && isConnected) {
      getUserOrCreate(address);
    }
  }, [address, isConnected, getUserOrCreate]);

  const currentUser = address ? users.get(address.toLowerCase()) : null;

  return (
    <>
      <header className="bg-content2 border-b border-content3 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Left: Profile Picture */}
            <div className="flex items-center">
              {isConnected && address ? (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-primary/20 border-2 border-primary hover:bg-primary/30 transition-colors"
                >
                  {currentUser?.farcasterPfpUrl ? (
                    <img
                      src={currentUser.farcasterPfpUrl}
                      alt={currentUser.farcasterUsername || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Wallet>
                      <Avatar className="h-8 w-8" />
                    </Wallet>
                  )}
                </button>
              ) : (
                <div className="w-10 h-10 rounded-full bg-content3 border-2 border-content4" />
              )}
            </div>

            {/* Center: App Name */}
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl font-bold text-foreground">
              Curatoor
            </h1>

            {/* Right: Share Button */}
            <button
              onClick={() => setShowPostModal(true)}
              className="bg-primary hover:bg-primary-600 text-primary-foreground border-2 border-primary px-4 py-2 rounded-lg font-bold transition-all text-sm min-h-[40px] shadow-md hover:shadow-lg"
            >
              Share
            </button>
          </div>

        </div>
      </header>

      {showPostModal && (
        <PostRecommendationModal onClose={() => setShowPostModal(false)} />
      )}

      {showProfileModal && address && (
        <UserProfileModal
          address={address}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
}
