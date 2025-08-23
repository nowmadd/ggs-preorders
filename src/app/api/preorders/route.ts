import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/store/db/connect";
import Preorders from "@/lib/models/Preorders";

// GET /api/preorders[?mine=1]
export async function GET(req: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const mine =
      url.searchParams.get("mine") === "1" ||
      url.searchParams.get("mine") === "true";

    if (mine) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Sign in required" },
          { status: 401 }
        );
      }
      const list = await Preorders.find(
        { customer_id: session.user.id },
        { _id: 0 }
      )
        .sort({ created_at: -1 })
        .lean();
      return NextResponse.json(list, { status: 200 });
    }

    const list = await Preorders.find({}, { _id: 0 })
      .sort({ created_at: -1 })
      .lean();
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("PREORDERS_LIST_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/preorders
export async function POST(req: Request) {
  await dbConnect();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { offer_id, expected_release, items, totals } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const preorderId = `PO-${Date.now()}`;

    await Preorders.create({
      id: preorderId,
      customer_id: session.user.id,
      offer_id: offer_id || null,
      status: "pending",
      payment_status: "unpaid",
      shipping_status: "not_shipped",
      expected_release: expected_release || null,
      totals: {
        price: Number(totals?.price || 0),
        downpayment: Number(totals?.downpayment || 0),
      },
      items: items.map((it: any) => ({
        item_id: it.item_id,
        quantity: Number(it.quantity || 0),
        snapshot: it.snapshot || undefined,
        pricing: it.pricing || undefined,
      })),
      created_at: new Date(),
    });

    return NextResponse.json(
      { message: "Preorder created", preorder_id: preorderId },
      { status: 201 }
    );
  } catch (err) {
    console.error("PREORDERS_CREATE_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
