"use client";

import { createContext, useContext } from "react";

export const LiveRunContext = createContext<Record<string, string>>({});

export function useLiveRunStatuses(): Record<string, string> {
  return useContext(LiveRunContext);
}
