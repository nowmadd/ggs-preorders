"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useGetItemQuery,
  useDeleteItemMutation,
  useUpdateItemMutation,
  type Item,
} from "@/lib/store/api/itemsApi";
import { useListGamesQuery, type Game } from "@/lib/store/api/gamesApi";
import { useEffect, useMemo, useState } from "react";
import { useS3Image } from "@/lib/s3/useS3Image";
import { optimizeImage } from "@/lib/images/optimizeImage";
import { uploadOptimizedImageToS3 } from "@/lib/s3/uploadImage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { toast, Toaster } from "sonner";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Calendar, CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import DatePicker from "@/components/form/DatePicker";

export default function AdminItemDetailPage() {
  const params = useParams<{ id: string }>();
  const routeId = typeof params?.id === "string" ? params.id : undefined;
  const router = useRouter();

  const {
    data: item,
    isLoading,
    isError,
    refetch,
  } = useGetItemQuery(routeId as string, { skip: !routeId });
  const [deleteItem, { isLoading: deleting }] = useDeleteItemMutation();
  const [updateItem, { isLoading: saving }] = useUpdateItemMutation();

  const { data: games = [] } = useListGamesQuery();
  const sortedGames = useMemo(
    () =>
      [...(games as Game[])].sort((a, b) =>
        a.game_title.localeCompare(b.game_title)
      ),
    [games]
  );

  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dpTouched, setDpTouched] = useState(false);

  const imgKey =
    localPreview ||
    (editing ? (form.image as string | undefined) : item?.image);
  const imgUrl = useS3Image(imgKey || undefined);

  useEffect(() => {
    if (editing && item) {
      const legacyGame =
        typeof item.category === "object" && (item.category as any)?.game_title
          ? (item.category as any)
          : undefined;

      setForm({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        dp: item.dp,
        discount: item.discount,
        category: typeof item.category === "string" ? item.category : "",
        game: item.game ?? legacyGame,
        releaseDate: item.releaseDate || "",
        image: item.image || "",
      });
      setErrors({});
      setLocalPreview(null);
      setDpTouched(false);
    }
  }, [editing, item]);

  useEffect(() => {
    if (!editing || dpTouched) return;
    const p = Number(form.price);
    if (!Number.isFinite(p) || p <= 0) return;
    setForm((prev) => ({
      ...prev,
      dp: Math.round(p * 0.3) as unknown as number,
    }));
  }, [editing, form.price, dpTouched]);

  const onPickImage: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { blob, suggestedFilename } = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
      });
      const blobUrl = URL.createObjectURL(blob);
      setLocalPreview(blobUrl);
      const { key } = await uploadOptimizedImageToS3(
        new File([blob], suggestedFilename, { type: blob.type }),
        "items"
      );
      setForm((prev) => ({ ...prev, image: key }));
      setErrors((p) => ({ ...p, image: "" }));
      toast.success("Image uploaded");
    } catch (err) {
      console.error(err);
      setLocalPreview(null);
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const releaseDateObj = useMemo(() => {
    const s = (form.releaseDate as string) || "";
    if (!s) return undefined;
    try {
      return parse(s, "yyyy-MM-dd", new Date()); // avoid TZ off-by-one
    } catch {
      return undefined;
    }
  }, [form.releaseDate]);

  const onChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (e) => {
    const { name, value } = e.target;
    if (name === "dp") setDpTouched(true);
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form?.name?.toString().trim()) e.name = "Name is required.";
    if (form.price == null || Number.isNaN(Number(form.price)))
      e.price = "Valid price required.";
    if (form.dp != null && Number(form.dp) < 0) e.dp = "DP cannot be negative.";
    if (form.discount != null && Number(form.discount) < 0)
      e.discount = "Discount cannot be negative.";
    if (!form?.category?.toString().trim())
      e.category = "Category is required.";
    if (!form?.game) e.game = "Please select a game.";
    return e;
  };

  const save = async () => {
    const safeId = item?.id ?? routeId;
    if (!safeId) return;
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    await updateItem({
      id: safeId,
      data: {
        name: form.name?.toString().trim() || undefined,
        description: form.description?.toString().trim() || undefined,
        price: Number(form.price),
        dp: Number(form.dp || 0),
        discount: Number(form.discount || 0),
        category: form.category?.toString().trim() || "",
        game: form.game,
        releaseDate: form.releaseDate?.toString() || undefined,
        image: form.image?.toString() || undefined,
      },
    }).unwrap();

    toast.success("Item updated.");
    setEditing(false);
    setLocalPreview(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!routeId) return;
    const ok = confirm("Delete this item? This cannot be undone.");
    if (!ok) return;
    await deleteItem(routeId).unwrap();
    toast.success("Item deleted.");
    router.push("/admin/items");
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  function LoadingSkeleton() {
    return (
      <div className="mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Image card */}
          <Card className="md:col-span-1 overflow-hidden">
            <CardContent>
              <AspectRatio ratio={1}>
                <Skeleton className="h-full w-full" />
              </AspectRatio>
            </CardContent>
          </Card>

          {/* Info cards */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <InfoCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[80%]" />
          </CardContent>
        </Card>

        <Toaster richColors position="top-right" />
      </div>
    );
  }

  function InfoCardSkeleton() {
    return (
      <Card>
        <CardHeader className="pb-2 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-32" />
        </CardHeader>
      </Card>
    );
  }

  if (isError || !item) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <Alert variant="destructive">
          <AlertTitle>
            {isError ? "Failed to load item" : "Item not found"}
          </AlertTitle>
          <AlertDescription>
            {isError
              ? "There was an error fetching this item."
              : "Please go back to the list."}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/items">← Back to items</Link>
          </Button>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  // IMPORTANT: string | undefined (no empty string)
  const selectedGameId: string | undefined =
    (form.game as Game | undefined)?.id ??
    (typeof item.game === "object" && item.game ? item.game.id : undefined);

  const viewGameTitle =
    typeof item.game === "object" && item.game?.game_title
      ? item.game.game_title
      : typeof item.category === "object" && (item.category as any)?.game_title
      ? (item.category as any).game_title
      : "";

  return (
    <div className="mx-auto space-y-6">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="-ml-2">
              <Link href="/admin/items">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold">
              {editing ? (form.name as string) || "(Untitled)" : item.name}
            </h1>
            {item.discount ? (
              <Badge variant="secondary">Has Discount</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">ID: {item.id}</p>
        </div>

        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <Button asChild variant="outline">
                <Link href="/admin/items">Back</Link>
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button asChild variant="default">
                <Link
                  href={`/admin/items/add?copyOf=${encodeURIComponent(
                    item.id
                  )}`}
                >
                  Copy
                </Link>
              </Button>
              {/* <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button> */}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setErrors({});
                  setLocalPreview(null);
                  setDpTouched(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 overflow-hidden">
          {!editing && (
            <CardContent>
              <AspectRatio ratio={1}>
                <div className="h-full w-full rounded-md  bg-muted/10 overflow-hidden">
                  {imgUrl ? (
                    <img
                      key={imgUrl}
                      src={imgUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <></>
                  )}
                </div>
              </AspectRatio>
            </CardContent>
          )}
          {editing && (
            <CardFooter className="flex-col items-stretch gap-2">
              <Label htmlFor="image">Upload new image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={onPickImage}
                disabled={uploading}
              />
              {uploading ? (
                <p className="text-xs text-muted-foreground">Uploading…</p>
              ) : null}
              {localPreview && (
                <div className="mt-2">
                  <Label className="text-xs">Preview</Label>
                  <div className="mt-1 w-28 rounded-md overflow-hidden border">
                    <img
                      src={localPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </CardFooter>
          )}
        </Card>

        {/* View mode details */}
        {!editing && (
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard label="Price" value={formatCurrency(item.price)} />
            <InfoCard
              label="Down Payment"
              value={item.dp ? formatCurrency(item.dp) : "—"}
            />
            <InfoCard
              label="Discount"
              value={
                item.discount != null ? formatCurrency(item.discount) : "—"
              }
            />
            <InfoCard
              label="Category"
              value={
                typeof item.category === "string" ? item.category || "—" : "—"
              }
            />
            <InfoCard label="Game" value={viewGameTitle || "—"} />
            <InfoCard
              label="Release Date"
              value={
                item.releaseDate
                  ? new Date(item.releaseDate).toLocaleDateString()
                  : "—"
              }
            />
          </div>
        )}
      </div>

      {/* Description (view) */}
      {!editing && item.description ? (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{item.description}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Edit form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={(form.name as any) || ""}
                  onChange={onChange}
                />
                {errors.name ? <FieldError msg={errors.name} /> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={(form.description as any) || ""}
                  onChange={onChange}
                  rows={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={(form.price as any) ?? ""}
                  onChange={onChange}
                />
                {errors.price ? <FieldError msg={errors.price} /> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dp">Down Payment (auto 30%)</Label>
                <Input
                  id="dp"
                  name="dp"
                  type="number"
                  value={(form.dp as any) ?? ""}
                  onChange={onChange}
                />
                {errors.dp ? <FieldError msg={errors.dp} /> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discount">Discount (amount)</Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  value={(form.discount as any) ?? 0}
                  onChange={onChange}
                />
                {errors.discount ? <FieldError msg={errors.discount} /> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category (text)</Label>
                <Input
                  id="category"
                  name="category"
                  value={(form.category as any) || ""}
                  onChange={onChange}
                />
                {errors.category ? <FieldError msg={errors.category} /> : null}
              </div>

              <div className="grid gap-2 w-full">
                <Label>Game</Label>
                <Select
                  value={selectedGameId ?? undefined}
                  onValueChange={(val) => {
                    const game = sortedGames.find((g) => g.id === val);
                    setForm((p) => ({ ...p, game: game || undefined }));
                    setErrors((p) => ({ ...p, game: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Game" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedGames.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.game_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.game ? <FieldError msg={errors.game} /> : null}
              </div>
              <div className="grid gap-2">
                <DatePicker
                  label="Release Date"
                  value={(form.releaseDate as any) || ""}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, releaseDate: v ?? "" }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="uppercase tracking-wide text-xs">
          {label}
        </CardDescription>
        <CardTitle className="text-base">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

function formatCurrency(n: number) {
  try {
    return `₱ ${Number(n).toLocaleString()}`;
  } catch {
    return "—";
  }
}
