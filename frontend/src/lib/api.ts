export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // Merge default headers and options
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // We must include credentials so the HTTP-only cookie containing the JWT is sent
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
      // We can trigger an event or redirect to login here if needed
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/signin';
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
