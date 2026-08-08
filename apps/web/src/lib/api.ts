const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

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

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiClient(endpoint: string, options: FetchOptions = {}) {
  // Grab token from sessionStorage (assuming AuthContext sets it there)
  const token = sessionStorage.getItem("access_token");
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  // endpoint should start with a slash, e.g. "/journeys"
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401) {
      // Dispatch event to clear session
      window.dispatchEvent(new Event("auth-unauthorized"));
    }
    
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail.map((e: any) => e.msg).join(", ");
      }
    } catch (e) {}

    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}

apiClient.get = (endpoint: string, options: FetchOptions = {}) => apiClient(endpoint, { ...options, method: 'GET' });
apiClient.post = (endpoint: string, data?: any, options: FetchOptions = {}) => apiClient(endpoint, { ...options, method: 'POST', data });
apiClient.put = (endpoint: string, data?: any, options: FetchOptions = {}) => apiClient(endpoint, { ...options, method: 'PUT', data });
apiClient.patch = (endpoint: string, data?: any, options: FetchOptions = {}) => apiClient(endpoint, { ...options, method: 'PATCH', data });
apiClient.delete = (endpoint: string, options: FetchOptions = {}) => apiClient(endpoint, { ...options, method: 'DELETE' });
