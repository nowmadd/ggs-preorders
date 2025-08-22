"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
  useGetMeQuery,
  useUpdateMeMutation,
} from "@/lib/store/api/customersApi";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";

type Shipping = {
  street: string;
  brgy: string;
  city: string;
  province: string;
  zip: string;
};

export default function CustomerProfilePage() {
  const { data, isLoading, isError, refetch } = useGetMeQuery();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();

  const c = data?.customer;

  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [birthday, setBirthday] = useState("");
  const [shipping, setShipping] = useState<Shipping>({
    street: "",
    brgy: "",
    city: "",
    province: "",
    zip: "",
  });

  const [editing, setEditing] = useState(false);

  // seed/reset from server
  const resetFromServer = () => {
    if (!c) return;
    setPhone(c.phone || "");
    setFacebook(c.facebook || "");
    setBirthday(c.birthday || "");
    setShipping({
      street: c.shipping?.street || "",
      brgy: c.shipping?.brgy || "",
      city: c.shipping?.city || "",
      province: c.shipping?.province || "",
      zip: c.shipping?.zip || "",
    });
  };

  useEffect(() => {
    resetFromServer();
  }, [c]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMe({ phone, facebook, birthday, shipping }).unwrap();
      notify.success("Profile saved.");
      setEditing(false);
    } catch (err) {
      console.error(err);
      notify.error("Failed to save profile.", {
        description: "Please check your connection and try again.",
      });
    }
  };

  if (isLoading) {
    return <CustomerProfileSkeleton />;
  }

  if (isError || !c) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <p className="p-3 rounded bg-red-50 text-red-700">
          Failed to load profile.
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

  const readOnly = !editing;

  return (
    <div className="mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Profile</h1>
      </div>

      <div className="bg-white rounded border p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
          {c.avatar ? (
            <Image
              src={c.avatar}
              alt="Avatar"
              width={64}
              height={64}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-lg font-medium">{c.name || "—"}</div>
          <div className="text-sm text-gray-600">{c.email || "—"}</div>
          <div className="text-xs text-gray-500">
            Google ID: {c.google_id || c.user_id}
          </div>
        </div>
      </div>

      <form
        id="profile-form"
        onSubmit={onSave}
        className="bg-white rounded border p-4 space-y-4"
      >
        <div className="flex flex-row justify-between items-center">
          <div>
            <p className="text-base font-medium">Details</p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button
                onClick={() => {
                  resetFromServer();
                  setEditing(true);
                }}
                type="button"
                className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-black"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    resetFromServer();
                    setEditing(false);
                  }}
                  type="button"
                  className="px-3 py-2 rounded border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  form="profile-form"
                  type="submit"
                  disabled={saving}
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Contact Number">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
              inputMode="tel"
            />
          </Field>

          <Field label="Facebook Profile (URL or handle)">
            <Input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
              placeholder="@username or https://facebook.com/…"
            />
          </Field>

          {/* <Field label="Birthday">
            <Input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
            />
          </Field> */}
        </div>

        <h2 className="font-medium mt-2">Shipping Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Street">
            <Input
              value={shipping.street}
              onChange={(e) =>
                setShipping((s) => ({ ...s, street: e.target.value }))
              }
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
            />
          </Field>
          <Field label="Barangay">
            <Input
              value={shipping.brgy}
              onChange={(e) =>
                setShipping((s) => ({ ...s, brgy: e.target.value }))
              }
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
            />
          </Field>
          <Field label="City / Municipality">
            <Input
              value={shipping.city}
              onChange={(e) =>
                setShipping((s) => ({ ...s, city: e.target.value }))
              }
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
            />
          </Field>
          <Field label="Province">
            <Input
              value={shipping.province}
              onChange={(e) =>
                setShipping((s) => ({ ...s, province: e.target.value }))
              }
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
            />
          </Field>
          <Field label="ZIP Code">
            <Input
              value={shipping.zip}
              onChange={(e) =>
                setShipping((s) => ({ ...s, zip: e.target.value }))
              }
              className="w-full border rounded p-2 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={readOnly}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </Field>
        </div>

        {editing && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </form>

      {!data?.is_complete && (
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
          Your profile is incomplete. Please add your contact number and full
          shipping address to place preorders.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function CustomerProfileSkeleton() {
  return (
    <div className="mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="bg-white rounded border p-4 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      <div className="bg-white rounded border p-4 space-y-4">
        <div className="flex flex-row justify-between items-center">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInputSkeleton />
          <LabeledInputSkeleton />
        </div>

        <Skeleton className="h-5 w-36" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInputSkeleton />
          <LabeledInputSkeleton />
          <LabeledInputSkeleton />
          <LabeledInputSkeleton />
          <LabeledInputSkeleton />
        </div>
      </div>
    </div>
  );
}

function LabeledInputSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
