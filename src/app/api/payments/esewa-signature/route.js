import crypto from "crypto";

export async function POST(request) {
  try {
    const { amount, transactionUUID, productCode } = await request.json();

    // eSewa signature generation
    const message = `total_amount=${amount},transaction_uuid=${transactionUUID},product_code=${productCode}`;
    const secretKey = process.env.ESEWA_MERCHANT_SECRET;

    // Generate HMAC-SHA256 signature
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
