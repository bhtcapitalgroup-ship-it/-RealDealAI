/**
 * React hooks for the onboarding flow.
 *
 * - useOnboardingStatus()      — check if onboarding is complete
 * - useSavePreferences()       — save preferences at each step
 * - useRecommendedMarkets()    — get market recommendations
 * - useAutoCreateAlerts()      — create alerts from preferences
 */

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingStatus {
  onboarding_completed: boolean;
  current_step: number;
  total_steps: number;
  steps_detail: Record<string, boolean>;
}

export interface Preferences {
  investment_types?: string[];
  target_markets?: Array<{ city: string; state: string }>;
  budget_min?: number;
  budget_max?: number;
  min_cap_rate?: number;
  min_cash_flow?: number;
  property_types?: string[];
  experience_level?: "beginner" | "intermediate" | "advanced";
  onboarding_step?: number;
}

export interface PreferencesResponse extends Preferences {
  id: string;
  user_id: string;
  onboarding_completed: boolean;
  onboarding_step: number;
}

export interface RecommendedMarket {
  city: string;
  state: string;
  median_price: number;
  median_rent: number;
  cap_rate: number;
  market_score: number;
  reason: string;
}

export interface CreatedAlert {
  id: string;
  name: string;
  filters: Record<string, unknown>;
}

export interface AutoCreateAlertsResponse {
  alerts_created: number;
  alerts: CreatedAlert[];
}

// ---------------------------------------------------------------------------
// useOnboardingStatus
// ---------------------------------------------------------------------------

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<OnboardingStatus>("/onboarding/status");
      setStatus(data);
    } catch {
      setError("Failed to load onboarding status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    status,
    isComplete: status?.onboarding_completed ?? false,
    currentStep: status?.current_step ?? 0,
    loading,
    error,
    refetch: fetch,
  };
}

// ---------------------------------------------------------------------------
// useSavePreferences
// ---------------------------------------------------------------------------

export function useSavePreferences() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreferencesResponse | null>(null);

  const save = useCallback(async (preferences: Preferences) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.post<PreferencesResponse>(
        "/onboarding/preferences",
        preferences
      );
      setData(result);
      return result;
    } catch {
      setError("Failed to save preferences");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { save, data, loading, error };
}

// ---------------------------------------------------------------------------
// useRecommendedMarkets
// ---------------------------------------------------------------------------

export function useRecommendedMarkets() {
  const [markets, setMarkets] = useState<RecommendedMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<RecommendedMarket[]>(
        "/onboarding/recommended-markets"
      );
      setMarkets(data);
    } catch {
      setError("Failed to load recommended markets");
    } finally {
      setLoading(false);
    }
  }, []);

  return { markets, loading, error, fetch };
}

// ---------------------------------------------------------------------------
// useAutoCreateAlerts
// ---------------------------------------------------------------------------

export function useAutoCreateAlerts() {
  const [result, setResult] = useState<AutoCreateAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<AutoCreateAlertsResponse>(
        "/onboarding/create-alerts"
      );
      setResult(data);
      return data;
    } catch {
      setError("Failed to create alerts");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, createAlerts, loading, error };
}
