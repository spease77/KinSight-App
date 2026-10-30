import type { ContactDetail } from "@/types/contact";

export async function fetchRemoteAvatarBlob(
  url: string
): Promise<{ blob?: Blob; error?: string }> {
  const res = await fetch("/api/contacts/avatar/from-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    return { error: data?.error ?? "Could not download that image URL." };
  }

  const blob = await res.blob();
  if (!blob.type.startsWith("image/") || blob.size < 32) {
    return { error: "That URL did not return an image." };
  }

  return { blob };
}

export async function uploadContactAvatarBlob(
  contactId: string,
  blob: Blob,
  mimeType = "image/jpeg"
): Promise<{ contact?: ContactDetail; error?: string }> {
  const formData = new FormData();
  formData.append(
    "photo",
    new File([blob], "avatar.jpg", { type: mimeType })
  );

  const res = await fetch(`/api/contacts/${contactId}/avatar`, {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as {
    contact?: ContactDetail;
    error?: string;
  };

  if (!res.ok || !data.contact) {
    return { error: data.error ?? "Could not upload photo." };
  }

  return { contact: data.contact };
}

export async function setContactAvatarFromUrl(
  contactId: string,
  url: string
): Promise<{ contact?: ContactDetail; error?: string }> {
  const res = await fetch(`/api/contacts/${contactId}/avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = (await res.json()) as {
    contact?: ContactDetail;
    error?: string;
  };

  if (!res.ok || !data.contact) {
    return { error: data.error ?? "Could not save that image URL." };
  }

  return { contact: data.contact };
}

export async function removeContactAvatar(
  contactId: string
): Promise<{ contact?: ContactDetail; error?: string }> {
  const res = await fetch(`/api/contacts/${contactId}/avatar`, {
    method: "DELETE",
  });

  const data = (await res.json()) as {
    contact?: ContactDetail;
    error?: string;
  };

  if (!res.ok || !data.contact) {
    return { error: data.error ?? "Could not remove photo." };
  }

  return { contact: data.contact };
}
