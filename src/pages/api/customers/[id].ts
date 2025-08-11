import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Customers from "../../../lib/models/Customers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const c = await Customers.findOne({ id: String(id) }).lean();
    if (!c) return res.status(404).json({ error: "Customer not found" });
    return res.status(200).json(c);
  } else if (req.method === "PATCH") {
    const body = req.body;
    const updated = await Customers.findOneAndUpdate({ id: String(id) }, { $set: body }, { new: true });
    if (!updated) return res.status(404).json({ error: "Customer not found" });
    return res.status(200).json(updated);
  } else if (req.method === "DELETE") {
    await Customers.deleteOne({ id: String(id) });
    return res.status(200).json({ message: "Deleted" });
  } else {
    res.setHeader("Allow", "GET, PATCH, DELETE");
    return res.status(405).end("Method Not Allowed");
  }
}
