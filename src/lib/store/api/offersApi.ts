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

export type OfferItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number;
  category?: string;
  releaseDate?: string;
  image?: string;
  images?: string[];
  title: string;
};

export type OfferWithItems = Offer & { items: OfferItem[] };

export const offersApi = createApi({
  reducerPath: "offersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Offer"],
  endpoints: (builder) => ({
    listOffers: builder.query<OfferWithItems[], void>({
      query: () => "preorder-offers",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Offer" as const, id })),
              { type: "Offer" as const, id: "LIST" },
            ]
          : [{ type: "Offer" as const, id: "LIST" }],
    }),

    getOffer: builder.query<OfferWithItems, string>({
      query: (id) => `preorder-offers/${encodeURIComponent(id)}?include=items`,
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
