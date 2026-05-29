export function normalizeEsewaAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function getEsewaPaymentUrl() {
  return process.env.NEXT_PUBLIC_ESEWA_ENVIRONMENT === "production"
    ? "https://epay.esewa.com.np/api/epay/main/v2/form"
    : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
}
