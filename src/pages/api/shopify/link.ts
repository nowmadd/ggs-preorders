// import { getServerSession } from "next-auth/next";
// import { authOptions } from "../../app/auth/[...nextauth]";
// import dbConnect from "@/lib/dbConnect";
// import Customer from "@/lib/models/Customer";
// import { NextApiRequest, NextApiResponse } from "next";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== "POST") return res.status(405).end();
//   const session = await getServerSession(req, res, authOptions);
//   if (!session?.user?.email)
//     return res.status(401).json({ error: "Unauthorized" });

//   const { shopify_account_id } = req.body || {};
//   if (!shopify_account_id)
//     return res.status(400).json({ error: "Missing shopify_account_id" });

//   await dbConnect();
//   await Customer.updateOne(
//     { email: session.user.email },
//     { $set: { shopify_account_id } }
//   );

//   return res.status(200).json({ ok: true });
// }
