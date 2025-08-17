"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useListOffersQuery } from "@/lib/store/api/offersApi";
// import OfferItemsPills from "../components/OfferItemsPills";

function formatCountdown(ms: number) {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

export default function Home() {
  const { data: session, status } = useSession();
  const {
    data: offers = [],
    isLoading,
    isError,
    refetch,
  } = useListOffersQuery();

  // Tick every second for live countdowns
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Optional: memoize computed countdowns (not required, but neat)
  const offersWithCountdown = useMemo(
    () =>
      (offers as any[]).map((o) => {
        const endMs = new Date(o.end_date).getTime();
        return { ...o, timeLeftMs: endMs - now };
      }),
    [offers, now]
  );

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div className="w-full flex items-center justify-between">
        <h1 className="text-2xl font-semibold">GGs Hobby Preorders</h1>

        {status === "loading" ? (
          <div className="h-9 w-28 rounded bg-gray-200 animate-pulse" />
        ) : session ? (
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="px-3 py-2 rounded border hover:bg-gray-50"
            >
              Account
            </Link>
            <Link
              href="/preorders"
              className="px-3 py-2 rounded border hover:bg-gray-50"
            >
              My Preorders
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-black"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="px-3 py-2 rounded border hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Register
            </Link>
          </div>
        )}
      </div>

      {/* Preorder list */}
      <section className="w-full bg-white rounded border">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-medium">Preorder Offers</h2>
          <button
            onClick={() => refetch()}
            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <div className="p-4 space-y-2">
            <div className="h-10 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 bg-gray-200 animate-pulse rounded" />
            <div className="h-10 bg-gray-200 animate-pulse rounded" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="p-4 text-red-700 bg-red-50">
            Failed to load offers.
          </div>
        )}

        {!isLoading &&
          !isError &&
          Array.isArray(offersWithCountdown) &&
          offersWithCountdown.length === 0 && (
            <div className="p-4 text-gray-600">No preorder offers yet.</div>
          )}

        {!isLoading &&
          !isError &&
          Array.isArray(offersWithCountdown) &&
          offersWithCountdown.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Offer ID</th>
                    <th className="py-2 px-3">Ends In</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offersWithCountdown.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        <div className="font-medium">{o.title}</div>
                        {o.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {o.description}
                          </div>
                        )}
                        {Array.isArray(o.items) && o.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.items.map((it: any) => (
                              <span
                                key={it.id}
                                className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs"
                                title={it.name}
                              >
                                {it.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-700">{o.id}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={o.timeLeftMs <= 0 ? "text-red-600" : ""}
                        >
                          {formatCountdown(o.timeLeftMs)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            o.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {o.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Link
                          href={`/preorder-offers/new?offerId=${encodeURIComponent(
                            o.id
                          )}`}
                          className="text-sky-700 hover:underline whitespace-nowrap"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <span className="text-sm text-gray-500">
          © {new Date().getFullYear()} GGs Hobby
        </span>
      </footer>
    </div>
  );
}
