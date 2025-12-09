// Predefined list of club members for consistent tracking
export const CLUB_MEMBERS = [
  "MOAAD HIMIDI",
  "Shahouda",
  "Nissrine Elhafiane",
  "Jihane El-Hafiane",
  "Yassine Khayatte",
  "Ayman Elharmouchi",
  "Said Elfadily",
  "Salma Chrayah",
  "Aya",
  "Yahya",
] as const;

export type ClubMember = typeof CLUB_MEMBERS[number];

// Map old/inconsistent names to standardized names
export const NAME_ALIASES: Record<string, string> = {
  "MOAAD HIMIDI ": "MOAAD HIMIDI",
  "moaad test": "MOAAD HIMIDI",
  "chahouda": "Shahouda",
  "shahouda🌸": "Shahouda",
  "Shahouda🤍": "Shahouda",
  "Shahudaaa💗": "Shahouda",
  "Nissrine elhafiane ": "Nissrine Elhafiane",
  "Jihane el-hafiane": "Jihane El-Hafiane",
  "Yassine Khayatte ": "Yassine Khayatte",
  "Ayman elharmouchi ": "Ayman Elharmouchi",
  "SAID EL FADILY": "Said Elfadily",
  "said elfadily": "Said Elfadily",
  "Salma Chrayah ": "Salma Chrayah",
  "yahya": "Yahya",
};

// Normalize a registered_by name to standard format
export const normalizeMemberName = (name: string | null): string => {
  if (!name) return "Unknown";
  const trimmed = name.trim();
  return NAME_ALIASES[trimmed] || NAME_ALIASES[name] || trimmed;
};
