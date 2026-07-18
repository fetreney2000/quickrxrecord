"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min - reduce unnecessary refetches for Vercel hobby tier
            gcTime: 10 * 60 * 1000, // 10 min - keep cached data longer
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1, // reduce retries to save serverless function invocations
          },
          mutations: {
            retry: 0, // no retry on mutations
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}