"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  useGetPreorderQuery,
  useUploadReceiptMutation,
  type PreorderItem,
} from "@/lib/store/api/preordersApi";

function fmt(n: number) {
  return `₱${Number(n || 0).toLocaleString()}`;
}

export default function ConfirmPreorderPage() {
  const params = useParams();
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const router = useRouter();
  const { data: session } = useSession();

  const {
    data: preorder,
    isLoading,
    isError,
    refetch,
  } = useGetPreorderQuery(id as string, { skip: !id });

  const [uploadReceipt, { isLoading: saving }] = useUploadReceiptMutation();

  // form state
  const [payType, setPayType] = useState<"dp" | "full">("dp");
  const [method, setMethod] = useState<"gcash" | "bank" | "other">("gcash");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState("");
  const [receiptBase64, setReceiptBase64] = useState("");
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    msg: string;
  }>(null);

  // compute totals from preorder.items/pricing (fallback to preorder.totals)
  const { totalPrice, totalDP } = useMemo(() => {
    if (!preorder) return { totalPrice: 0, totalDP: 0 };
    // Prefer detailed pricing if present
    const hasPricing = preorder.items?.every(
      (i) => i.pricing && typeof i.pricing.unit_final_price === "number"
    );
    if (hasPricing) {
      let price = 0;
      let dp = 0;
      for (const it of preorder.items) {
        price += it.pricing!.line_total_price || 0;
        dp += it.pricing!.line_total_dp || 0;
      }
      return { totalPrice: price, totalDP: dp };
    }
    // fallback to totals on the doc
    return {
      totalPrice: preorder.totals?.price || 0,
      totalDP: preorder.totals?.downpayment || 0,
    };
  }, [preorder]);

  // Default amount based on payType
  useMemo(() => {
    setAmount(payType === "dp" ? totalDP : totalPrice);
  }, [payType, totalDP, totalPrice]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setStatus({ type: "error", msg: "File too large (max 10MB)." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setReceiptBase64(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!id) {
      setStatus({ type: "error", msg: "Missing preorder id." });
      return;
    }
    if (!receiptBase64) {
      setStatus({ type: "error", msg: "Please upload a payment receipt." });
      return;
    }
    if (!amount || amount <= 0) {
      setStatus({ type: "error", msg: "Please enter a valid amount." });
      return;
    }

    try {
      await uploadReceipt({
        id,
        body: {
          payType,
          method,
          amount,
          reference: reference.trim() || undefined,
          paidAt: new Date().toISOString(),
          receipt_image_base64: receiptBase64,
        },
      }).unwrap();

      setStatus({ type: "success", msg: "Receipt submitted. Thank you!" });
      // e.g. route to "my preorders" or detail page
      // router.push(`/preorders/${encodeURIComponent(id)}`);
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        msg: "Could not submit receipt. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !preorder) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          {isError ? "Failed to load preorder." : "Preorder not found."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Retry
          </button>
          <Link href="/" className="px-3 py-2 rounded border hover:bg-gray-50">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Confirm Order</h1>
          <p className="text-sm text-gray-600 mt-1">
            Preorder ID: <span className="font-mono">{preorder.id}</span>
          </p>
          {session?.user?.email && (
            <p className="text-sm text-gray-600">
              Signed in as {session.user.email}
            </p>
          )}
        </div>
        <Link
          href={`/preorders/${encodeURIComponent(preorder.id)}`}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Back to Details
        </Link>
      </div>

      {/* Summary */}
      <div className="bg-white rounded border p-4">
        <h2 className="font-medium mb-3">Order Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3">Qty</th>
                <th className="py-2 px-3 text-right">Unit Price</th>
                <th className="py-2 px-3 text-right">Unit DP</th>
                <th className="py-2 px-3 text-right">Line Price</th>
                <th className="py-2 px-3 text-right">Line DP</th>
              </tr>
            </thead>
            <tbody>
              {preorder.items.map((it: PreorderItem) => {
                const title =
                  it.snapshot?.title ||
                  it.snapshot?.name ||
                  it.snapshot?.id ||
                  it.item_id;
                const unitPrice =
                  it.pricing?.unit_final_price ??
                  it.pricing?.unit_price ??
                  it.snapshot?.price ??
                  0;
                const unitDp = it.pricing?.unit_dp ?? it.snapshot?.dp ?? 0;
                const linePrice =
                  it.pricing?.line_total_price ?? unitPrice * it.quantity;
                const lineDp =
                  it.pricing?.line_total_dp ?? unitDp * it.quantity;
                const thumb = it.snapshot?.image;

                return (
                  <tr
                    key={it.item_id}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="py-2 px-3">
                      <div className="flex gap-3">
                        <div className="w-12 aspect-square rounded border bg-gray-50 overflow-hidden shrink-0">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="font-medium">{title}</div>
                          <div className="text-xs text-gray-500">
                            {it.snapshot?.id || it.item_id}
                          </div>
                          {it.snapshot?.category && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {it.snapshot.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">{it.quantity}</td>
                    <td className="py-2 px-3 text-right">{fmt(unitPrice)}</td>
                    <td className="py-2 px-3 text-right">{fmt(unitDp)}</td>
                    <td className="py-2 px-3 text-right">{fmt(linePrice)}</td>
                    <td className="py-2 px-3 text-right">{fmt(lineDp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex flex-col sm:flex-row gap-6 justify-end">
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Down Payment</div>
            <div className="text-lg font-semibold">{fmt(totalDP)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Price</div>
            <div className="text-lg font-semibold">{fmt(totalPrice)}</div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <form onSubmit={submit} className="bg-white rounded border p-4 space-y-4">
        <h2 className="font-medium">Payment</h2>

        {/* Pay type */}
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="payType"
              value="dp"
              checked={payType === "dp"}
              onChange={() => setPayType("dp")}
            />
            <span>Pay Downpayment ({fmt(totalDP)})</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="payType"
              value="full"
              checked={payType === "full"}
              onChange={() => setPayType("full")}
            />
            <span>Pay in Full ({fmt(totalPrice)})</span>
          </label>
        </div>

        {/* Method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full border rounded p-2"
            >
              <option value="gcash">GCash</option>
              <option value="bank">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount You Sent
            </label>
            <input
              type="number"
              min={0}
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
              className="w-full border rounded p-2 text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reference No. (optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="e.g. GCASH-12345"
            />
          </div>
        </div>

        {/* Receipt */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Upload Receipt (image)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onPickFile}
            className="w-full border rounded p-2"
          />
          {receiptBase64 && (
            <div className="mt-2 w-32 aspect-square">
              <img
                src={receiptBase64}
                alt="Receipt preview"
                className="w-full h-full object-cover rounded border"
              />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Max 10MB. JPG/PNG.</p>
        </div>

        {status && (
          <div
            className={`p-3 rounded ${
              status.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Confirm & Upload Receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}
