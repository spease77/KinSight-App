export async function readApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    throw new Error("Empty server response.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.trim().slice(0, 80);
    if (preview.startsWith("Internal Server Error")) {
      throw new Error(
        "Server error while loading data. Restart the dev server and refresh the page."
      );
    }

    throw new Error("Unexpected server response. Please refresh and try again.");
  }
}
