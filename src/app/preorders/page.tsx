// app/preorders/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useListMyPreordersQuery } from "@/lib/store/api/preordersApi";
import { usePathname, useSearchParams } from "next/navigation";

function fmt(n?: number) {
  return typeof n === "number" ? `₱${n.toLocaleString()}` : "—";
}

export default function MyPreordersPage() {
  const { data: session, status } = useSession();

  // Build a safe callback back to this page after login
  const pathname = usePathname();
  const search = useSearchParams();
  const callbackUrl = useMemo(() => {
    const qs = search?.toString();
    return qs ? `${pathname}?${qs}` : pathname || "/";
  }, [pathname, search]);

  // If guest, send to login then back here
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(undefined, { callbackUrl });
    }
  }, [status, callbackUrl]);

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useListMyPreordersQuery(undefined, {
    skip: status !== "authenticated",
  });

  // Loading: either auth is loading or query is loading
  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  // We already triggered signIn; no UI needed here
  if (status === "unauthenticated") return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Preorders</h1>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {isError && (
        <div className="p-3 rounded bg-red-100 text-red-700">
          Failed to load your preorders.
        </div>
      )}

      {!isError && orders.length === 0 && (
        <div className="p-4 rounded border bg-white">
          <p className="text-gray-600">You have no preorders yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Check out the{" "}
            <Link href="/" className="text-sky-700 hover:underline">
              preorder offers
            </Link>{" "}
            to get started.
          </p>
        </div>
      )}

      {!isError && orders.length > 0 && (
        <div className="overflow-x-auto bg-white rounded border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-3">Preorder ID</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Payment</th>
                <th className="py-2 px-3">Shipping</th>
                <th className="py-2 px-3 text-right">DP</th>
                <th className="py-2 px-3 text-right">Total</th>
                <th className="py-2 px-3 whitespace-nowrap">Created</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-mono">{o.id}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        o.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : o.payment_status === "partially_paid"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {/* {o.payment_status.replace("_", " ")} */}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {/* {o.shipping_status.replace("_", " ")} */}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {fmt(o.totals?.downpayment)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {fmt(o.totals?.price)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {o.created_at
                      ? new Date(o.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 px-3 text-right space-x-2 whitespace-nowrap">
                    <Link
                      href={`/preorders/${encodeURIComponent(o.id)}`}
                      className="text-sky-700 hover:underline"
                    >
                      View
                    </Link>
                    {o.payment_status !== "paid" && (
                      <Link
                        href={`/preorders/${encodeURIComponent(o.id)}/confirm`}
                        className="text-emerald-700 hover:underline"
                      >
                        Confirm/Pay
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
