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

  const offersWithCountdown = useMemo(
    () =>
      (offers as any[]).map((o) => {
        const endMs = new Date(o.end_date).getTime();
        return { ...o, timeLeftMs: endMs - now };
      }),
    [offers, now]
  );

  return (
    <div className="">
      {/* Preorder list */}
      <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        PREORDER OFFERS
      </h2>
      <section className="mt-5">
        {/* Error / Empty */}
        {isError && !isLoading && (
          <div className="p-4 text-red-700 bg-red-50">
            Failed to load offers.
          </div>
        )}

        {/* {!isLoading &&
          !isError &&
          Array.isArray(offersWithCountdown) &&
          offersWithCountdown.length === 0 && (
            <div className="p-4 text-gray-600">No preorder offers yet.</div>
          )} */}

        {!isLoading &&
          !isError &&
          Array.isArray(offersWithCountdown) &&
          offersWithCountdown.length > 0 && (
            <ul role="list" className="divide-y divide-gray-100">
              {offersWithCountdown.map((d: any) => (
                <li key={d.id} className="flex justify-between gap-x-6 py-5">
                  <div className="flex min-w-0 gap-x-4">
                    <img
                      alt=""
                      src={d.banner}
                      className="size-12 flex-none bg-gray-50"
                    />
                    <div className="min-w-0 flex-auto">
                      <p className="text-md/6 font-black text-gray-900">
                        {d.title}
                      </p>
                      <p className="mt-1 truncate text-xs/5 text-gray-500">
                        {d.description}
                      </p>
                      {Array.isArray(d.items) && d.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {d.items.map((it: any) => (
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
                    </div>
                  </div>

                  <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                    {/* <p className="text-sm/6 text-gray-900">{d.active}</p> */}

                    <span
                      className={
                        d.timeLeftMs <= 0
                          ? " me-2 mb-2 text-red-600"
                          : "me-2 mb-2"
                      }
                    >
                      {formatCountdown(d.timeLeftMs)}
                    </span>
                    <Link
                      href={`/preorder-offers/new?offerId=${encodeURIComponent(
                        d.id
                      )}`}
                      className="text-sky-700 hover:underline whitespace-nowrap"
                    >
                      <button
                        type="button"
                        className="text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-10 py-2.5 text-center me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                      >
                        View
                      </button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
