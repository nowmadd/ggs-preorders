"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useParams,
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  useGetPreorderQuery,
  useUploadReceiptMutation,
  type PreorderItem,
} from "@/lib/store/api/preordersApi";
import S3Thumb from "@/components/S3Thumb/S3Thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";

// ✅ shadcn/ui Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { data: session, status } = useSession();

  // build a safe callback back to this page
  const pathname = usePathname();
  const search = useSearchParams();
  const callbackUrl = useMemo(() => {
    const qs = search?.toString();
    return qs ? `${pathname}?${qs}` : pathname || "/";
  }, [pathname, search]);

  // kick guests to login, then back here
  useEffect(() => {
    if (status === "unauthenticated") signIn(undefined, { callbackUrl });
  }, [status, callbackUrl]);

  const {
    data: preorder,
    isLoading,
    isError,
    refetch,
  } = useGetPreorderQuery(id as string, {
    skip: !id || status !== "authenticated",
  });

  const [uploadReceipt, { isLoading: saving }] = useUploadReceiptMutation();

  // form state
  const [payType, setPayType] = useState<"dp" | "full">("dp");
  const [method, setMethod] = useState<"gcash" | "bank" | "other">("gcash");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState("");

  // receipt states
  const [receiptBase64, setReceiptBase64] = useState<string>(""); // fallback
  const [receiptKey, setReceiptKey] = useState<string | null>(null); // S3 key when upload succeeds
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // compute totals
  const { totalPrice, totalDP } = useMemo(() => {
    if (!preorder) return { totalPrice: 0, totalDP: 0 };
    const hasPricing = Array.isArray(preorder.items)
      ? preorder.items.every(
          (i: any) =>
            i.pricing && typeof i.pricing.unit_final_price === "number"
        )
      : false;

    if (hasPricing && preorder.items) {
      let price = 0;
      let dp = 0;
      for (const it of preorder.items as PreorderItem[]) {
        price += it.pricing!.line_total_price || 0;
        dp += it.pricing!.line_total_dp || 0;
      }
      return { totalPrice: price, totalDP: dp };
    }
    return {
      totalPrice: preorder.totals?.price || 0,
      totalDP: preorder.totals?.downpayment || 0,
    };
  }, [preorder]);

  useEffect(() => {
    setAmount(payType === "dp" ? totalDP : totalPrice);
  }, [payType, totalDP, totalPrice]);

  const isAdmin = (session?.user as any)?.role === "admin";
  const isOwner =
    preorder && session?.user?.id
      ? String(preorder.customer_id) === String((session.user as any).id)
      : false;
  const notOwner =
    status === "authenticated" && preorder && !isAdmin && !isOwner;

  // --- S3 upload helper
  async function uploadToS3(file: File, folder = "preorder-receipts") {
    const qs = new URLSearchParams({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder,
    });
    const presign = await fetch(`/api/s3/presign?${qs.toString()}`);
    if (!presign.ok) throw new Error("Failed to get presigned URL");
    const { uploadUrl, key } = await presign.json();

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) throw new Error("Upload to S3 failed");
    return key as string;
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\//i.test(file.type)) {
      notify.error("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error("File too large (max 10MB).");
      return;
    }

    // Local preview
    setReceiptPreview(URL.createObjectURL(file));

    // Prepare base64 fallback immediately
    const toBase64 = () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

    try {
      setUploading(true);
      const key = await uploadToS3(file, "preorder-receipts");
      setReceiptKey(key);
      setReceiptBase64(""); // not needed if S3 worked
      notify.success("Receipt uploaded.");
    } catch (err) {
      console.error(err);
      // fallback to base64
      try {
        const b64 = await toBase64();
        setReceiptKey(null);
        setReceiptBase64(b64);
        notify.error("S3 upload failed. Using direct attachment instead.");
      } catch (e) {
        notify.error("Could not read the file. Please try again.");
        setReceiptKey(null);
        setReceiptBase64("");
        setReceiptPreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      notify.error("Missing preorder id.");
      return;
    }
    if (!receiptKey && !receiptBase64) {
      notify.error("Please upload a payment receipt.");
      return;
    }
    if (!amount || amount <= 0) {
      notify.error("Please enter a valid amount.");
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
          // prefer S3 key; fall back to base64 for older backends
          ...(receiptKey
            ? { receipt_image_key: receiptKey }
            : { receipt_image_base64: receiptBase64 }),
        } as any,
      }).unwrap();

      notify.success("Receipt submitted. Thank you!");
      // optionally route somewhere:
      // router.push(`/preorders/${encodeURIComponent(id)}`);
    } catch (err) {
      console.error(err);
      notify.error("Could not submit receipt.", {
        description: "Please try again.",
      });
    }
  };

  // loading
  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className=" mx-auto space-y-3">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }
  if (status === "unauthenticated") return null;

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          Failed to load preorder.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Link href="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!preorder) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          Preorder not found.
        </p>
        <Link href="/">
          <Button variant="outline" className="mt-3">
            ← Back
          </Button>
        </Link>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="mx-auto space-y-3">
        <h1 className="text-xl font-semibold">403 — Not Authorized</h1>
        <p className="text-gray-700">
          This preorder belongs to a different account.
        </p>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6">
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
          href={`/preorder/new?offerId=${encodeURIComponent(
            preorder.offer_id
          )}`}
        >
          <Button>Back</Button>
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
              {(preorder.items || []).map((it: PreorderItem) => {
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

                return (
                  <tr
                    key={it.item_id}
                    className="border-b last:border-0 align-top"
                  >
                    <td className="py-2 px-3">
                      <div className="flex gap-3">
                        <div className="w-12 aspect-square rounded border bg-gray-50 overflow-hidden shrink-0">
                          <S3Thumb
                            src={it.snapshot?.image}
                            alt={title}
                            className="w-full h-full object-cover"
                            emptyClassName="w-full h-full bg-gray-100"
                          />
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ✅ shadcn/ui Select replaces native <select> */}
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as "gcash" | "bank" | "other")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Amount You Sent
            </label>
            <Input
              type="number"
              min={0}
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
              className="w-full text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reference No. (optional)
            </label>
            <Input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. GCASH-12345"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Upload Receipt (image)
          </label>
          <Input
            type="file"
            accept="image/*"
            onChange={onPickFile}
            disabled={uploading}
          />
          {receiptPreview && (
            <div className="mt-2 w-32 aspect-square">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-full object-cover rounded border"
              />
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Max 10MB. JPG/PNG. {uploading ? "Uploading…" : ""}
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Submitting…" : "Confirm & Upload Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
