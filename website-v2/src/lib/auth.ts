import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDbUsers } from "@/lib/db";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const dbUsers = await getDbUsers();
          const dbUser = dbUsers.find(
            (u: any) => u.email && u.email.toLowerCase() === user.email!.toLowerCase()
          );
          if (dbUser && dbUser.status === "suspended") {
            return false;
          }
          return true;
        } catch (e) {
          console.error("signIn callback check failed:", e);
          return false;
        }
      }
      return false;
    },
  },
  pages: {
    signIn: "/contributors",
    error: "/contributors?error=AccessDenied",
  },
};
