export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ilm_token');
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('ilm_token', token);
  } else {
    localStorage.removeItem('ilm_token');
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const authHeaders: Record<string, string> = {};

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Merge default headers and options
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    // We include credentials for cookies as well as Bearer token header
    credentials: 'include', 
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, defaultOptions);

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorData: any = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }

    // Special case for unauthorized
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ilm_token');
        localStorage.removeItem('ilm_user');
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/signin';
        }
      }
    }

    const error: any = new Error(errorMessage);
    error.data = errorData;
    error.status = response.status;
    throw error;
  }

  // If the response is empty (like a 204 No Content), don't try to parse JSON
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
