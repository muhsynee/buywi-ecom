// Provider-neutral payment architecture.
// Add Razorpay/Stripe SDK calls here when credentials are configured.
// Never persist raw card data. Store only provider references/status.

export async function createPaymentOrder({ amount, currency = "INR", receipt }) {
  return {
    provider: process.env.RAZORPAY_KEY_ID ? "razorpay" : "demo",
    id: `pay_demo_${Date.now()}`,
    amount,
    currency,
    receipt
  };
}

export async function verifyPayment(payload) {
  // In production verify the gateway signature server-side.
  return { verified: Boolean(payload?.paymentId || payload?.signature) };
}
