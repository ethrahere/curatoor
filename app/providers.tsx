'use client';

import { base } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { ReactNode } from 'react';
import { AppProvider } from './context/AppContext';

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: 'auto',
        },
        minikit: {
          enabled: true,
        },
      }}
    >
      <AppProvider>
        {props.children}
      </AppProvider>
    </OnchainKitProvider>
  );
}

