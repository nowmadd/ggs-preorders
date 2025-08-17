"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useListOffersQuery } from "../../../lib/store/api/offersApi";

type Offer = {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  active: boolean;
  banner?: string;
};

export default function PreorderOfferListPage() {
  const { data, isLoading, isError, refetch } = useListOffersQuery();
  const offers: Offer[] = Array.isArray(data) ? (data as Offer[]) : [];

  const [q, setQ] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return offers.filter((o) => {
      const matches =
        !term ||
        o.title.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term);
      const statusOk = !showActiveOnly || o.active;
      return matches && statusOk;
    });
  }, [offers, q, showActiveOnly]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Preorder Offers</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link
            href="/admin/preorder-offers/add"
            className="inline-flex items-center px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            + New Offer
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or ID…"
          className="flex-1 border rounded p-2"
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="p-4 rounded border bg-red-50 text-red-700">
          Failed to load offers.{" "}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
          .
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="p-4 rounded border bg-white">
          <p className="text-gray-600">No preorder offers found.</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="overflow-x-auto bg-white rounded border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">Offer ID</th>
                <th className="py-2 px-3">Dates</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <div className="font-medium">{o.title}</div>
                    {o.description ? (
                      <div className="text-xs text-gray-500 line-clamp-1">
                        {o.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 px-3 text-gray-700">{o.id}</td>
                  <td className="py-2 px-3">
                    <div className="text-gray-700 whitespace-nowrap">
                      {new Date(o.start_date).toLocaleDateString()} —{" "}
                      {new Date(o.end_date).toLocaleDateString()}
                    </div>
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
                      href={`/admin/preorder-offers/${encodeURIComponent(
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
    </div>
  );
}
