import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type GameRef = {
  id: string;
  game_title: string;
  game_image?: string;
};

export type Item = {
  id: string;
  name: string;
  title?: string;
  description?: string;
  price: number;
  dp: number;
  discount?: number;
  category?: string;
  releaseDate?: string;
  image?: string;
  images?: string[];
  game?: GameRef | null;
};

export const itemsApi = createApi({
  reducerPath: "itemsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Item"],
  endpoints: (builder) => ({
    listItems: builder.query<Item[], void>({
      query: () => "items",
      providesTags: (result) =>
        result
          ? [
              ...result.map((i) => ({ type: "Item" as const, id: i.id })),
              { type: "Item" as const, id: "LIST" },
            ]
          : [{ type: "Item" as const, id: "LIST" }],
    }),
    getItem: builder.query<Item, string>({
      query: (id) => `items/${encodeURIComponent(id)}`,
      providesTags: (_r, _e, id) => [{ type: "Item", id }],
    }),
    createItem: builder.mutation<Item, Partial<Item>>({
      query: (body) => ({
        url: "items",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Item", id: "LIST" }],
    }),
    updateItem: builder.mutation<Item, { id: string; data: Partial<Item> }>({
      query: ({ id, data }) => ({
        url: `items/${encodeURIComponent(id)}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
      ],
    }),
    deleteItem: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `items/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Item", id },
        { type: "Item", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListItemsQuery,
  useGetItemQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} = itemsApi;
