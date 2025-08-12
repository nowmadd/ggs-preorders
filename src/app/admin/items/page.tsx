"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useListItemsQuery, type Item } from "../../../lib/store/api/itemsApi";

export default function AdminItemsPage() {
  const { data, isLoading, isError, refetch } = useListItemsQuery();
  const items = (data || []) as Item[];

  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      const matchesSearch =
        !term ||
        i.name.toLowerCase().includes(term) ||
        i.id.toLowerCase().includes(term);
      const matchesCategory = !categoryFilter || i.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, q, categoryFilter]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or ID…"
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
          Failed to load items.{" "}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
          .
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="p-4 rounded border bg-white">
          <p className="text-gray-600">No items found.</p>
        </div>
      )}

      {/* Table */}
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
                <th className="py-2 px-3">Release Date</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    {i.image ? (
                      <img
                        src={i.image}
                        alt={i.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded" />
                    )}
                  </td>
                  <td className="py-2 px-3 font-medium">{i.name}</td>
                  <td className="py-2 px-3 text-gray-700">{i.id}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    ₱ {i.price.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {i.dp ? `₱ ${i.dp.toLocaleString()}` : "-"}
                  </td>
                  <td className="py-2 px-3">{i.category || "-"}</td>
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
                      href={`/admin/items/${encodeURIComponent(i.id)}/edit`}
                      className="text-amber-700 hover:underline"
                    >
                      Edit
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
