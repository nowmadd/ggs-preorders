"use client";

import Link from "next/link";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  useGetGameQuery,
  useUpdateGameMutation,
  useDeleteGameMutation,
  type Game,
} from "@/lib/store/api/gamesApi";
import { useEffect, useState } from "react";
import { useS3Image } from "@/lib/s3/useS3Image";
import { optimizeImage } from "@/lib/images/optimizeImage";
import { uploadOptimizedImageToS3 } from "@/lib/s3/uploadImage";
import { deleteS3Object } from "@/lib/s3/deleteObject";

export default function AdminGameDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : undefined; // business id (client-provided)
  const search = useSearchParams();
  const startInEdit = search?.get("edit") === "1";
  const router = useRouter();

  const {
    data: game,
    isLoading,
    isError,
    refetch,
  } = useGetGameQuery(id!, { skip: !id });

  const [updateGame, { isLoading: saving }] = useUpdateGameMutation();
  const [deleteGame, { isLoading: deleting }] = useDeleteGameMutation();

  const [editing, setEditing] = useState(!!startInEdit);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<Game>>({});
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    msg: string;
  }>(null);

  useEffect(() => {
    if (game && editing) {
      setForm({
        id: game.id,
        game_title: game.game_title,
        game_image: game.game_image || "",
      });
      setLocalPreview(null);
      setStatus(null);
    }
  }, [game, editing]);

  const displayKey =
    localPreview || (editing ? (form.game_image as string) : game?.game_image);
  const imgUrl = useS3Image(displayKey || undefined);

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
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "Image upload failed." });
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setStatus(null);
  };

  const save = async () => {
    if (!id) return;
    try {
      const oldKey =
        typeof game?.game_image === "string" &&
        !/^https?:\/\//.test(game.game_image)
          ? game.game_image
          : null;
      const newKey =
        typeof form.game_image === "string" &&
        !/^https?:\/\//.test(form.game_image)
          ? form.game_image
          : null;

      await updateGame({
        id,
        data: {
          game_title: form.game_title?.trim() || undefined,
          game_image: form.game_image || undefined,
          // id is immutable here
        },
      }).unwrap();

      if (oldKey && newKey && oldKey !== newKey) {
        deleteS3Object(oldKey).catch(() => {});
      }

      setStatus({ type: "success", msg: "Game updated." });
      setEditing(false);
      setLocalPreview(null);
      refetch();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "Failed to update game." });
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = confirm("Delete this game? This cannot be undone.");
    if (!ok) return;
    try {
      const keyToDelete =
        typeof game?.game_image === "string" &&
        !/^https?:\/\//.test(game.game_image)
          ? game.game_image
          : null;

      await deleteGame(id).unwrap();

      if (keyToDelete) deleteS3Object(keyToDelete).catch(() => {});
      router.push("/admin/games");
    } catch (err) {
      console.error(err);
      alert("Could not delete game. Try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-100 p-3 rounded">
          {isError ? "Failed to load game." : "Game not found."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Retry
          </button>
          <Link
            href="/admin/games"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            ← Back to games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {editing
              ? (form.game_title as string) || "(Untitled)"
              : game.game_title}
          </h1>
          <p className="text-sm text-gray-600 mt-1">ID: {game.id}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/games"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Back
          </Link>

          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  setStatus(null);
                  setLocalPreview(null);
                }}
                className="px-3 py-2 rounded border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
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

      <div className="w-full flex">
        <div className="w-64 aspect-square rounded border overflow-hidden bg-gray-50">
          {imgUrl ? (
            <img
              key={imgUrl}
              src={imgUrl}
              alt={game.game_title}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
      </div>

      {!editing ? (
        <div className="bg-white rounded border p-4">
          <h2 className="font-medium mb-2">Details</h2>
          <div className="text-sm text-gray-800 space-y-1">
            <div>
              <span className="text-gray-500">Title:</span> {game.game_title}
            </div>
            <div>
              <span className="text-gray-500">ID:</span> {game.id}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-white rounded border p-4">
          <Field label="Game Title">
            <input
              name="game_title"
              value={(form.game_title as string) || ""}
              onChange={onChange}
              className="w-full border rounded p-2"
            />
          </Field>

          <Field label="ID (read-only)">
            <input
              value={game.id}
              disabled
              className="w-full border rounded p-2 bg-gray-50 text-gray-600"
            />
          </Field>

          <Field label="Image">
            <input
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="w-full"
              disabled={uploading}
            />
            {(localPreview || imgUrl) && (
              <div className="mt-2 w-32 aspect-square rounded overflow-hidden border">
                <img
                  key={(localPreview || imgUrl)!}
                  src={localPreview || imgUrl!}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}
