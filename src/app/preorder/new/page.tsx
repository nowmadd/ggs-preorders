"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { useGetOfferQuery } from "@/lib/store/api/offersApi";
import { prefetchS3Images, resolveS3Image } from "@/lib/s3/useS3Image";
import { useGlobalSheet } from "@/components/GlobalSheetProvider/GlobalSheetProvider";
import { formatDate } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import ReCAPTCHA from "react-google-recaptcha";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { notify } from "@/lib/notify";

type OfferItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number; // percent
  category?: string;
  releaseDate?: string;
  image?: string;
  images?: string[];
  title?: string;
  game?: any;
};

type OfferWithItems = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  active: boolean;
  items?: OfferItem[];
};

export function ItemRowSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Skeleton className="w-16 h-16 rounded-sm shrink-0" />
          <div className="min-w-0 space-y-1">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right space-y-1">
            <Skeleton className="h-5 w-24 ml-auto" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
          <Skeleton className="w-16 sm:w-20 h-10 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SummarySkeleton() {
  return (
    <div className="lg:sticky lg:top-6 space-y-4">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-10 mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border">
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-3 rounded-xl border">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
      <Skeleton className="h-10 rounded-xl" />
    </div>
  );
}

function fmtPHP(n: number) {
  return `PHP ${Number(n || 0).toLocaleString()}`;
}

