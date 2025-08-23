import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/store/db/connect";
import PreorderOffers, { type IPreorderOffer } from "@/lib/models/PreorderOffers";
import PreorderOfferItems from "@/lib/models/PreorderOfferItems";
import Items from "@/lib/models/Items";

async function embedItems(list: any[]) {
  const offerIds = list.map((o) => o.id);
  if (offerIds.length === 0) return list;

  const links = await PreorderOfferItems.find({ offer_id: { $in: offerIds } })
    .select("offer_id item_id sort")
    .lean<{ offer_id: string; item_id: string; sort?: number }[]>();

  const itemIds = Array.from(new Set(links.map((l) => l.item_id)));
  const items = await Items.find({ id: { $in: itemIds } })
    .select("-_id -__v")
    .lean();

  const itemMap = new Map(items.map((it: any) => [it.id, it]));
  const byOffer = new Map<string, { item_id: string; sort?: number }[]>();
  for (const l of links) {
    const arr = byOffer.get(l.offer_id) ?? [];
    arr.push({ item_id: l.item_id, sort: l.sort });
    byOffer.set(l.offer_id, arr);
  }

  return list.map((o) => {
    const rows = (byOffer.get(o.id) ?? []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const resolved = rows.map((r) => itemMap.get(r.item_id)).filter(Boolean);
    return { ...o, items: resolved };
  });
}

export async function GET(req: Request) {
  await dbConnect();
  try {
    const include = new URL(req.url).searchParams.get("include") ?? "";
    const list = await PreorderOffers.find({}).lean<IPreorderOffer[]>();
    if (include === "items") {
      const withItems = await embedItems(list as any[]);
      return NextResponse.json(withItems, { status: 200 });
    }
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("PREORDER_OFFERS_LIST_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const body = await req.json().catch(() => ({}));
    const { id, title, description, start_date, end_date, active, banner, logo, item_ids } = body || {};

    const created = await PreorderOffers.create({
      id, title, description, start_date, end_date, active, banner, logo,
    });

    if (Array.isArray(item_ids) && item_ids.length) {
      const unique = Array.from(new Set(item_ids.map((x: any) => String(x))));
      try {
        await PreorderOfferItems.bulkWrite(
          unique.map((item_id: string, idx: number) => ({
            insertOne: { document: { offer_id: id, item_id, sort: idx } },
          })),
          { ordered: false }
        );
      } catch (e: any) {
        if (e?.code !== 11000) throw e;
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("PREORDER_OFFERS_CREATE_ERROR", err);
    if (err?.code === 11000) {
      return NextResponse.json({ error: "Offer id already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}