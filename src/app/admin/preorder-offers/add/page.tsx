"use client";

import { useState, useMemo } from "react";
import { useCreateOfferMutation } from "@/lib/store/api/offersApi";
import { useListItemsQuery } from "@/lib/store/api/itemsApi";
import { optimizeImage } from "@/lib/images/optimizeImage";
import { uploadOptimizedImageToS3 } from "@/lib/s3/uploadImage";
import { useS3Image } from "@/lib/s3/useS3Image";
import ItemSearchList, {
  type ItemLite,
} from "../../../../components/ItemSearchList/ItemSearchList";

type Item = {
  id: string; // business id (e.g., ITEM-001)
  name: string;
  price?: number;
};

type OfferForm = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  active: boolean;
  banner: string; // S3 key (optional)
  logo: string; // S3 key (optional)
  items: Item[]; // selected items
};

export default function NewPreorderOffer() {
  const [form, setForm] = useState<OfferForm>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    active: true,
    banner: "",
    logo: "",
    items: [],
  });

  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [createOffer, { isLoading: creating }] = useCreateOfferMutation();

  // Fetch ALL items once; pass to ItemSearchList for client-side filtering
  const {
    data: itemsData = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useListItemsQuery();

  const allItemsLite: ItemLite[] = useMemo(
    () =>
      (itemsData as any[]).map((it) => ({
        id: it.id,
        name: it.name,
      })),
    [itemsData]
  );

  // Resolve S3 URLs (hooks must be unconditionally called)
  const s3BannerUrl = useS3Image(form.banner);
  const s3LogoUrl = useS3Image(form.logo);

  const bannerDisplay = bannerPreview || s3BannerUrl;
  const logoDisplay = logoPreview || s3LogoUrl;

  // --------- Upload helpers (banner / logo) ----------
  const uploadAndPreview = async (
    file: File,
    folder: string,
    setPreview: (url: string | null) => void
  ) => {
    const { blob, suggestedFilename } = await optimizeImage(file, {
      maxWidth: 1600,
      maxHeight: 1600,
    });
    setPreview(URL.createObjectURL(blob));
    const { key } = await uploadOptimizedImageToS3(
      new File([blob], suggestedFilename, { type: blob.type }),
      folder
    );
    return key;
  };

  const onPickBanner: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBanner(true);
      setStatus(null);
      const key = await uploadAndPreview(
        file,
        "offers/banners",
        setBannerPreview
      );
      setForm((prev) => ({ ...prev, banner: key }));
      setErrors((p) => ({ ...p, banner: "" }));
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Banner upload failed." });
      setBannerPreview(null);
      setForm((p) => ({ ...p, banner: "" }));
    } finally {
      setUploadingBanner(false);
    }
  };

  const onPickLogo: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      setStatus(null);
      const key = await uploadAndPreview(file, "offers/logos", setLogoPreview);
      setForm((prev) => ({ ...prev, logo: key }));
      setErrors((p) => ({ ...p, logo: "" }));
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Logo upload failed." });
      setLogoPreview(null);
      setForm((p) => ({ ...p, logo: "" }));
    } finally {
      setUploadingLogo(false);
    }
  };
  // ---------------------------------------------------

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.start_date) e.start_date = "Start date is required.";
    if (!form.end_date) e.end_date = "End date is required.";
    if (
      form.start_date &&
      form.end_date &&
      new Date(form.start_date) > new Date(form.end_date)
    ) {
      e.end_date = "End date must be after start date.";
    }
    if (!form.items.length) e.items = "Please add at least one item.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    try {
      await createOffer({
        id: `OFFER-${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        active: form.active,
        banner: form.banner || undefined,
        logo: form.logo || undefined,
        item_ids: form.items.map((it) => it.id),
      }).unwrap();

      setStatus({ type: "success", message: "Preorder offer created 🎉" });
      setForm({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        active: true,
        banner: "",
        logo: "",
        items: [],
      });
      setErrors({});
      setBannerPreview(null);
      setLogoPreview(null);
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: "Could not create offer. Try again.",
      });
    }
  };

  // Item handlers (selected list)
  const handleAddItem = (item: ItemLite) => {
    setForm((prev) =>
      prev.items.some((x) => x.id === item.id)
        ? prev
        : { ...prev, items: [...prev.items, { id: item.id, name: item.name }] }
    );
    setErrors((p) => ({ ...p, items: "" }));
  };

  const removeItem = (businessId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== businessId),
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create Preorder Offer</h1>

      {status && (
        <div
          className={`mb-4 p-3 rounded ${
            status.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}

      {itemsError && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700">
          Failed to load items.{" "}
          <button className="underline" onClick={() => refetchItems()}>
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded-lg p-6 space-y-6"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Early Bird Promo"
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded p-2"
            placeholder="Describe preorder perks, freebies, etc."
            rows={4}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            {errors.start_date && (
              <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            {errors.end_date && (
              <p className="text-red-600 text-sm mt-1">{errors.end_date}</p>
            )}
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
          />
          <span className="text-sm">Active</span>
        </div>

        {/* Banner image */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Banner Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onPickBanner}
            className="w-full border rounded p-2"
            disabled={uploadingBanner}
          />
          {bannerDisplay && (
            <img
              src={bannerDisplay}
              alt="Banner preview"
              className="w-48 h-28 object-cover mt-2 rounded border"
            />
          )}
          {uploadingBanner && (
            <p className="text-xs text-gray-600 mt-1">Uploading…</p>
          )}
        </div>

        {/* Logo image */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Logo (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={onPickLogo}
            className="w-full border rounded p-2"
            disabled={uploadingLogo}
          />
          {logoDisplay && (
            <img
              src={logoDisplay}
              alt="Logo preview"
              className="w-28 h-28 object-cover mt-2 rounded border"
            />
          )}
          {uploadingLogo && (
            <p className="text-xs text-gray-600 mt-1">Uploading…</p>
          )}
        </div>

        {/* Item search & add (single API call -> client-side search) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Add Items (search by name or ID)
          </label>
          <ItemSearchList
            allItems={allItemsLite}
            offerItemIds={form.items.map((it) => it.id)}
            onAdd={handleAddItem}
            loading={itemsLoading}
          />
          {errors.items && (
            <p className="text-red-600 text-sm mt-1">{errors.items}</p>
          )}
        </div>

        {/* Selected items */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Selected Items
          </label>
          {form.items.length === 0 ? (
            <p className="text-sm text-gray-500">No items added yet.</p>
          ) : (
            <ul className="space-y-2">
              {form.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <span className="text-sm">
                    <span className="font-medium">{it.name}</span>
                    <span className="text-gray-500"> — {it.id}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    className="text-sm px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating || uploadingBanner || uploadingLogo}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {creating
              ? "Creating…"
              : uploadingBanner || uploadingLogo
              ? "Uploading…"
              : "Create Offer"}
          </button>
        </div>
      </form>
    </div>
  );
}
