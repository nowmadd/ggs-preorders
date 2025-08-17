"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useGetItemQuery,
  useDeleteItemMutation,
  type Item,
} from "../../../../lib/store/api/itemsApi";

export default function AdminItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const {
    data: item,
    isLoading,
    isError,
    refetch,
  } = useGetItemQuery(id!, {
    skip: !id,
  });
  const [deleteItem, { isLoading: deleting }] = useDeleteItemMutation();

  const handleDelete = async () => {
    if (!id) return;
    const ok = confirm("Delete this item? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteItem(id).unwrap();
      router.push("/admin/items");
    } catch {
      alert("Could not delete item. Try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 w-full bg-gray-200 animate-pulse rounded" />
        <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          {isError ? "Failed to load item." : "Item not found."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Retry
          </button>
          <Link
            href="/admin/items"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            ← Back to items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {item.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/items"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Back
          </Link>
          <Link
            href={`/admin/items/${encodeURIComponent(item.id)}/edit`}
            className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {item.image && (
        <div className="w-full flex">
          <div className="w-64 aspect-square rounded border overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Detail label="Price" value={formatCurrency(item.price)} />
        <Detail
          label="Down Payment"
          value={item.dp ? formatCurrency(item.dp) : "—"}
        />
        <Detail
          label="Discount (%)"
          value={item.discount != null ? formatCurrency(item.discount) : "—"}
        />
        <Detail label="Category" value={item.category || "—"} />
        <Detail
          label="Release Date"
          value={
            item.releaseDate
              ? new Date(item.releaseDate).toLocaleDateString()
              : "—"
          }
        />
      </div>

      {item.description && (
        <div className="bg-white rounded border p-4">
          <h2 className="font-medium mb-2">Description</h2>
          <p className="text-gray-800 whitespace-pre-wrap">
            {item.description}
          </p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-gray-900">{value}</div>
    </div>
  );
}

function formatCurrency(n: number) {
  try {
    return `₱ ${n.toLocaleString()}`;
  } catch {
    return "—";
  }
}
