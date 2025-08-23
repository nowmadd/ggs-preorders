import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/store/db/connect";
import Customer from "@/lib/models/Customer";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return false;

      await dbConnect();
      const email = user.email!;
      let existing = await (Customer as any).findOne({ email });

      if (!existing) {
        existing = await (Customer as any).create({
          email,
          name: user.name,
          image: (user as any).image ?? (user as any).avatar,
          googleId: account.providerAccountId,
          google_id: account.providerAccountId,
          avatar: (user as any).image ?? undefined,
          role: "user",
        });
      } else {
        // backfill googleId if missing
        if (!existing.googleId && !existing.google_id) {
          existing.googleId = account.providerAccountId;
          existing.google_id = account.providerAccountId;
          await existing.save();
        }
        if (!existing.role) {
          existing.role = "user";
          await existing.save();
        }
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        (token as any).googleId = account.providerAccountId;
      }

      await dbConnect();
      const u = await (Customer as any)
        .findOne({ email: token.email })
        .select("_id name image avatar googleId google_id role")
        .lean();

      if (u) {
        (token as any).uid = u._id?.toString();
        token.name = u.name ?? token.name;
        token.picture = u.image ?? u.avatar ?? token.picture;
        (token as any).googleId =
          u.googleId ?? u.google_id ?? (token as any).googleId ?? null;
        (token as any).role = u.role ?? "user";
      } else {
        (token as any).role = (token as any).role ?? "user";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).uid as string | undefined;
        (session.user as any).googleId = (token as any).googleId ?? null;
        (session.user as any).role = (token as any).role ?? "user";
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
