import { getAccessToken } from "@/lib/api/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AiPreferences {
  allow_ai_data_access: boolean;
  allow_ai_categorization: boolean;
  enable_ai_advisor: boolean;
  updated_at?: string;
}

export interface UserProfile {
  user: {
    id: string;
    email: string;
  };
  preferences: AiPreferences;
}

export function getUserProfile(): Promise<UserProfile> {
  return apiFetch("/api/user/profile");
}

export function updateAiPreferences(
  prefs: Partial<Omit<AiPreferences, "updated_at">>,
): Promise<{ preferences: AiPreferences }> {
  return apiFetch("/api/user/preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
}
