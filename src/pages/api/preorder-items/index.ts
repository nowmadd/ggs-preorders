import dbConnect from "@/lib/dbConnect";
import PreorderItem from "@/lib/models/PreorderOfferItems";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const data = await PreorderItem.find();
        res.status(200).json(data);
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;
    case "POST":
      try {
        const created = await PreorderItem.create(req.body);
        res.status(201).json(created);
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
