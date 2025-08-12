import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type Item = {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number;
  category?: string;
  releaseDate?: string;
  image?: string;
};

export const itemsApi = createApi({
  reducerPath: "itemsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }), // Pages API base
  tagTypes: ["Item"],
  endpoints: (builder) => ({
    listItems: builder.query<Item[], void>({
      query: () => "items",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Item" as const, id })),
              { type: "Item" as const, id: "LIST" },
            ]
          : [{ type: "Item" as const, id: "LIST" }],
    }),
    getItem: builder.query<Item, string>({
      query: (id) => `items/${encodeURIComponent(id)}`,
      providesTags: (_res, _err, id) => [{ type: "Item", id }],
    }),
    createItem: builder.mutation<Item, Partial<Item>>({
      query: (body) => ({ url: "items", method: "POST", body }),
      invalidatesTags: [{ type: "Item", id: "LIST" }],
    }),
    updateItem: builder.mutation<Item, { id: string; data: Partial<Item> }>({
      query: ({ id, data }) => ({
        url: `items/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Item", id }],
    }),
    deleteItem: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `items/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Item", id: "LIST" }],
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
