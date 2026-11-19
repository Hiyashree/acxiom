// Small fetch wrapper for the Express API.
// Throws an Error with the server's message when the request fails.
export async function api(url, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure "npm start" is running.');
  }

  const data = await res.json().catch(() => ({}));

  // Session expired: tell the app so it can go back to the login page.
  if (res.status === 401 && !url.startsWith('/api/auth/')) {
    window.dispatchEvent(new Event('unauthorized'));
  }
  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.status = res.status;
    throw error;
  }
  return data;
}
