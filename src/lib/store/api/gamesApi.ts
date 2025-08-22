import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type Game = {
  id: string; // explicit, client-provided (e.g. "GAME-001")
  game_title: string;
  game_image?: string;
};

export const gamesApi = createApi({
  reducerPath: "gamesApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Game"],
  endpoints: (builder) => ({
    listGames: builder.query<Game[], void>({
      query: () => "games",
      providesTags: (result) =>
        result
          ? [
              ...result.map((g) => ({ type: "Game" as const, id: g.id })),
              { type: "Game" as const, id: "LIST" },
            ]
          : [{ type: "Game" as const, id: "LIST" }],
    }),
    getGame: builder.query<Game, string>({
      query: (id) => `games/${encodeURIComponent(id)}`,
      providesTags: (_res, _err, id) => [{ type: "Game", id }],
    }),
    createGame: builder.mutation<
      Game,
      { id: string; game_title: string; game_image?: string | null }
    >({
      query: (body) => ({
        url: "games",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Game", id: "LIST" }],
    }),
    updateGame: builder.mutation<Game, { id: string; data: Partial<Game> }>({
      query: ({ id, data }) => ({
        url: `games/${encodeURIComponent(id)}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Game", id },
        { type: "Game", id: "LIST" },
      ],
    }),
    deleteGame: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `games/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Game", id },
        { type: "Game", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListGamesQuery,
  useGetGameQuery,
  useCreateGameMutation,
  useUpdateGameMutation,
  useDeleteGameMutation,
} = gamesApi;
