'use client';

import { NavBar } from './components/NavBar';
import { HomeFeed } from './components/HomeFeed';

export default function App() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground">
      <NavBar />
      <main className="flex-grow bg-content1">
        <HomeFeed />
      </main>
    </div>
  );
}
