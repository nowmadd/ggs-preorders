"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useCreateItemMutation,
  useGetItemQuery,
} from "@/lib/store/api/itemsApi";
import { useListGamesQuery, type Game } from "@/lib/store/api/gamesApi";
import { optimizeImage } from "@/lib/images/optimizeImage";
import { uploadOptimizedImageToS3 } from "@/lib/s3/uploadImage";

type FormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  dp: string;
  discount: string;
  category: string;
  game?: Game;
  releaseDate: string;
  image: string;
};

export default function AddItemPage() {
  const [form, setForm] = useState<FormState>({
    id: "",
    name: "",
    description: "",
    price: "",
    dp: "",
    discount: "",
    category: "",
    game: undefined,
    releaseDate: "",
    image: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dpTouched, setDpTouched] = useState(false);

  const [createItem, { isLoading: saving, isSuccess, isError }] =
    useCreateItemMutation();

  const {
    data: games = [],
    isLoading: gamesLoading,
    isError: gamesError,
    refetch: refetchGames,
  } = useListGamesQuery();

  const sortedGames = useMemo(
    () =>
      [...(games as Game[])].sort((a, b) =>
        a.game_title.localeCompare(b.game_title)
      ),
    [games]
  );

  useEffect(() => {
    if (isSuccess) setSuccess("✅ Item added successfully!");
  }, [isSuccess]);

  const searchParams = useSearchParams();
  const copyOf = searchParams?.get("copyOf") ?? undefined;

  const { data: srcItem, isLoading: loadingSrc } = useGetItemQuery(
    copyOf as string,
    { skip: !copyOf }
  );

  useEffect(() => {
    if (!srcItem) return;

    const priceNum = Number(srcItem.price || 0);
    const releaseISO = srcItem.releaseDate
      ? new Date(srcItem.releaseDate).toISOString().slice(0, 10)
      : "";

    setForm({
      id: "",
      name: `${srcItem.name || srcItem.title || ""} (Copy)`.trim(),
      description: srcItem.description || "",
      price: Number.isFinite(priceNum) ? String(priceNum) : "",
      dp: String(Math.round(priceNum * 0.3)),
      discount:
        typeof srcItem.discount === "number" ? String(srcItem.discount) : "",
      category: typeof srcItem.category === "string" ? srcItem.category : "",
      game: (srcItem as any).game as Game | undefined,
      releaseDate: releaseISO,
      image: "",
    });

    setLocalPreview(null);
    setErrors({});
    setSuccess("");
    setDpTouched(false);
  }, [srcItem]);

  useEffect(() => {
    if (dpTouched) return;
    const p = Number(form.price);
    if (!Number.isFinite(p) || p <= 0) return;
    setForm((prev) => ({ ...prev, dp: String(Math.round(p * 0.3)) }));
  }, [form.price, dpTouched]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.id.trim()) e.id = "Item ID is required.";
    if (!form.name.trim()) e.name = "Product Name is required.";
    if (!form.price.trim() || Number.isNaN(Number(form.price)))
      e.price = "Valid price is required.";
    if (form.dp && Number(form.dp) < 0) e.dp = "DP cannot be negative.";
    if (form.discount && Number(form.discount) < 0)
      e.discount = "Discount cannot be negative.";
    if (!form.category.trim()) e.category = "Category is required.";
    if (!form.game) e.game = "Please select a game.";
    return e;
  };

  const onFieldChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    const { name, value } = e.target;
    if (name === "dp") setDpTouched(true);
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setSuccess("");
  };

  const onSelectGame: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const selectedId = e.target.value;
    const game = sortedGames.find((g) => g.id === selectedId);
    setForm((p) => ({ ...p, game }));
    setErrors((p) => ({ ...p, game: "" as any }));
  };

  const onPickImage: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { blob, suggestedFilename } = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
      });
      setLocalPreview(URL.createObjectURL(blob));
      const { key } = await uploadOptimizedImageToS3(
        new File([blob], suggestedFilename, { type: blob.type }),
        "items"
      );
      setForm((p) => ({ ...p, image: key }));
      setErrors((p) => ({ ...p, image: "" }));
    } catch (err) {
      console.error(err);
      setErrors((p) => ({ ...p, image: "Image upload failed." }));
      setForm((p) => ({ ...p, image: "" }));
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    await createItem({
      id: form.id.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      price: Number(form.price),
      dp: form.dp ? Number(form.dp) : 0,
      discount: form.discount ? Number(form.discount) : 0,
      category: form.category.trim(),
      game: form.game,
      releaseDate: form.releaseDate || undefined,
      image: form.image || undefined,
      images: [],
      title: form.name.trim(),
    }).unwrap();

    setForm({
      id: "",
      name: "",
      description: "",
      price: "",
      dp: "",
      discount: "",
      category: "",
      game: undefined,
      releaseDate: "",
      image: "",
    });
    setLocalPreview(null);
    setErrors({});
    setDpTouched(false);
  };

  const selectedGameId = form.game?.id ?? "";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Item</h1>

      {copyOf && (
        <p className="p-2 mb-4 text-amber-800 bg-amber-50 rounded">
          Duplicating from <span className="font-mono">{copyOf}</span>. Update
          the <b>Item ID</b>, <b>Product Name</b>, and <b>Image</b>.
        </p>
      )}

      {success && (
        <p className="p-2 mb-4 text-green-700 bg-green-100 rounded">
          {success}
        </p>
      )}
      {isError && (
        <p className="p-2 mb-4 text-red-700 bg-red-100 rounded">
          Error adding item. Please try again.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Item ID" error={errors.id}>
          <input
            name="id"
            value={form.id}
            onChange={onFieldChange}
            className="w-full p-2 border rounded"
            placeholder="ITEM-000123"
          />
        </Field>

        <Field label="Product Name" error={errors.name}>
          <input
            name="name"
            value={form.name}
            onChange={onFieldChange}
            className="w-full p-2 border rounded"
          />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            value={form.description}
            onChange={onFieldChange}
            className="w-full p-2 border rounded"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Price" error={errors.price}>
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={onFieldChange}
              className="w-full p-2 border rounded"
            />
          </Field>
          <Field label="Down Payment (auto 30%)" error={errors.dp}>
            <input
              name="dp"
              type="number"
              value={form.dp}
              onChange={onFieldChange}
              className="w-full p-2 border rounded"
            />
          </Field>
          <Field label="Discount (amount)" error={errors.discount}>
            <input
              name="discount"
              type="number"
              value={form.discount}
              onChange={onFieldChange}
              className="w-full p-2 border rounded"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Category (text)" error={errors.category}>
            <input
              name="category"
              value={form.category}
              onChange={onFieldChange}
              className="w-full p-2 border rounded"
            />
          </Field>
          <Field label="Game (object)" error={errors.game as string}>
            <select
              value={selectedGameId}
              onChange={onSelectGame}
              className="w-full border p-2 rounded"
              disabled={gamesLoading}
            >
              <option value="">
                {gamesLoading ? "Loading games..." : "Select Game"}
              </option>
              {sortedGames.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.game_title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Release Date">
          <input
            name="releaseDate"
            type="date"
            value={form.releaseDate}
            onChange={onFieldChange}
            className="w-full p-2 border rounded"
          />
        </Field>

        <Field label="Image" error={errors.image}>
          <input
            type="file"
            accept="image/*"
            onChange={onPickImage}
            className="w-full p-2 border rounded"
            disabled={uploading}
          />
          {localPreview && (
            <div className="mt-2 w-32 aspect-square rounded overflow-hidden border">
              <img
                src={localPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {uploading && (
            <p className="text-sm text-gray-600 mt-1">Uploading…</p>
          )}
        </Field>

        <button
          type="submit"
          disabled={saving || uploading || loadingSrc}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loadingSrc
            ? "Loading source…"
            : saving
            ? "Saving…"
            : uploading
            ? "Uploading…"
            : "Add Item"}
        </button>
      </form>
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
      <label className="block font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
