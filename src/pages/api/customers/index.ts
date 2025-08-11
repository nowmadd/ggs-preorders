import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Customers from "../../../lib/models/Customers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { id, name, email, phone, address } = req.body;
      if (!id || !name || !email) return res.status(400).json({ error: "id, name and email required" });
      const exists = await Customers.findOne({ id });
      if (exists) return res.status(400).json({ error: "Customer id exists" });
      const c = await Customers.create({ id, name, email, phone, address });
      return res.status(201).json(c);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "GET") {
    try {
      const list = await Customers.find({}).lean();
      return res.status(200).json(list);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  }
}
