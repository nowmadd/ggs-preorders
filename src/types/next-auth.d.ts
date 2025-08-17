// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    shopify_account_id?: string | null;
    role?: "admin" | "customer";
    googleId?: string | null;
  }
}

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      shopify_account_id?: string | null;
      role?: "admin" | "customer";
      googleId?: string | null;
    };
  }
}
