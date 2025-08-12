import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type Category = {
  _id?: string;
  game_code: string;
  game_title: string;
};

export const gamesApi = createApi({
  reducerPath: "gamesApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    listCategories: builder.query<Category[], void>({
      query: () => "games",
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({
                type: "Category" as const,
                id: c.game_code,
              })),
              { type: "Category" as const, id: "LIST" },
            ]
          : [{ type: "Category" as const, id: "LIST" }],
    }),
    createCategory: builder.mutation<
      Category,
      Pick<Category, "game_code" | "game_title">
    >({
      query: (body) => ({
        url: "games",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    // (optional) add update/delete here later:
    // updateCategory: builder.mutation<Category, { game_code: string; data: Partial<Category> }>(...),
    // deleteCategory: builder.mutation<{ ok: boolean }, string>(...),
  }),
});

export const {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  // useUpdateCategoryMutation,
  // useDeleteCategoryMutation,
} = gamesApi;
