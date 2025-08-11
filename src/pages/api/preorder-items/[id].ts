import dbConnect from "@/lib/dbConnect";
import PreorderItem from "@/lib/models/PreorderOfferItems";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    query: { id },
    method,
  } = req;
  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const data = await PreorderItem.findById(id);
        if (!data) return res.status(404).json({ success: false });
        res.status(200).json(data);
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;
    case "PATCH":
      try {
        const updated = await PreorderItem.findByIdAndUpdate(id, req.body, {
          new: true,
        });
        if (!updated) return res.status(404).json({ success: false });
        res.status(200).json(updated);
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;
    case "DELETE":
      try {
        const deleted = await PreorderItem.deleteOne({ _id: id });
        if (!deleted) return res.status(404).json({ success: false });
        res.status(200).json({ success: true });
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
