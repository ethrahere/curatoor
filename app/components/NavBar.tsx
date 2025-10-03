'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
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
      <header className="sticky top-0 z-40 pt-8 pb-4 bg-transparent">
        <div className="max-w-5xl mx-auto px-4">
          <div className="panel-surface">
            <div className="panel-content flex items-center justify-between px-6 py-4">
              <div className="flex items-center">
                {isConnected && address ? (
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(17,17,17,0.45)] bg-white/70 shadow-md transition-transform hover:-translate-y-0.5"
                  >
                    {currentUser?.farcasterPfpUrl ? (
                      <Image
                        src={currentUser.farcasterPfpUrl}
                        alt={currentUser.farcasterUsername || 'Profile'}
                        width={44}
                        height={44}
                        className="h-full w-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <Wallet>
                        <Avatar className="h-9 w-9" />
                      </Wallet>
                    )}
                  </button>
                ) : (
                  <div className="h-11 w-11 rounded-full border border-[rgba(17,17,17,0.45)] bg-white/40 shadow-inner" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Image src="/curio.png" alt="Curatoor logo" width={102} height={32} className="h-6 w-auto" priority />
              </div>

              <button
                onClick={() => setShowPostModal(true)}
                className="btn-ghost px-6 py-2 text-sm"
              >
                Share
              </button>
            </div>
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
