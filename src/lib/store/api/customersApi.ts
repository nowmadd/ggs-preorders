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
  googleId?: string;
  name?: string;
  email?: string;
  avatar?: string;
  image?: string;
  phone?: string;
  facebook?: string;
  birthday?: string;
  shipping?: Shipping;
  role?: "user" | "admin";
  // allow extra fields from server without breaking
  [key: string]: any;
};

type MeResponse = { customer: Customer; is_complete: boolean };

function toMeResponse(raw: any): MeResponse {
  // Accept either {customer,...} or a raw customer object (fallback)
  const customer = raw?.customer ?? raw ?? {};
  const is_complete =
    Boolean(customer?.phone) &&
    Boolean(customer?.shipping?.street) &&
    Boolean(customer?.shipping?.city) &&
    Boolean(customer?.shipping?.province) &&
    Boolean(customer?.shipping?.zip);

  return { customer, is_complete: raw?.is_complete ?? is_complete };
}

export const customersApi = createApi({
  reducerPath: "customersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api/" }),
  tagTypes: ["Me"],
  endpoints: (builder) => ({
    getMe: builder.query<MeResponse, void>({
      query: () => "customers/me",
      transformResponse: (response: any) => toMeResponse(response),
      providesTags: (_result) => [{ type: "Me", id: "SELF" }],
    }),
    updateMe: builder.mutation<
      MeResponse,
      Partial<
        Pick<
          Customer,
          "name" | "phone" | "facebook" | "birthday" | "shipping"
        > & { shipping?: Shipping }
      >
    >({
      query: (body) => ({
        url: "customers/me",
        method: "PATCH",
        body,
      }),
      transformResponse: (response: any) => toMeResponse(response),
      invalidatesTags: [{ type: "Me", id: "SELF" }],
    }),
  }),
});

export const { useGetMeQuery, useUpdateMeMutation } = customersApi;
