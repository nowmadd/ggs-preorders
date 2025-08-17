import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type PreorderItem = {
  item_id: string;
  quantity: number;
  pricing?: {
    unit_price: number;
    unit_discount_pct?: number;
    unit_final_price: number;
    unit_dp: number;
    line_total_price: number;
    line_total_dp: number;
  };
  snapshot?: {
    id: string;
    name: string;
    title?: string;
    description?: string;
    price?: number;
    dp?: number;
    discount?: number;
    category?: string;
    releaseDate?: string;
    image?: string;
    images?: string[];
  };
};

export type PreorderSummary = {
  id: string;
  customer_id: string;
  offer_id?: string | null;
  status: "pending" | "confirmed" | "cancelled";
  payment_status: "unpaid" | "partially_paid" | "paid";
  shipping_status: "not_shipped" | "shipped" | "delivered";
  totals?: { price?: number; downpayment?: number };
  created_at?: string;
};

export type Preorder = {
  id: string;
  offer_id: string;
  customer_id?: string | null;
  items: PreorderItem[];
  totals: { price: number; downpayment: number };
  status?: "pending" | "paid_partial" | "paid_full" | string;
};

export const preordersApi = createApi({
  reducerPath: "preordersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Preorder"],
  endpoints: (builder) => ({
    getPreorder: builder.query<Preorder, string>({
      query: (id) => `preorders/${encodeURIComponent(id)}`,
      providesTags: (_r, _e, id) => [{ type: "Preorder", id }],
    }),
    // JSON payload (base64 image)
    uploadReceipt: builder.mutation<
      { ok: boolean },
      {
        id: string;
        body: {
          payType: "dp" | "full";
          method: "gcash" | "bank" | "other";
          amount: number;
          reference?: string;
          paidAt?: string;
          receipt_image_base64: string;
        };
      }
    >({
      query: ({ id, body }) => ({
        url: `preorders/${encodeURIComponent(id)}/receipt`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Preorder", id }],
    }),
    listMyPreorders: builder.query<PreorderSummary[], void>({
      query: () => "preorders?mine=1",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Preorder" as const, id })),
              { type: "Preorder" as const, id: "LIST" },
            ]
          : [{ type: "Preorder" as const, id: "LIST" }],
    }),
  }),
});

export const {
  useGetPreorderQuery,
  useUploadReceiptMutation,
  useListMyPreordersQuery,
} = preordersApi;
