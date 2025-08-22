"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useListItemsQuery, type Item } from "@/lib/store/api/itemsApi";
import { useS3Image } from "@/lib/s3/useS3Image";
import React from "react";

/** Small, memoized thumbnail that resolves S3 keys -> presigned URL only when the key changes */
const Thumb: React.FC<{ keyOrUrl?: string; alt: string }> = React.memo(
  ({ keyOrUrl, alt }) => {
    const url = useS3Image(keyOrUrl); // accepts S3 key, http(s) URL, or blob: URL
    if (!url) return <div className="w-12 h-12 bg-gray-200 rounded" />;
    return (
      <img src={url} alt={alt} className="w-12 h-12 object-cover rounded" />
    );
  },
  (prev, next) => prev.keyOrUrl === next.keyOrUrl && prev.alt === next.alt
);
Thumb.displayName = "Thumb";

export default function AdminItemsPage() {
  const { data, isLoading, isError, refetch } = useListItemsQuery();
  const items = (data || []) as Item[];

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // distinct category list (string categories only)
  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) {
      if (typeof i.category === "string" && i.category) s.add(i.category);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return items.filter((i) => {
      const name = i.name?.toLowerCase?.() || "";
      const id = i.id?.toLowerCase?.() || "";
      const cat =
        (typeof i.category === "string" ? i.category : "")?.toLowerCase?.() ||
        "";
      const gameTitle =
        (typeof i.game === "object" && i.game?.game_title
          ? i.game.game_title
          : ""
        )?.toLowerCase?.() || "";

      const matchesSearch =
        !term ||
        name.includes(term) ||
        id.includes(term) ||
        cat.includes(term) ||
        gameTitle.includes(term);

      const matchesCategory =
        !categoryFilter || cat === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [items, q, categoryFilter]);

  return (
    <div className="mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Items</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link
            href="/admin/items/add"
            className="inline-flex items-center px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            + New Item
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, ID, category, or game…"
          className="flex-1 border rounded p-2"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="p-4 rounded border bg-red-50 text-red-700">
          Failed to load items.{" "}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
          .
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="p-4 rounded border bg-white">
          <p className="text-gray-600">No items found.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="overflow-x-auto bg-white rounded border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-3">Image</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Item ID</th>
                <th className="py-2 px-3">Price</th>
                <th className="py-2 px-3">DP</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Game</th>
                <th className="py-2 px-3">Release Date</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <Thumb keyOrUrl={i.image} alt={i.name} />
                  </td>
                  <td className="py-2 px-3 font-medium">{i.name}</td>
                  <td className="py-2 px-3 text-gray-700">{i.id}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    ₱ {i.price.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {i.dp ? `₱ ${i.dp.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2 px-3">
                    {typeof i.category === "string" ? i.category || "-" : "-"}
                  </td>
                  <td className="py-2 px-3">
                    {typeof i.game === "object" && i.game?.game_title
                      ? i.game.game_title
                      : "-"}
                  </td>
                  <td className="py-2 px-3">
                    {i.releaseDate
                      ? new Date(i.releaseDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-2 px-3 text-right space-x-2">
                    <Link
                      href={`/admin/items/${encodeURIComponent(i.id)}`}
                      className="text-sky-700 hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/items/add?copyOf=${encodeURIComponent(
                        i.id
                      )}`}
                      className="text-emerald-700 hover:underline"
                    >
                      Copy
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
