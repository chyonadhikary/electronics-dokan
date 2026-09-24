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

// Replace this value after deploying the Google Apps Script Web App.
export const ORDER_BACKEND_URL = "https://script.google.com/macros/s/AKfycbxfB2xgFecnBN3pSLUnEOo2Pn-N8pMFmL0GizQAWNtwe0hVpwOi-FROw0J-wr8IRek/exec";

export type OrderSubmitResult = { ok: boolean; configured: boolean; orderId?: string; opaque?: boolean };

export async function submitOrderToAppsScript(payload: OrderPayload): Promise<OrderSubmitResult> {
  if (!ORDER_BACKEND_URL || ORDER_BACKEND_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL")) {
    return { ok: false, configured: false };
  }

  const body = JSON.stringify(payload);
  try {
    const response = await fetch(ORDER_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
      keepalive: true,
    });
    if (!response.ok) throw new Error("Order service rejected the request");
    const result = await response.json() as { ok?: boolean; orderId?: string };
    if (!result.ok) throw new Error("Order service did not accept the request");
    return { ok: true, configured: true, orderId: result.orderId };
  } catch (error) {
    // Apps Script ContentService may return a cross-origin response that browsers
    // cannot expose to JavaScript. The backend is idempotent by clientRequestId,
    // so this fallback still records the order without creating duplicates.
    if (error instanceof TypeError) {
      try {
        await fetch(ORDER_BACKEND_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body, keepalive: true });
        return { ok: true, configured: true, opaque: true, orderId: payload.clientRequestId };
      } catch {
        // Fall through to the customer-safe error below.
      }
    }
    throw new Error("ORDER_SUBMISSION_FAILED");
  }
}
