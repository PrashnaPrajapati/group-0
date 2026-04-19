import crypto from "crypto";

export async function POST(request) {
  try {
    const { refId, txnId, amount, bookingIds } = await request.json();

    if (!refId || !txnId || !amount) {
      return Response.json(
        { message: "Missing required parameters: refId, txnId, amount" },
        { status: 400 }
      );
    }

    const merchantCode = process.env.NEXT_PUBLIC_ESEWA_MERCHANT_CODE;
    const secretKey = process.env.ESEWA_MERCHANT_SECRET;
    const environment = process.env.NEXT_PUBLIC_ESEWA_ENVIRONMENT;

    if (!merchantCode || !secretKey) {
      console.error("eSewa environment variables not configured");
      return Response.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }
 
    const verifyPaymentData = {
      amt: amount,
      scd: merchantCode,
      rid: refId,
      pid: txnId,
    };
 
    const queryString = `amt=${verifyPaymentData.amt}&pid=${verifyPaymentData.pid}&rid=${verifyPaymentData.rid}&scd=${verifyPaymentData.scd}`;
 
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(queryString)
      .digest("base64");
 
    const esewaVerifyUrl =
      environment === "test"
        ? "https://rc.esewa.com.np/api/epay/transaction/status/"
        : "https://esewa.com.np/api/epay/transaction/status/";

    const verifyUrlWithParams = `${esewaVerifyUrl}?${queryString}&signature=${encodeURIComponent(signature)}`;
    let verifyResponse = await fetch(verifyUrlWithParams, {
      method: "GET",
    });

    let verifyResult = await verifyResponse.text();
    console.log("eSewa Verification Response (GET):", verifyResult);

    if (verifyResponse.status === 405 || verifyResult.toLowerCase().includes("method not allowed")) {
      verifyResponse = await fetch(esewaVerifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `${queryString}&signature=${encodeURIComponent(signature)}`,
      });
      verifyResult = await verifyResponse.text();
      console.log("eSewa Verification Response (POST fallback):", verifyResult);
    }
 
    if (verifyResult.toLowerCase().includes("success")) { 
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
        }
      } catch (saveError) {
        console.warn("Error saving transaction:", saveError); 
      }

      return Response.json(
        { success: true, message: "Payment verified successfully" },
        { status: 200 }
      );
    } else {
      return Response.json(
        { message: "eSewa payment verification failed", detail: verifyResult },
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
