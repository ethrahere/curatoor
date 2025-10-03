"use client";

import { useCallback, useMemo, useState } from "react";
import {
  parseSignInMessage,
  useAuthenticate,
  useMiniKit,
  useIsInMiniApp,
} from "@coinbase/onchainkit/minikit";

type AuthState = {
  address: string;
  signature: string;
  message: string;
  authMethod: "custody" | "authAddress";
} | null;

export type FarcasterAuthUser = {
  address: string;
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  signature: string;
  message: string;
  authMethod: "custody" | "authAddress";
};

export type UseFarcasterAuthReturn = {
  user: FarcasterAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInMiniApp?: boolean;
  login: () => Promise<FarcasterAuthUser | null>;
  logout: () => void;
};

export function useFarcasterAuth(): UseFarcasterAuthReturn {
  const { context } = useMiniKit();
  const { isInMiniApp } = useIsInMiniApp();
  const { signIn } = useAuthenticate(
    process.env.NEXT_PUBLIC_BASE_URL || undefined,
  );

  const [authState, setAuthState] = useState<AuthState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const farcasterProfile = context?.user;

  const user = useMemo(() => {
    if (!authState) {
      return null;
    }

    return {
      address: authState.address,
      fid: farcasterProfile?.fid,
      username: farcasterProfile?.username,
      displayName: farcasterProfile?.displayName,
      pfpUrl: farcasterProfile?.pfpUrl,
      signature: authState.signature,
      message: authState.message,
      authMethod: authState.authMethod,
    } satisfies FarcasterAuthUser;
  }, [authState, farcasterProfile]);

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isInMiniApp === false) {
        throw new Error(
          "Farcaster sign-in is only available inside the Farcaster Mini App.",
        );
      }

      const result = await signIn();

      if (!result) {
        throw new Error("Sign-in was cancelled or failed.");
      }

      const parsed = parseSignInMessage(result.message);
      const address = parsed.address?.toLowerCase();

      if (!address) {
        throw new Error("Unable to read the wallet address from the sign-in message.");
      }

      setAuthState({
        address,
        signature: result.signature,
        message: result.message,
        authMethod: result.authMethod,
      });

      return {
        address,
        fid: farcasterProfile?.fid,
        username: farcasterProfile?.username,
        displayName: farcasterProfile?.displayName,
        pfpUrl: farcasterProfile?.pfpUrl,
        signature: result.signature,
        message: result.message,
        authMethod: result.authMethod,
      } satisfies FarcasterAuthUser;
    } catch (err) {
      console.error("Farcaster sign-in error:", err);

      const message = err instanceof Error ? err.message : "Unknown sign-in error.";
      setAuthState(null);
      setError(message);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [farcasterProfile, isInMiniApp, signIn]);

  const logout = useCallback(() => {
    setAuthState(null);
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    isInMiniApp,
    login,
    logout,
  };
}
