// app/admin/preorders/add/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useListItemsQuery } from "../../../../lib/store/api/itemsApi";
import { useCreateOfferMutation } from "../../../../lib/store/api/offersApi";

type Item = {
  id: string; // business id (e.g., ITEM-001)
  name: string;
  price?: number;
};

type OfferForm = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  active: boolean;
  banner: string; // base64 or URL
  items: Item[]; // selected items
};

export default function NewPreorderOffer() {
  const [form, setForm] = useState<OfferForm>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    active: true,
    banner: "",
    items: [],
  });

  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔥 RTK Query: load items for manual search
  const {
    data: itemsData = [],
    isLoading: loadingItems,
    isError: itemsError,
    refetch,
  } = useListItemsQuery();

  const [createOffer, { isLoading: creating }] = useCreateOfferMutation();

  // --- Manual search state ---
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (itemsData as Item[])
      .filter(
        (it) =>
          it.name?.toLowerCase().includes(q) || it.id?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, itemsData]);

  const addItem = (it: Item) => {
    if (form.items.some((x) => x.id === it.id)) return;
    setForm((prev) => ({ ...prev, items: [...prev.items, it] }));
    setSearch("");
    setErrors((p) => ({ ...p, items: "" }));
  };

  const addByExactInput = () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const list = itemsData as Item[];
    const match =
      list.find((it) => it.id?.toLowerCase() === q) ||
      list.find((it) => it.name?.toLowerCase() === q) ||
      results[0];
    if (match) addItem(match);
  };

  const removeItem = (businessId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== businessId),
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked, files } = target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (type === "file") {
      const file = files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () =>
          setForm((prev) => ({ ...prev, banner: reader.result as string }));
        reader.readAsDataURL(file);
      }
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.start_date) e.start_date = "Start date is required.";
    if (!form.end_date) e.end_date = "End date is required.";
    if (
      form.start_date &&
      form.end_date &&
      new Date(form.start_date) > new Date(form.end_date)
    ) {
      e.end_date = "End date must be after start date.";
    }
    if (!form.items.length) e.items = "Please add at least one item.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    try {
      await createOffer({
        id: `OFFER-${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        active: form.active,
        banner: form.banner || undefined,
        item_ids: form.items.map((it) => it.id),
      }).unwrap();

      setStatus({ type: "success", message: "Preorder offer created 🎉" });
      setForm({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        active: true,
        banner: "",
        items: [],
      });
      setErrors({});
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: "Could not create offer. Try again.",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create Preorder Offer</h1>

      {status && (
        <div
          className={`mb-4 p-3 rounded ${
            status.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Items load error (from RTK) */}
      {itemsError && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700">
          Failed to load items.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded-lg p-6 space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Early Bird Promo"
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Describe preorder perks, freebies, etc."
            rows={4}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            {errors.start_date && (
              <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            {errors.end_date && (
              <p className="text-red-600 text-sm mt-1">{errors.end_date}</p>
            )}
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
          />
          <span className="text-sm">Active</span>
        </div>

        {/* Banner image */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Banner Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
          {form.banner && (
            <img
              src={form.banner}
              alt="banner preview"
              className="w-48 h-28 object-cover mt-2 rounded border"
            />
          )}
        </div>

        {/* Item search & add */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Add Items (search by name or ID)
          </label>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addByExactInput();
                }
              }}
              className="flex-1 border rounded p-2"
              placeholder="Type 'ITEM-001' or item name…"
            />
            <button
              type="button"
              onClick={addByExactInput}
              className="px-3 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
            >
              Add
            </button>
          </div>

          {/* Suggestions */}
          {search && (
            <div className="mt-2 border rounded p-2 bg-gray-50">
              {loadingItems ? (
                <p className="text-sm text-gray-500">Loading items…</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-gray-500">No matches.</p>
              ) : (
                <ul className="space-y-1">
                  {results.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        <span className="font-medium">{it.name}</span>
                        {it.id ? (
                          <span className="text-gray-500"> — {it.id}</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => addItem(it)}
                        className="text-sm px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {errors.items && (
            <p className="text-red-600 text-sm mt-1">{errors.items}</p>
          )}
        </div>

        {/* Selected items */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Selected Items
          </label>
          {form.items.length === 0 ? (
            <p className="text-sm text-gray-500">No items added yet.</p>
          ) : (
            <ul className="space-y-2">
              {form.items.map((it) => (
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
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Offer"}
          </button>
        </div>
      </form>
    </div>
  );
}
