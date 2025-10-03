'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { NavBar } from './components/NavBar';
import { HomeFeed } from './components/HomeFeed';

export default function App() {
  useEffect(() => {
    const runReady = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('Miniapp ready action failed:', error);
      }
    };

    runReady();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
      <NavBar />
      <main className="flex-1 px-4 pb-16">
        <HomeFeed />
      </main>
    </div>
  );
}
