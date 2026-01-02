"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
import { ReactNode } from "react";

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
