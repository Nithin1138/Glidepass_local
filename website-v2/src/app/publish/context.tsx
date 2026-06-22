"use client";
import { createContext, useContext } from "react";

export interface CreatorAuth {
  email: string;
  name: string;
  licenseKey: string;
  theme: "dark" | "light";
  dk: boolean;
  setTheme: (t: "dark" | "light") => void;
  logout: () => void;
}

export const CreatorContext = createContext<CreatorAuth | null>(null);

export function useCreator(): CreatorAuth {
  const ctx = useContext(CreatorContext);
  if (!ctx) throw new Error("useCreator must be used within PublishLayout");
  return ctx;
}
