import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type Offer = {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  active: boolean;
  banner?: string;
};

export const offersApi = createApi({
  reducerPath: "offersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Offer"],
  endpoints: (builder) => ({
    listOffers: builder.query<Offer[], void>({
      query: () => "preorder-offers",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Offer" as const, id })),
              { type: "Offer" as const, id: "LIST" },
            ]
          : [{ type: "Offer" as const, id: "LIST" }],
    }),
    getOffer: builder.query<any, string>({
      query: (id) => `preorder-offers/${encodeURIComponent(id)}`,
      providesTags: (_r, _e, id) => [{ type: "Offer", id }],
    }),
    createOffer: builder.mutation<any, any>({
      query: (body) => ({ url: "preorder-offers", method: "POST", body }),
      invalidatesTags: [{ type: "Offer", id: "LIST" }],
    }),
    deleteOffer: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `preorder-offers/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Offer", id: "LIST" }],
    }),
  }),
});

export const {
  useListOffersQuery,
  useGetOfferQuery,
  useCreateOfferMutation,
  useDeleteOfferMutation,
} = offersApi;
