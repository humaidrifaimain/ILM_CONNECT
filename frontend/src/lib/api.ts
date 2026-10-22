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

export interface ApiFetchOptions extends RequestInit {
  skipRedirect?: boolean;
}

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
  const token = getAuthToken();
  const authHeaders: Record<string, string> = {};

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Merge default headers and options
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeaders,
      ...options.headers,
    },
    cache: 'no-store', // Prevent Next.js from caching dynamic API requests
    // We include credentials for cookies as well as Bearer token header
    credentials: 'include', 
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, defaultOptions);

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      if (
        typeof errorData === 'object' &&
        errorData !== null &&
        'message' in errorData &&
        typeof errorData.message === 'string'
      ) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'object' && errorData !== null && 'message' in errorData && Array.isArray(errorData.message)) {
        errorMessage = errorData.message.filter((message): message is string => typeof message === 'string').join('. ') || errorMessage;
      }
    } catch {
      errorMessage = response.statusText;
    }

    // Special case for unauthorized
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ilm_token');
        localStorage.removeItem('ilm_user');
        if (!options.skipRedirect && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/signin';
        }
      }
    }

    const error = Object.assign(new Error(errorMessage), {
      data: errorData,
      status: response.status,
    });
    throw error;
  }

  // If the response is empty (like a 204 No Content), don't try to parse JSON
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function downloadMaterial(id: string, title: string) {
  const response = await fetch(`${API_BASE_URL}/materials/${encodeURIComponent(id)}/file`, { credentials: 'include', headers: { Authorization: `Bearer ${getAuthToken() || ''}` } });
  if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.message || 'Unable to download this file'); }
  const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
  const extension = blob.type === 'application/pdf' ? '.pdf' : blob.type === 'image/png' ? '.png' : '.jpg';
  link.href = url; link.download = title.replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 100) + extension; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
