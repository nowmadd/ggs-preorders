"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useListGamesQuery, type Game } from "@/lib/store/api/gamesApi";
import { useS3Image } from "@/lib/s3/useS3Image";

function GameThumb({ keyOrUrl, alt }: { keyOrUrl?: string; alt: string }) {
  const url = useS3Image(keyOrUrl);
  if (!url) return <div className="w-12 h-12 bg-gray-200 rounded" />;
  return <img src={url} alt={alt} className="w-12 h-12 object-cover rounded" />;
}

export default function AdminGamesPage() {
  const { data, isLoading, isError, refetch } = useListGamesQuery();
  const games = (data || []) as Game[];

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return games.filter((g) => {
      if (!term) return true;
      return (
        g.game_title.toLowerCase().includes(term) ||
        g.id.toLowerCase().includes(term)
      );
    });
  }, [q, games]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Games</h1>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link
            href="/admin/games/add"
            className="inline-flex items-center px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            + New Game
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or ID…"
          className="flex-1 border rounded p-2"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 bg-gray-200 animate-pulse rounded" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="p-4 rounded border bg-red-50 text-red-700">
          Failed to load games.{" "}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
          .
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="p-4 rounded border bg-white">
          <p className="text-gray-600">No games found.</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="overflow-x-auto bg-white rounded border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-3">Image</th>
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <GameThumb keyOrUrl={g.game_image} alt={g.game_title} />
                  </td>
                  <td className="py-2 px-3 font-medium">{g.game_title}</td>
                  <td className="py-2 px-3 text-gray-700">{g.id}</td>
                  <td className="py-2 px-3 text-right space-x-2">
                    <Link
                      href={`/admin/games/${encodeURIComponent(g.id)}`}
                      className="text-sky-700 hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/games/${encodeURIComponent(g.id)}?edit=1`}
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
