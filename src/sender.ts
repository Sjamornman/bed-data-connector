export async function postJson<T>(
  url: string,
  body: unknown,
  timeoutMs: number,
  headers: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; data: T | string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await response.text();
    let data: T | string | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } finally {
    clearTimeout(timer);
  }
}
