import { apiFetch } from "@/lib/api/client";

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
