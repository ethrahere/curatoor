"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useFarcasterAuth } from "../hooks/useFarcasterAuth";
import { useApp } from "../context/AppContext";

type FarcasterAuthCardProps = {
  className?: string;
};

export function FarcasterAuthCard({ className }: FarcasterAuthCardProps) {
  const { getUserOrCreate } = useApp();
  const {
    user,
    login,
    logout,
    isAuthenticated,
    isLoading,
    error,
    isInMiniApp,
  } = useFarcasterAuth();

  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    const shouldSync = isAuthenticated && user?.address;
    const normalizedAddress = user?.address?.toLowerCase();

    if (!shouldSync || !normalizedAddress) {
      return;
    }

    if (lastSyncedRef.current === normalizedAddress) {
      return;
    }

    getUserOrCreate(normalizedAddress, {
      farcasterUsername: user?.username,
      farcasterDisplayName: user?.displayName,
      farcasterFid: user?.fid,
      farcasterPfpUrl: user?.pfpUrl,
    })
      .then(() => {
        lastSyncedRef.current = normalizedAddress;
      })
      .catch((err) => {
        console.error("Failed to sync Farcaster profile:", err);
      });
  }, [getUserOrCreate, isAuthenticated, user]);

  const statusMessage = useMemo(() => {
    if (isInMiniApp === false) {
      return "Farcaster sign-in works inside the Farcaster mini app.";
    }
    if (!isAuthenticated) {
      return "Connect Farcaster to personalize your recommendations.";
    }
    return null;
  }, [isAuthenticated, isInMiniApp]);

  return (
    <div
      className={`rounded-2xl border border-[rgba(17,17,17,0.12)] bg-white/60 p-4 shadow-sm backdrop-blur ${
        className ?? ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {user.pfpUrl ? (
              <Image
                src={user.pfpUrl}
                alt={user.username || "Farcaster profile"}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-default-200 text-xs font-medium uppercase text-default-700">
                {user.username?.slice(0, 2) || "FC"}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {user.displayName || user.username || `fid ${user.fid ?? "—"}`}
              </p>
              <p className="truncate text-xs text-ink-soft">
                @{user.username ?? "unknown"} • fid {user.fid ?? "?"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">Farcaster Login</h3>
            <p className="text-xs text-ink-soft">
              {statusMessage || ""}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center rounded-full border border-[rgba(17,17,17,0.25)] px-4 py-2 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground"
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={login}
              disabled={isLoading || isInMiniApp === false}
              className="inline-flex items-center justify-center rounded-full bg-default-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-default-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Connecting…" : "Login with Farcaster"}
            </button>
          )}
        </div>
      </div>

      {!isAuthenticated && statusMessage && isInMiniApp !== false && !error && (
        <p className="mt-3 text-xs text-ink-soft">{statusMessage}</p>
      )}

      {error && (
        <p className="mt-3 text-xs text-danger-500">{error}</p>
      )}
    </div>
  );
}
