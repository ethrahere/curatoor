'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { Recommendation } from '../types';
import { useApp } from '../context/AppContext';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';

interface TipModalProps {
  recommendation: Recommendation;
  onClose: () => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100];

export function TipModal({ recommendation, onClose }: TipModalProps) {
  const { address, isConnected } = useAccount();
  const { tipRecommendation, users, getUserOrCreate } = useApp();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (address) {
        const normalizedAddress = address.toLowerCase();

        // Check cache first
        if (users.has(normalizedAddress)) {
          setCurrentUser(users.get(normalizedAddress));
        } else {
          // Fetch from database
          try {
            const userData = await getUserOrCreate(address);
            setCurrentUser(userData);
          } catch (error) {
            console.error('Error fetching user:', error);
          }
        }
      }
    };
    fetchUser();
  }, [address, users, getUserOrCreate]);

  const handleTip = async (amount: number) => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (address.toLowerCase() === recommendation.curatorAddress.toLowerCase()) {
      setError("You can't tip your own recommendation");
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    const success = await tipRecommendation(recommendation.id, amount, address);

    if (!success) {
      setError('Insufficient token balance');
      return;
    }

    setSuccess(true);
    setError('');

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleQuickTip = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    handleTip(amount);
  };

  const handleCustomTip = () => {
    const amount = parseInt(customAmount);
    if (isNaN(amount)) {
      setError('Please enter a valid number');
      return;
    }
    handleTip(amount);
  };

  if (!isConnected || !address) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-content2 rounded-lg p-6 max-w-md w-full border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4 text-foreground">Connect Wallet to Tip</h2>
          <p className="text-foreground/70 mb-6">
            You need to connect your wallet to tip curators.
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
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-success mb-2">
            Tip Sent!
          </h2>
          <p className="text-foreground/70">
            You tipped {selectedAmount || parseInt(customAmount)} tokens
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-content2 rounded-lg p-6 max-w-md w-full border border-content3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-foreground">Tip this curator</h2>

        <div className="mb-4 p-3 bg-success/10 rounded-lg border border-success/20">
          <p className="text-sm text-foreground/70">
            Your balance: <span className="font-bold text-success">{currentUser?.tokenBalance || 0} tokens</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/30 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-foreground/70 mb-3">Quick amounts:</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickTip(amount)}
                disabled={!currentUser || currentUser.tokenBalance < amount}
                className={`py-3 px-4 rounded-lg font-bold transition-all border-2 ${
                  !currentUser || currentUser.tokenBalance < amount
                    ? 'bg-content3 border-content4 text-foreground/50 cursor-not-allowed opacity-50'
                    : 'bg-primary hover:bg-primary-600 border-primary text-primary-foreground shadow-md hover:shadow-lg'
                }`}
              >
                {amount} tokens
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-foreground/70 mb-2">Custom amount:</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setError('');
              }}
              placeholder="Enter amount"
              className="flex-1 px-4 py-2 border-2 border-content4 rounded-lg bg-white text-black placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              min="1"
            />
            <button
              onClick={handleCustomTip}
              disabled={!customAmount}
              className="bg-secondary hover:bg-secondary-600 text-secondary-foreground border-2 border-secondary px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              Tip
            </button>
          </div>
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
