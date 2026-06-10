import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email || "";
        if (
          email.endsWith("@vitapstudent.ac.in") ||
          email.endsWith("@vitapstudents.ac.in") ||
          email.endsWith("@vitstudent.ac.in") ||
          email.endsWith("@vitbhopal.ac.in")
        ) {
          return true;
        }
        return false;
      }
      return false;
    },
  },
  pages: {
    signIn: "/contributors",
    error: "/contributors?error=AccessDenied",
  },
};
