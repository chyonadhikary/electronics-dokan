export type OrderItemPayload = {
  productName: string;
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderPayload = {
  clientRequestId: string;
  customer: {
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    district: string;
    area: string;
    division: string;
    postOffice: string;
    postCode: string;
  };
  items: OrderItemPayload[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  courier: string;
  paymentMethod: string;
  customerNote: string;
  couponCode: string;
  source: string;
};

export const ORDER_BACKEND_URL = "https://script.google.com/macros/s/AKfycbzvcGgEV-I8Ev7kIVpbYImYTwafLKiu7sYYrrS7HluF_8ytG8E6NTR3DMb5VSX7ya2P/exec";

export type OrderSubmitResult = { ok: boolean; configured: boolean; orderId?: string; opaque?: boolean };

export async function submitOrderToAppsScript(payload: OrderPayload): Promise<OrderSubmitResult> {
  if (!ORDER_BACKEND_URL || ORDER_BACKEND_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL")) {
    return { ok: false, configured: false };
  }

  const body = JSON.stringify(payload);
  const submitOpaque = async (): Promise<OrderSubmitResult> => {
    // Apps Script may follow its redirect to a response that the browser cannot
    // expose to JavaScript. The receiver is idempotent by clientRequestId, so
    // this request is safe even when the first request already reached Sheets.
    await fetch(ORDER_BACKEND_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      keepalive: true,
    });
    return { ok: true, configured: true, opaque: true, orderId: payload.clientRequestId };
  };

  try {
    const response = await fetch(ORDER_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      keepalive: true,
    });
    if (!response.ok) throw new Error("Order service rejected the request");

    // Read as text first: a successful Apps Script redirect can occasionally
    // return an HTML wrapper instead of exposing the JSON response to fetch.
    const raw = await response.text();
    try {
      const result = JSON.parse(raw) as { ok?: boolean; orderId?: string };
      if (!result.ok) throw new Error("Order service did not accept the request");
      return { ok: true, configured: true, orderId: result.orderId };
    } catch (parseError) {
      if (parseError instanceof Error && parseError.message === "Order service did not accept the request") throw parseError;
      return submitOpaque();
    }
  } catch {
    return submitOpaque();
  }
}
