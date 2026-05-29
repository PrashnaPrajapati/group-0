import { apiUrl } from "@/lib/apiConfig";
import crypto from "crypto";

function signaturesMatch(a, b) {
  if (!a || !b) return false;

  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));

  return (
    aBuffer.length === bBuffer.length &&
    crypto.timingSafeEqual(aBuffer, bBuffer)
  );
}

function verifyCallbackSignature(callbackData, secretKey) {
  if (!callbackData?.signature || !callbackData?.signed_field_names) {
    return false;
  }

  const message = String(callbackData.signed_field_names)
    .split(",")
    .map((field) => `${field}=${callbackData[field]}`)
    .join(",");

  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  return signaturesMatch(expectedSignature, callbackData.signature);
}

async function saveTransaction({ refId, txnId, amount, bookingIds }) {
  try {
    const saveResponse = await fetch(apiUrl("/payments/save-transaction"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refId,
        txnId,
        amount,
        bookingIds: bookingIds
          ?.split(",")
          .map((id) => Number(id.trim()))
          .filter(Boolean),
        status: "completed",
        paymentMethod: "esewa",
      }),
    });

    if (!saveResponse.ok) {
      console.warn("Failed to save transaction to database");
    }
  } catch (saveError) {
    console.warn("Error saving transaction:", saveError);
  }
}

export async function POST(request) {
  try {
    const { callbackData, transactionCode, txnId, amount, bookingIds } =
      await request.json();

    if (!txnId || !amount) {
      return Response.json(
        { message: "Missing required parameters: txnId, amount" },
        { status: 400 }
      );
    }

    const merchantCode = process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE;
    const secretKey = process.env.ESEWA_MERCHANT_SECRET;

    if (!merchantCode || !secretKey) {
      console.error("eSewa environment variables are not configured");
      return Response.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }

    if (callbackData) {
      const callbackStatus = String(callbackData.status || "").toUpperCase();
      const callbackTxnId = callbackData.transaction_uuid;
      const callbackAmount = String(callbackData.total_amount);
      const callbackProductCode = callbackData.product_code;

      if (callbackStatus !== "COMPLETE") {
        return Response.json(
          { message: "eSewa payment is not complete", detail: callbackData },
          { status: 400 }
        );
      }

      if (callbackProductCode !== merchantCode) {
        return Response.json(
          { message: "Invalid eSewa product code", detail: callbackData },
          { status: 400 }
        );
      }

      if (callbackTxnId !== txnId) {
        return Response.json(
          { message: "Invalid eSewa transaction id", detail: callbackData },
          { status: 400 }
        );
      }

      if (Number(callbackAmount) !== Number(amount)) {
        return Response.json(
          { message: "Invalid eSewa payment amount", detail: callbackData },
          { status: 400 }
        );
      }

      if (!verifyCallbackSignature(callbackData, secretKey)) {
        return Response.json(
          { message: "Invalid eSewa callback signature", detail: callbackData },
          { status: 400 }
        );
      }

      const refId = callbackData.transaction_code || transactionCode || txnId;
      await saveTransaction({ refId, txnId, amount, bookingIds });

      return Response.json(
        {
          success: true,
          message: "Payment verified successfully",
          refId,
          detail: callbackData,
        },
        { status: 200 }
      );
    }

    return Response.json(
      { message: "Missing signed eSewa callback data" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return Response.json(
      { message: "Payment verification error: " + error.message },
      { status: 500 }
    );
  }
}
