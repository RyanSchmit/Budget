"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { createClient } from "@/lib/supabase/client";
import { getUserProfile, updateAiPreferences, AiPreferences } from "@/lib/api/user";
import { setPreferences } from "@/lib/store/preferencesSlice";
import type { AppDispatch } from "@/lib/store/store";
import Navbar from "@/app/Navbar";
import type { User } from "@supabase/supabase-js";

function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-950",
        checked ? "bg-green-600" : "bg-gray-600",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefs] = useState<AiPreferences>({
    allow_ai_data_access: true,
    allow_ai_categorization: true,
    enable_ai_advisor: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/auth/sign-in");
        return;
      }
      setUser(session.user);
      getUserProfile()
        .then(({ preferences }) => {
          setPrefs(preferences);
        })
        .finally(() => setLoading(false));
    });
  }, []);

  const handleToggle = (field: keyof Omit<AiPreferences, "updated_at">) => (val: boolean) => {
    setPrefs((prev) => ({ ...prev, [field]: val }));
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const { preferences: updated } = await updateAiPreferences({
        allow_ai_data_access: prefs.allow_ai_data_access,
        allow_ai_categorization: prefs.allow_ai_categorization,
        enable_ai_advisor: prefs.enable_ai_advisor,
      });
      setPrefs(updated);
      dispatch(setPreferences(updated));
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const advisorOff = !prefs.enable_ai_advisor;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-400 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-28 pb-16">
        <h1 className="text-2xl font-semibold text-white mb-8">
          Profile
        </h1>

        {/* ── Account Info ─────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Account
          </h2>

          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-400">Email</dt>
              <dd className="text-sm font-medium text-white">
                {user?.email}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-400">User ID</dt>
              <dd className="text-xs font-mono text-gray-500 truncate max-w-[200px]">
                {user?.id}
              </dd>
            </div>
          </dl>
        </section>

        {/* ── AI & Data Settings ───────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
            AI &amp; Data Settings
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Control how AI features interact with your data. All settings default
            to on and can be changed at any time.
          </p>

          <div className="space-y-6">
            {/* Enable AI Advisor */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label
                  htmlFor="toggle-enable-advisor"
                  className="text-sm font-medium text-white cursor-pointer"
                >
                  Enable AI Advisor
                </label>
                <p className="text-xs text-gray-400 mt-0.5">
                  Turns the AI financial advisor feature on or off entirely.
                  Disabling this also suspends the two settings below.
                </p>
              </div>
              <Toggle
                id="toggle-enable-advisor"
                checked={prefs.enable_ai_advisor}
                onChange={handleToggle("enable_ai_advisor")}
              />
            </div>

            <div className={advisorOff ? "opacity-50 pointer-events-none" : ""}>
              <div className="space-y-6">
                {/* Allow AI data access */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="toggle-data-access"
                      className="text-sm font-medium text-white cursor-pointer"
                    >
                      Allow AI to view my transactions
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Grants the AI advisor read access to your financial data
                      (net-worth snapshots). Turn off to keep your data private
                      while still using the advisor for general questions.
                    </p>
                  </div>
                  <Toggle
                    id="toggle-data-access"
                    checked={prefs.allow_ai_data_access}
                    onChange={handleToggle("allow_ai_data_access")}
                    disabled={advisorOff}
                  />
                </div>

                {/* Allow AI categorization */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="toggle-categorization"
                      className="text-sm font-medium text-white cursor-pointer"
                    >
                      Auto-categorize my transactions
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Lets AI automatically label and group your transactions.
                      When off, you assign categories manually.
                    </p>
                  </div>
                  <Toggle
                    id="toggle-categorization"
                    checked={prefs.allow_ai_categorization}
                    onChange={handleToggle("allow_ai_categorization")}
                    disabled={advisorOff}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save row */}
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save Preferences"}
            </button>

            {saveStatus === "success" && (
              <span className="text-sm text-green-400">
                Preferences saved.
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-400">
                Failed to save. Please try again.
              </span>
            )}
          </div>
        </section>

        {/* ── Danger Zone ──────────────────────────────────────── */}
        <section className="rounded-xl border border-red-900/40 bg-red-950/20 p-6">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-1">
            Danger Zone
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Signing out will end your current session.
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium rounded border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            Sign Out
          </button>
        </section>
      </main>
    </div>
  );
}
