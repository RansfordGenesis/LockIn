import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and user info to the token
      if (account && profile) {
        token.accessToken = account.access_token;
        token.id = profile.sub;
        // Extract first name from Google profile
        const fullName = profile.name || "";
        const firstName = fullName.split(" ")[0];
        token.firstName = firstName;
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { firstName?: string }).firstName = token.firstName as string;
        (session.user as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Use our custom sign-in page
    error: "/", // Handle errors on our main page
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
