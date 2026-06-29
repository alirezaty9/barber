// رپر کوچک روی fetch برای APIهای داخلی: در صورت خطا، پیام فارسیِ سرور را throw می‌کند.
export async function http(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // پاسخ بدون بدنه
  }

  if (!res.ok) {
    const message = body?.error || 'خطایی رخ داد. دوباره تلاش کنید.';
    const error = new Error(message);
    error.status = res.status;
    error.details = body?.details;
    throw error;
  }
  return body;
}
