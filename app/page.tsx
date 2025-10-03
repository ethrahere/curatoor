'use client';

import { NavBar } from './components/NavBar';
import { HomeFeed } from './components/HomeFeed';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground">
      <NavBar />
      <main className="flex-1 px-4 pb-16">
        <HomeFeed />
      </main>
    </div>
  );
}
