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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          Music Recommendations
        </h1>

        {recommendations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60 mb-4">
              No recommendations yet. Be the first to share!
            </p>
          </div>
        ) : (
          <div>
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
