"use client";

import { useMemo, useState } from "react";

export type ItemLite = {
  id: string;
  name: string;
};

export default function ItemSearchList({
  allItems,
  offerItemIds,
  onAdd,
  loading,
}: {
  allItems: ItemLite[];
  offerItemIds: string[];
  onAdd: (item: ItemLite) => void;
  loading?: boolean;
}) {
  const [q, setQ] = useState("");

  const offerSet = useMemo(() => new Set(offerItemIds), [offerItemIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return allItems
      .filter((it) => !offerSet.has(it.id))
      .filter(
        (it) =>
          it.id.toLowerCase().includes(term) ||
          it.name.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [q, allItems, offerSet]);

  return (
    <div className="space-y-3">
      <input
        className="w-full border rounded p-2"
        placeholder="Search items by ID or name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <ul className="divide-y border rounded">
        {loading ? (
          <li className="p-3 text-sm text-gray-500">Loading items…</li>
        ) : q.length >= 2 && filtered.length === 0 ? (
          <li className="p-3 text-sm text-gray-500">No matches.</li>
        ) : (
          filtered.map((it) => (
            <li key={it.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-gray-500">{it.id}</div>
              </div>
              <button
                type="button"
                onClick={() => onAdd(it)}
                className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Add
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
