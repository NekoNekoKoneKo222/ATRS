import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { signUpWithEmail, signInWithEmail, signOut as signOutRequest, onAuthStateChange } from "@astral-archive/supabase";
import { supabaseClient, supabaseConfigured } from "./supabaseClient.js";

export type AuthStatus = "not_configured" | "loading" | "signed_out" | "signed_in";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabaseConfigured ? "loading" : "not_configured");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseClient) {
      setStatus("not_configured");
      return;
    }

    let cancelled = false;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setStatus(data.session ? "signed_in" : "signed_out");
    });

    const unsubscribe = onAuthStateChange(supabaseClient, (nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      setStatus(nextSession ? "signed_in" : "signed_out");
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) return;
    setErrorMessage(null);
    const result = await signUpWithEmail(supabaseClient, email, password);
    if (!result.ok) setErrorMessage(result.error ?? "サインアップに失敗しました。");
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseClient) return;
    setErrorMessage(null);
    const result = await signInWithEmail(supabaseClient, email, password);
    if (!result.ok) setErrorMessage(result.error ?? "サインインに失敗しました。");
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseClient) return;
    setErrorMessage(null);
    const result = await signOutRequest(supabaseClient);
    if (!result.ok) setErrorMessage(result.error ?? "サインアウトに失敗しました。");
  }, []);

  return { status, session, errorMessage, signUp, signIn, signOut };
}
