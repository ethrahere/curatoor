'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RecommendationCard } from './RecommendationCard';
import { UserProfileModal } from './UserProfileModal';

export function HomeFeed() {
  const { recommendations } = useApp();
  const [selectedCurator, setSelectedCurator] = useState<string | null>(null);

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pt-2">
        <section className="panel-surface">
          <div className="panel-content px-8 py-8">
            <h1 className="text-3xl font-semibold text-ink mb-2 text-balance">
              Music Recommendations
            </h1>
            <p className="text-sm text-ink-soft max-w-xl">
              Dive into tracks curated by the community.
              Share what you love or tip the tastemakers keeping the vibe alive.
            </p>
          </div>
        </section>

        {recommendations.length === 0 ? (
          <div className="panel-surface">
            <div className="panel-content px-8 py-12 text-center">
              <p className="text-ink-soft mb-4">
                No recommendations yet. Be the first to share!
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-ink">curate the vibe</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onCuratorClick={setSelectedCurator}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCurator && (
        <UserProfileModal
          address={selectedCurator}
          onClose={() => setSelectedCurator(null)}
        />
      )}
    </>
  );
}
