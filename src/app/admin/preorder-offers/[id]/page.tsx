// app/preorder-offers/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  useGetOfferQuery,
  useUpdateOfferMutation,
} from "@/lib/store/api/offersApi";
import { useListItemsQuery } from "@/lib/store/api/itemsApi";
import ItemSearchList from "../../../../components/ItemSearchList/ItemSearchList";

type LightItem = { id: string; name: string };

export default function EditPreorderOfferPage() {
  const params = useParams<{ id: string }>();
  const routeId = typeof params?.id === "string" ? params.id : undefined;
  const router = useRouter();

  const {
    data: offer,
    isLoading,
    isError,
    refetch,
  } = useGetOfferQuery(routeId as string, { skip: !routeId });

  const {
    data: itemsData = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useListItemsQuery();

  const [updateOffer, { isLoading: saving }] = useUpdateOfferMutation();

  // ---------- Local state ----------
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    msg: string;
  }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Seed form when offer loads / changes
  useEffect(() => {
    if (!offer) return;
    setTitle(offer.title || "");
    setDescription(offer.description || "");
    setStartDate((offer.start_date as string) || "");
    setEndDate((offer.end_date as string) || "");
    setActive(Boolean(offer.active));

    let ids: string[] = [];
    if (Array.isArray(offer.items)) {
      ids = (offer.items as any[])
        .map((x) => (typeof x === "string" ? x : x.id))
        .filter(Boolean);
    } else if (Array.isArray((offer as any).item_ids)) {
      ids = (offer as any).item_ids.filter(Boolean);
    }
    setSelectedIds(ids);

    setErrors({});
    setStatus(null);
    setEditing(false);
  }, [offer]);

  const allItems = (itemsData || []) as LightItem[];

  const selectedItems: LightItem[] = useMemo(() => {
    if (!selectedIds?.length) return [];
    const map = new Map(allItems.map((it) => [it.id, it]));
    return selectedIds.map(
      (id) => map.get(id) || ({ id, name: id } as LightItem)
    );
  }, [selectedIds, allItems]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required.";
    if (!startDate) e.start_date = "Start date is required.";
    if (!endDate) e.end_date = "End date is required.";
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      e.end_date = "End date must be after start date.";
    }
    if (!selectedIds.length) e.items = "Please add at least one item.";
    return e;
  };

  const addItem = (it: LightItem) => {
    setSelectedIds((prev) => (prev.includes(it.id) ? prev : [...prev, it.id]));
    setErrors((p) => ({ ...p, items: "" }));
  };
  const removeItem = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleActive = async () => {
    if (!routeId || !offer) return;
    setStatus(null);
    try {
      await updateOffer({
        id: routeId,
        data: { active: !offer.active },
      }).unwrap();
      setStatus({
        type: "success",
        msg: `Offer ${offer.active ? "deactivated" : "activated"}.`,
      });
      refetch();
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        msg: err?.data?.error || "Failed to toggle active state.",
      });
    }
  };

  const onSave = async () => {
    if (!routeId) return;
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setStatus(null);
    try {
      // Only send fields the API expects; most backends accept partial PATCH
      await updateOffer({
        id: routeId,
        data: {
          title: title.trim(),
          description: description.trim(),
          start_date: startDate,
          end_date: endDate,
          active,
          item_ids: selectedIds, // array of business IDs
        },
      }).unwrap();

      setStatus({ type: "success", msg: "Offer updated." });
      setEditing(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        msg: err?.data?.error || "Failed to update offer.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <div className="h-7 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
        <div className="h-28 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          {isError ? "Failed to load offer." : "Offer not found."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Retry
          </button>
          <Link
            href="/preorder-offers"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            ← Back to offers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header / Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {offer.title || "Untitled offer"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">ID: {offer.id}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/preorder-offers"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Back
          </Link>

          <button
            onClick={toggleActive}
            className={`px-3 py-2 rounded ${
              offer.active
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } text-white`}
          >
            {offer.active ? "Set Inactive" : "Set Active"}
          </button>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setTitle(offer.title || "");
                  setDescription(offer.description || "");
                  setStartDate((offer.start_date as string) || "");
                  setEndDate((offer.end_date as string) || "");
                  setActive(Boolean(offer.active));
                  let ids: string[] = [];
                  if (Array.isArray(offer.items)) {
                    ids = (offer.items as any[])
                      .map((x) => (typeof x === "string" ? x : x.id))
                      .filter(Boolean);
                  } else if (Array.isArray((offer as any).item_ids)) {
                    ids = (offer as any).item_ids.filter(Boolean);
                  }
                  setSelectedIds(ids);
                  setErrors({});
                  setStatus(null);
                  setEditing(false);
                }}
                className="px-3 py-2 rounded border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`p-3 rounded ${
            status.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* VIEW MODE */}
      {!editing && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Detail label="Title" value={offer.title || "—"} />
            <Detail
              label="Status"
              value={offer.active ? "Active" : "Inactive"}
            />
            <Detail
              label="Start Date"
              value={
                offer.start_date
                  ? new Date(offer.start_date).toLocaleDateString()
                  : "—"
              }
            />
            <Detail
              label="End Date"
              value={
                offer.end_date
                  ? new Date(offer.end_date).toLocaleDateString()
                  : "—"
              }
            />
          </div>

          <div className="bg-white rounded border p-4">
            <h2 className="font-medium mb-2">Description</h2>
            <p className="text-gray-800 whitespace-pre-wrap">
              {offer.description ? offer.description : "—"}
            </p>
          </div>

          <div className="bg-white rounded border p-4">
            <h2 className="font-medium mb-3">Items</h2>
            {selectedItems.length === 0 ? (
              <p className="text-gray-600 text-sm">No items linked.</p>
            ) : (
              <ul className="divide-y">
                {selectedItems.map((it) => (
                  <li
                    key={it.id}
                    className="py-2 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-gray-500">{it.id}</div>
                    </div>
                    <Link
                      href={`/admin/items/${encodeURIComponent(it.id)}`}
                      className="text-sky-700 hover:underline text-sm"
                    >
                      View item
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODE */}
      {editing && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title" error={errors.title}>
              <input
                className="w-full border rounded p-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field label="Status">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span className="text-sm">
                  {active ? "Active" : "Inactive"}
                </span>
              </label>
            </Field>

            <Field label="Start Date" error={errors.start_date}>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>

            <Field label="End Date" error={errors.end_date}>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="bg-white rounded border p-4 space-y-4">
            <h2 className="font-medium">Items</h2>

            {/* Current selection */}
            <div>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-gray-500">No items added yet.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between border rounded p-2"
                    >
                      <span className="text-sm">
                        <span className="font-medium">{it.name}</span>
                        <span className="text-gray-500"> — {it.id}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.items && (
                <p className="text-red-600 text-sm mt-1">{errors.items}</p>
              )}
            </div>

            {/* Search & add (single API call already loaded at top) */}
            <ItemSearchList
              allItems={allItems}
              offerItemIds={selectedIds}
              onAdd={addItem}
              loading={itemsLoading}
            />

            {itemsError && (
              <p className="text-sm text-red-600">
                Failed to load items.{" "}
                <button className="underline" onClick={() => refetchItems()}>
                  Retry
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
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
