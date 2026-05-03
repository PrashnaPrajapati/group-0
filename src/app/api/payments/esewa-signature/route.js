import crypto from "crypto";
import { normalizeEsewaAmount } from "@/lib/esewa";

export async function POST(request) {
  try {
    const { amount, transactionUUID, productCode } = await request.json();
    const totalAmount = normalizeEsewaAmount(amount);
 
    if (!totalAmount || !transactionUUID || !productCode) {
      return Response.json(
        { error: "Missing required parameters: amount, transactionUUID, productCode" },
        { status: 400 }
      );
    }

    const secretKey = process.env.ESEWA_MERCHANT_SECRET;
    if (!secretKey) {
      console.error("ESEWA_MERCHANT_SECRET environment variable is not set");
      return Response.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUUID},product_code=${productCode}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(message)
      .digest("base64");

    return Response.json({ signature }, { status: 200 });
  } catch (error) {
    console.error("Signature Generation Error:", error);
    return Response.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    );
  }
}
