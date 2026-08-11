import { readApiJson } from "@/lib/api/read-json";

export async function deleteContactById(
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/contacts/${contactId}`, {
    method: "DELETE",
  });

  const data = await readApiJson<{ success?: boolean; error?: string }>(res);

  if (!res.ok) {
    return {
      success: false,
      error: data.error ?? "Could not delete contact",
    };
  }

  return { success: true };
}
