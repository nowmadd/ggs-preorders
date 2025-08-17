"use client";

import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function AccountPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
        <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <p className="p-3 rounded bg-yellow-50 text-yellow-800">
          You are not signed in.
        </p>
        <div className="flex gap-2">
          <Link
            href="/auth/login"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Go to Login
          </Link>
          <Link
            href="/auth/register"
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const { name, email, image } = session.user;
  const userId = (session.user as any).id as string | undefined; // from NextAuth session callback
  const googleId = (session.user as any).googleId as string | null | undefined;
  const shopifyId = (session.user as any).shopify_account_id as
    | string
    | null
    | undefined;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-black"
        >
          Logout
        </button>
      </div>

      <div className="bg-white border rounded-lg p-5 flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
          {image ? (
            <Image
              src={image}
              alt="Avatar"
              width={80}
              height={80}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="text-lg font-medium">{name || "—"}</div>
          <div className="text-sm text-gray-600">{email || "—"}</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-5">
        <h2 className="font-medium mb-3">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Detail label="User ID" value={userId || "—"} />
          <Detail label="Google ID" value={googleId || "—"} />
          <Detail label="Shopify Account ID" value={shopifyId || "—"} />
        </dl>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-gray-900 mt-0.5 break-words">{value}</dd>
    </div>
  );
}
