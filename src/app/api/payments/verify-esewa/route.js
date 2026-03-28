import crypto from "crypto";

export async function POST(request) {
  try {
    const { refId, txnId, amount, bookingIds } = await request.json();

    if (!refId || !txnId || !amount) {
      return Response.json(
        { message: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify payment with eSewa
    const verifyPaymentData = {
      amt: amount,
      scd: process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE,
      rid: refId,
      pid: txnId,
    };

    // Build query string for verification
    const queryString = `amt=${verifyPaymentData.amt}&pid=${verifyPaymentData.pid}&rid=${verifyPaymentData.rid}&scd=${verifyPaymentData.scd}`;

    // Create Hmac SHA256 signature
    const secretKey = process.env.ESEWA_MERCHANT_SECRET;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(queryString)
      .digest("base64");

    // Call eSewa verification API
    const esewaVerifyUrl =
      process.env.NEXT_PUBLIC_ESEWA_ENVIRONMENT === "test"
        ? "https://rc.esewa.com.np/api/epay/transaction/status/"
        : "https://esewa.com.np/api/epay/transaction/status/";

    const verifyResponse = await fetch(esewaVerifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `${queryString}&signature=${encodeURIComponent(signature)}`,
    });

    const verifyResult = await verifyResponse.text();
    console.log("eSewa Verification Response:", verifyResult);

    // Parse eSewa response - they return status in response
    if (verifyResult.includes("success")) {
      // Save transaction to backend database
      try {
        const saveResponse = await fetch(
          "http://localhost:5001/payments/save-transaction",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              refId,
              txnId,
              amount,
              bookingIds: bookingIds
                ?.split(",")
                .map((id) => Number(id.trim())),
              status: "completed",
              paymentMethod: "esewa",
            }),
          }
        );

        if (!saveResponse.ok) {
          console.warn("Failed to save transaction to database");
          // Continue anyway - payment was verified by eSewa
        }
      } catch (saveError) {
        console.warn("Error saving transaction:", saveError);
        // Continue anyway - payment was verified by eSewa
      }

      return Response.json(
        { success: true, message: "Payment verified successfully" },
        { status: 200 }
      );
    } else {
      return Response.json(
        { message: "eSewa payment verification failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return Response.json(
      { message: "Payment verification error: " + error.message },
      { status: 500 }
    );
  }
}