export default function NewPreorderFromOfferPage() {
  const router = useRouter();
  const offerId = useSearchParams()?.get("offerId") ?? undefined;
  const { data: session } = useSession();
  const { show } = useGlobalSheet();

  const {
    data: offer,
    isLoading,
    isError,
    refetch,
  } = useGetOfferQuery(offerId as string, { skip: !offerId });

  // qty per itemId
  const [qty, setQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // images prefetch gate
  const [imagesReady, setImagesReady] = useState(false);
  const [resolvedThumbs, setResolvedThumbs] = useState<Record<string, string>>(
    {}
  );

  // Confirmation dialog + captcha
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [captchaQ, setCaptchaQ] = useState<{ a: number; b: number }>({
    a: 0,
    b: 0,
  });
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const makeCaptcha = () => {
    const a = Math.floor(10 + Math.random() * 40); // 10..49
    const b = Math.floor(1 + Math.random() * 9); // 1..9
    setCaptchaQ({ a, b });
    setCaptchaInput("");
    setCaptchaError(null);
  };

  // Prefetch item images when the offer arrives (S3 presign via /api/s3/geturl)
  useEffect(() => {
    (async () => {
      if (!offer?.items) return;
      setImagesReady(false);

      try {
        const sources: string[] = [];
        for (const it of offer.items) {
          if (it.image) sources.push(it.image);
          if (Array.isArray(it.images) && it.images[0])
            sources.push(it.images[0]);
        }

        const map = await prefetchS3Images(sources, "items");
        const byId: Record<string, string> = {};
        for (const it of offer.items) {
          const src = it.image;
          if (src) {
            const url =
              map[src] || (await resolveS3Image(src, "items")) || undefined;
            if (url) byId[it.id] = url;
          }
        }
        setResolvedThumbs(byId);
        setImagesReady(true);
      } catch (e) {
        console.error(e);
        setImagesReady(true); // don't block the page
        notify.error("Some images failed to load.");
      }
    })();
  }, [offer?.items]);

  // Seed qty state
  useEffect(() => {
    if (offer?.items) {
      const init: Record<string, number> = {};
      for (const it of offer.items) init[it.id] = 0;
      setQty(init);
    }
  }, [offer?.items]);

  const setItemQty = (id: string, val: number) => {
    const clean = Math.max(0, Math.floor(val || 0));
    setQty((prev) => ({ ...prev, [id]: clean }));
  };

  // Compute pricing lines
  const { totalPrice, totalDP, lines, totalQty } = useMemo(() => {
    const items = (offer?.items ?? []) as OfferItem[];
    let price = 0;
    let dpTotal = 0;
    let qSum = 0;

    const rows = items.map((it) => {
      const q = qty[it.id] || 0;
      qSum += q;

      const base = Number(it.price || 0);
      const discPct = Number(it.discount || 0);
      const finalUnit = Math.max(0, Math.round((base * (100 - discPct)) / 100));
      const dp = Number(it.dp || 0);

      const lineTotal = finalUnit * q;
      const lineDp = dp * q;

      price += lineTotal;
      dpTotal += lineDp;

      return {
        ...it,
        q,
        unitBasePrice: base,
        unitDiscountPct: discPct,
        unitFinalPrice: finalUnit,
        unitDp: dp,
        lineTotal,
        lineDp,
      };
    });

    return { totalPrice: price, totalDP: dpTotal, lines: rows, totalQty: qSum };
  }, [offer?.items, qty]);

  // Submit handler
  const actuallySubmit = async () => {
    if (!offerId) {
      notify.error("Missing offerId in URL.");
      return;
    }
    if (totalQty === 0) {
      notify.error("Please enter at least one item quantity.");
      return;
    }
    if (!session?.user) {
      notify.error("Please sign in to place a preorder.");
      return;
    }

    try {
      setSubmitting(true);

      const customerId = (session.user as any)?.id || null;

      const payload = {
        offer_id: offerId,
        customer_id: customerId,
        items: lines
          .filter((l) => l.q > 0)
          .map((l) => ({
            item_id: l.id,
            quantity: l.q,
            snapshot: {
              id: l.id,
              name: l.name,
              description: l.description,
              category: l.category,
              releaseDate: l.releaseDate,
              image: l.image,
              images: l.images ?? [],
              price: l.unitBasePrice,
              discount: l.unitDiscountPct,
              dp: l.unitDp,
            },
            pricing: {
              unit_price: l.unitBasePrice,
              unit_discount_pct: l.unitDiscountPct,
              unit_final_price: l.unitFinalPrice,
              unit_dp: l.unitDp,
              line_total_price: l.lineTotal,
              line_total_dp: l.lineDp,
            },
          })),
        totals: { price: totalPrice, downpayment: totalDP },
      };

      const res = await fetch("/api/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Create preorder failed");

      const data: { preorder_id?: string } = await res.json();
      if (!data.preorder_id) throw new Error("Missing preorder_id from server");

      notify.success("Preorder created.");
      router.push(`/preorder/${encodeURIComponent(data.preorder_id)}`);
    } catch (err) {
      console.error(err);
      notify.error("Could not create preorder.", {
        description: "Please check your details and try again.",
      });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  // Click "Place Preorder" -> open dialog with captcha
  const openConfirm = () => {
    if (!offerId) {
      notify.error("Missing offerId in URL.");
      return;
    }
    if (totalQty === 0) {
      notify.error("Please enter at least one item quantity.");
      return;
    }
    makeCaptcha();
    setConfirmOpen(true);
  };

  const onConfirm = () => {
    const expected = captchaQ.a + captchaQ.b;
    if (Number(captchaInput) !== expected) {
      setCaptchaError("Incorrect answer. Please try again.");
      return;
    }
    setCaptchaError(null);
    actuallySubmit();
  };

  // ---- states / guards
  if (!offerId) {
    return (
      <div className="max-w-3xl mx-auto ">
        <h1 className="text-xl font-semibold">Create Preorder</h1>
        <p className="text-gray-700">
          No <code>offerId</code> provided. Go back to{" "}
          <Link href="/" className="text-sky-700 hover:underline">
            Preorders
          </Link>{" "}
          and pick an offer.
        </p>
      </div>
    );
  }

  if (isLoading || (!isLoading && offer && !imagesReady)) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <ItemRowSkeleton key={i} />
            ))}
          </div>
          <aside className="lg:col-span-1">
            <SummarySkeleton />
          </aside>
        </div>
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          {isError ? "Failed to load offer." : "Offer not found."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Preorder: {offer.title}</h1>
            <p className="text-sm text-gray-600 mt-1">Offer ID: {offer.id}</p>
          </div>
          <Link href="/">
            <Button>Back</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: product list */}
          <div className="lg:col-span-2 space-y-4">
            {lines.map((l) => {
              const thumb = resolvedThumbs[l.id];
              const qVal = qty[l.id] || 0;

              return (
                <div
                  key={l.id}
                  onClick={() =>
                    show({
                      side: "bottom",
                      title: <p className="text-xs text-gray-500"> {l.id}</p>,
                      content: (
                        <div className="flex flex-col  justify-center pb-10 gap-5">
                          <div className="flex flex-col justify-center pb-5 gap-5">
                            <div className="px-10">
                              <h2 className="text-2xl font-bold">
                                {l.title?.trim() || l.name}
                              </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[20%_80%] gap-4 px-10">
                              <div className="flex items-center justify-center border rounded-md p-2">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={l.title?.trim() || l.name}
                                    className="w-50 h-50 object-contain"
                                  />
                                ) : (
                                  <div className="w-50 h-50 bg-gray-100" />
                                )}
                              </div>

                              <table className="w-full border-collapse">
                                <tbody>
                                  <tr className="border-t">
                                    <td className="w-[20%] border px-4 py-2 text-left">
                                      Release Date
                                    </td>
                                    <td className="border px-4 py-2 text-left">
                                      {l.releaseDate
                                        ? formatDate(l.releaseDate)
                                        : "No date"}
                                    </td>
                                  </tr>
                                  <tr className=" border-t">
                                    <td className=" w-[20%] border px-4 py-2 text-left">
                                      Description
                                    </td>
                                    <td className="border px-4 py-2 text-left whitespace-pre-line">
                                      {l.description}
                                    </td>
                                  </tr>

                                  <tr className="border-t">
                                    <td className=" w-[20%] border px-4 py-2 text-left">
                                      Price
                                    </td>
                                    <td className="border px-4 py-2 text-left">
                                      {l.price}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ),
                    })
                  }
                  className="bg-white cursor-pointer rounded-xl shadow-sm ring-1 ring-black/5 p-3 sm:p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-sm overflow-hidden bg-gray-100 ring-1 ring-black/5 shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={l.title?.trim() || l.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 ">
                      <button type="button" className="block text-left">
                        <div className="min-w-0">
                          <div className="font-semibold whitespace-normal break-words md:truncate leading-tight">
                            {l.title?.trim() || l.name}
                          </div>
                          <div className="text-xs text-gray-500 md:truncate">
                            ID: {l.id}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right leading-tight">
                      <div className="font-bold text-lg sm:text-xl">
                        {fmtPHP(l.unitFinalPrice)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Downpayment: {fmtPHP(l.unitDp)}
                      </div>
                    </div>

                    <div
                      className="w-16 sm:w-20"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Input
                        type="number"
                        min={0}
                        value={qVal}
                        onChange={(e) =>
                          setItemQty(l.id, Number(e.target.value))
                        }
                        className="no-spinner w-full text-center text-lg font-bold rounded-lg bg-gray-100 px-3 py-2 ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="mt-2 text-[16px] text-gray-500">
              Preorders may be cut due to limited allocation.
            </p>
          </div>

          {/* Right: sticky summary */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
                <div className="text-sm text-gray-600">Items</div>
                <div className="text-2xl font-bold">{totalQty}</div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <div className="text-xs text-gray-600">Total</div>
                    <div className="font-semibold">{fmtPHP(totalPrice)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <div className="text-xs text-gray-600">Downpayment</div>
                    <div className="font-semibold">{fmtPHP(totalDP)}</div>
                  </div>
                </div>

                {/* Open confirmation (with captcha) instead of submitting directly */}
                <Button
                  type="button"
                  onClick={openConfirm}
                  disabled={submitting || totalQty === 0}
                  className="mt-5 w-full"
                >
                  {submitting ? "Submitting…" : "Place Preorder"}
                </Button>

                <p className="mt-2 text-[11px] text-gray-500">
                  You'll be able to upload your receipt after placing the
                  preorder.
                </p>
              </div>

              <Link
                href="/"
                className="block text-center rounded-xl border px-4 py-2 hover:bg-gray-50"
              >
                Continue browsing
              </Link>
            </div>
          </aside>
        </div>
        {/* <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
          size="invisible"
        /> */}
      </form>

      {/* Confirmation dialog + captcha */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm preorder?</AlertDialogTitle>
            <AlertDialogDescription>
              You are placing a preorder with <strong>{totalQty}</strong>{" "}
              item(s). <br />
              Total: <strong>{fmtPHP(totalPrice)}</strong> &nbsp; • &nbsp; DP:{" "}
              <strong>{fmtPHP(totalDP)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-3 space-y-2">
            <Label htmlFor="captcha" className="text-sm">
              Prove you’re human: What is{" "}
              <span className="font-semibold">
                {captchaQ.a} + {captchaQ.b}
              </span>
              ?
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="captcha"
                inputMode="numeric"
                pattern="[0-9]*"
                value={captchaInput}
                onChange={(e) => {
                  setCaptchaInput(e.target.value);
                  setCaptchaError(null);
                }}
                className="w-28"
              />
              <Button
                type="button"
                variant="outline"
                onClick={makeCaptcha}
                disabled={submitting}
              >
                New challenge
              </Button>
            </div>
            {captchaError && (
              <p className="text-sm text-red-600">{captchaError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={submitting || captchaInput.trim() === ""}
              >
                {submitting ? "Submitting…" : "Confirm Order"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
