// components/ProductRow.tsx
"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "../../lib/utils";

type KV = { label: React.ReactNode; value: React.ReactNode };

type ProductRowProps = {
  thumb?: string;
  title: string;
  id: string | number;
  pricePhp: number;
  dpPhp?: number;
  qty: number;
  onQtyChange: (val: number) => void;

  // Details (replaces table)
  releaseDate?: string | Date;
  description?: string;
  extra?: KV[]; // add more rows if needed
  showDetails?: boolean; // toggle details section
  className?: string;
};

export default function ProductRow({
  thumb,
  title,
  id,
  pricePhp,
  dpPhp,
  qty,
  onQtyChange,
  releaseDate,
  description,
  extra = [],
  showDetails = true,
  className = "",
}: ProductRowProps) {
  const money = (n: number) =>
    new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(n);

  const detailRows: KV[] = [
    releaseDate
      ? { label: "Release Date", value: formatDate(releaseDate) }
      : { label: "Release Date", value: "No date" },
    description
      ? {
          label: "Description",
          value: <span className="whitespace-pre-line">{description}</span>,
        }
      : { label: "Description", value: "—" },
    ...extra,
  ];

  return (
    <Card
      className={[
        "rounded-2xl md:rounded-3xl shadow-sm border bg-white",
        className,
      ].join(" ")}
    >
      <CardContent className="p-3 md:p-4">
        {/* Top row: image | title+id | price | qty */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 md:gap-6">
          <div className="shrink-0">
            <div className="size-14 md:size-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {thumb ? (
                <Image
                  src={thumb}
                  alt={title}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-sm md:text-base font-semibold leading-tight truncate">
              {title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              ID: {id}
            </div>
          </div>

          <div className="text-right leading-tight">
            <div className="text-base md:text-lg font-extrabold">
              PHP {money(pricePhp)}
            </div>
            {typeof dpPhp === "number" && (
              <div className="text-xs text-muted-foreground">
                DP: {money(dpPhp)}
              </div>
            )}
          </div>

          <div className="pl-1">
            <Input
              type="number"
              min={0}
              step={1}
              value={qty}
              onChange={(e) => onQtyChange(Number(e.target.value || 0))}
              className="w-14 md:w-16 h-10 md:h-11 text-center font-semibold rounded-xl bg-muted/60 border-none focus-visible:ring-2"
              aria-label="Quantity"
            />
          </div>
        </div>

        {/* Details (30% / 70%) */}
        {showDetails && detailRows.length > 0 && (
          <div className="mt-4">
            <dl className="grid grid-cols-1 md:grid-cols-[30%_70%] border rounded-xl overflow-hidden">
              {detailRows.map((row, i) => (
                <div className="contents" key={i}>
                  <dt className="bg-muted/40 md:border-r px-4 py-2 font-medium">
                    {row.label}
                  </dt>
                  <dd className="px-4 py-2 border-t md:border-t-0">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
