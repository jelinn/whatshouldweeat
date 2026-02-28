import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// This config is imported by Edge middleware — keep it free of Node.js-only imports.
// The Credentials provider is added in auth.ts (server-side only).
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
