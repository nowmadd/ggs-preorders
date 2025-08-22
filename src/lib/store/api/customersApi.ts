import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type Shipping = {
  street?: string;
  brgy?: string;
  city?: string;
  province?: string;
  zip?: string;
};
export type Customer = {
  user_id: string;
  google_id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  facebook?: string;
  birthday?: string;
  shipping?: Shipping;
  created_at?: string;
  updated_at?: string;
};
export type MeResponse = {
  ok: boolean;
  customer: Customer;
  is_complete: boolean;
};

export const customersApi = createApi({
  reducerPath: "customersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Me"],
  endpoints: (b) => ({
    getMe: b.query<MeResponse, void>({
      query: () => "customers/me",
      providesTags: [{ type: "Me", id: "SELF" }],
    }),
    updateMe: b.mutation<
      MeResponse,
      Partial<Pick<Customer, "phone" | "facebook" | "birthday">> & {
        shipping?: Shipping;
      }
    >({
      query: (body) => ({
        url: "customers/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Me", id: "SELF" }],
    }),
  }),
});

export const { useGetMeQuery, useUpdateMeMutation } = customersApi;
