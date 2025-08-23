import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/store/db/connect";
import PreorderOffers, { type IPreorderOffer } from "@/lib/models/PreorderOffers";
import PreorderOfferItems from "@/lib/models/PreorderOfferItems";
import Items from "@/lib/models/Items";

async function embedItemsForOffer(offer: any) {
  const links = await PreorderOfferItems.find({ offer_id: offer.id })
    .select("item_id sort")
    .lean<{ item_id: string; sort?: number }[]>();
  const ids = links.map((l) => l.item_id);
  if (ids.length === 0) return { ...offer, items: [] };

  const items = await Items.find({ id: { $in: ids } })
    .select("-_id -__v")
    .lean<any[]>();
  const map = new Map(items.map((it) => [it.id, it]));
  const sorted = links.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return { ...offer, items: sorted.map((l) => map.get(l.item_id)).filter(Boolean) };
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  await dbConnect();
  try {
    const id = ctx.params.id;
    const include = new URL(req.url).searchParams.get("include") ?? "";
    const offer = await PreorderOffers.findOne({ id }).lean<IPreorderOffer | null>();
    if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (include === "items") {
      const full = await embedItemsForOffer(offer);
      return NextResponse.json(full, { status: 200 });
    }
    return NextResponse.json(offer, { status: 200 });
  } catch (err) {
    console.error("PREORDER_OFFER_GET_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));
    const { title, description, start_date, end_date, active, banner, logo, item_ids } = body || {};

    const $set: Record<string, any> = {};
    if (title !== undefined) $set.title = title;
    if (description !== undefined) $set.description = description;
    if (start_date !== undefined) $set.start_date = start_date;
    if (end_date !== undefined) $set.end_date = end_date;
    if (active !== undefined) $set.active = active;
    if (banner !== undefined) $set.banner = banner;
    if (logo !== undefined) $set.logo = logo;

    if (Object.keys($set).length) {
      const updated = await PreorderOffers.findOneAndUpdate({ id }, { $set }, { new: true }).lean();
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    } else {
      // ensure offer exists
      const exists = await PreorderOffers.findOne({ id }).lean();
      if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (Array.isArray(item_ids)) {
      const uniqueNew = Array.from(new Set(item_ids.map((x: any) => String(x))));
      const current = await PreorderOfferItems.find({ offer_id: id }).select("item_id").lean();
      const currentSet = new Set(current.map((c: any) => c.item_id));
      const newSet = new Set(uniqueNew);
      const toAdd = uniqueNew.filter((x) => !currentSet.has(x));
      const toRemove = Array.from(currentSet).filter((x) => !newSet.has(x));

      const ops: any[] = [];
      toAdd.forEach((item_id, idx) => {
        ops.push({ insertOne: { document: { offer_id: id, item_id, sort: idx } } });
      });
      toRemove.forEach((item_id) => {
        ops.push({ deleteOne: { filter: { offer_id: id, item_id } } });
      });
      if (ops.length) {
        try {
          await PreorderOfferItems.bulkWrite(ops, { ordered: false });
        } catch (e: any) {
          if (e?.code !== 11000) throw e;
        }
      }
    }

    const final = await PreorderOffers.findOne({ id }).lean();
    return NextResponse.json(final, { status: 200 });
  } catch (err) {
    console.error("PREORDER_OFFER_PATCH_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const id = ctx.params.id;
    await PreorderOffers.deleteOne({ id });
    await PreorderOfferItems.deleteMany({ offer_id: id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("PREORDER_OFFER_DELETE_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}