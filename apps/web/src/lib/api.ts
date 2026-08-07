const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function sendOtp(phone: string) {
  const res = await fetch(`${API_BASE_URL}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to send OTP");
  }
  return res.json();
}

export async function verifyOtp(phone: string, code: string) {
  const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Invalid OTP");
  }
  return res.json(); // { access_token, refresh_token, token_type }
}

export async function loginAsGuest() {
  const res = await fetch(`${API_BASE_URL}/auth/guest`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to login as guest");
  }
  return res.json();
}
