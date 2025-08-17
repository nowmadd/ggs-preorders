import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/lib/models/Customer";
import { Types } from "mongoose";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        await dbConnect();
        const user = await Customer.findOne({ email: credentials.email });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!ok) return null;
        return {
          id: String(user._id),
          name: user.name || "",
          email: user.email,
          image: user.image || undefined,
          shopify_account_id: user.shopify_account_id || undefined,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      await dbConnect();

      const email = user.email!;
      let existing = await Customer.findOne({ email });

      if (!existing) {
        existing = await Customer.create({
          email,
          name: user.name,
          googleId: account.providerAccountId,
          image: user.image,
        });
      } else if (!existing.googleId) {
        existing.googleId = account.providerAccountId;
        await existing.save();
      }
      return true;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;
      } catch {}
      return `${baseUrl}/`;
    },

    async jwt({ token, user, account }) {
      const email = user?.email ?? token?.email;
      if (account?.provider === "google" && account.providerAccountId) {
        (token as any).googleId = account.providerAccountId;
      }

      if (!email) return token;

      await dbConnect();
      const u = await Customer.findOne({ email })
        .select("_id name image shopify_account_id role googleId")
        .lean<{
          _id: Types.ObjectId;
          name?: string;
          image?: string;
          shopify_account_id?: string | null;
          role?: "admin" | "customer";
          googleId?: string | null;
        }>();

      if (u) {
        token.uid = u._id.toString();
        token.shopify_account_id = u.shopify_account_id ?? null;
        token.role = u.role ?? "customer";
        token.name = u.name ?? token.name;
        token.picture = u.image ?? token.picture;
        // prefer DB googleId if present; otherwise keep what we captured from `account`
        (token as any).googleId = u.googleId ?? (token as any).googleId ?? null;
      }
      return token;
    },

    // Map JWT → session (so client can read these)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string | undefined;
        session.user.shopify_account_id =
          (token.shopify_account_id as string | null) ?? null;
        session.user.role = (token.role as "admin" | "customer") ?? "customer";
        (session.user as any).googleId = (token as any).googleId ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },
};

export default NextAuth(authOptions);
