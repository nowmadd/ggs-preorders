"use client";

import { useEffect, useState } from "react";
import { useCreateGameMutation } from "@/lib/store/api/gamesApi";
import { optimizeImage } from "@/lib/images/optimizeImage";
import { uploadOptimizedImageToS3 } from "@/lib/s3/uploadImage";

export default function AddGamePage() {
  const [form, setForm] = useState({ id: "", game_title: "", game_image: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const [createGame, { isLoading: saving, isSuccess, isError }] =
    useCreateGameMutation();

  useEffect(() => {
    if (isSuccess) setSuccess("✅ Game added successfully!");
  }, [isSuccess]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.id.trim()) e.id = "ID is required (e.g. GAME-001).";
    if (!form.game_title.trim()) e.game_title = "Game title is required.";
    return e;
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
    setSuccess("");
  };

  const onPickImage: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploading(true);
      const { blob, suggestedFilename } = await optimizeImage(f, {
        maxWidth: 1600,
        maxHeight: 1600,
      });
      setLocalPreview(URL.createObjectURL(blob));
      const { key } = await uploadOptimizedImageToS3(
        new File([blob], suggestedFilename, { type: blob.type }),
        "games"
      );
      setForm((p) => ({ ...p, game_image: key }));
      setErrors((p) => ({ ...p, game_image: "" }));
    } catch (err) {
      console.error(err);
      setErrors((p) => ({ ...p, game_image: "Image upload failed." }));
      setLocalPreview(null);
      setForm((p) => ({ ...p, game_image: "" }));
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
    try {
      await createGame({
        id: form.id.trim(),
        game_title: form.game_title.trim(),
        game_image: form.game_image || undefined,
      }).unwrap();

      setForm({ id: "", game_title: "", game_image: "" });
      setLocalPreview(null);
      setErrors({});
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Game</h1>

      {success && (
        <p className="p-2 mb-4 text-green-700 bg-green-100 rounded">
          {success}
        </p>
      )}
      {isError && (
        <p className="p-2 mb-4 text-red-700 bg-red-100 rounded">
          Error adding game. Please try again.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">ID</label>
          <input
            name="id"
            value={form.id}
            onChange={onChange}
            className="w-full p-2 border rounded"
          />
          {errors.id && <p className="text-red-600 text-sm">{errors.id}</p>}
        </div>

        <div>
          <label className="block font-medium">Game Title</label>
          <input
            name="game_title"
            value={form.game_title}
            onChange={onChange}
            className="w-full p-2 border rounded"
          />
          {errors.game_title && (
            <p className="text-red-600 text-sm">{errors.game_title}</p>
          )}
        </div>

        <div>
          <label className="block font-medium">Image</label>
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
          {errors.game_image && (
            <p className="text-red-600 text-sm">{errors.game_image}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : uploading ? "Uploading…" : "Add Game"}
        </button>
      </form>
    </div>
  );
}
