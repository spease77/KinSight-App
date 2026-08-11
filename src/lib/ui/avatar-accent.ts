export type AvatarAccent = "blue" | "green" | "orange";

const ACCENTS: AvatarAccent[] = ["blue", "green", "orange"];

export function avatarAccentFromId(id: string): AvatarAccent {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % ACCENTS.length;
  }
  return ACCENTS[hash]!;
}

export const AVATAR_RING_CLASS: Record<AvatarAccent, string> = {
  blue: "avatar-ring-blue",
  green: "avatar-ring-green",
  orange: "avatar-ring-orange",
};

export const AVATAR_TEXT_CLASS: Record<AvatarAccent, string> = {
  blue: "text-icon",
  green: "text-accent-green-bright",
  orange: "text-accent-orange-bright",
};

export const CHEVRON_CLASS: Record<AvatarAccent, string> = {
  blue: "text-icon",
  green: "text-accent-green-bright",
  orange: "text-accent-orange-bright",
};
