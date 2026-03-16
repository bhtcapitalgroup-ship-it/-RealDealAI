import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  amount: number;
  interval: 'month' | 'year';
}

export interface Invoice {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  pdf_url?: string;
  description?: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Subscription>('/billing/subscription');
      setSubscription(data);
    } catch {
      setError('Failed to load subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { subscription, loading, error, refetch: fetch };
}

export function useCreateCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckout = useCallback(async (planId: string, interval: 'month' | 'year' = 'month') => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ checkout_url: string }>('/billing/checkout', { plan_id: planId, interval });
      window.location.href = data.checkout_url;
    } catch {
      setError('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCheckout, loading, error };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Invoice[]>('/billing/invoices');
      setInvoices(data);
    } catch {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { invoices, loading, error, refetch: fetch };
}

export function useCancelSubscription() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/billing/cancel');
      return true;
    } catch {
      setError('Failed to cancel subscription');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { cancel, loading, error };
}

export function useReactivate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reactivate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/billing/reactivate');
      return true;
    } catch {
      setError('Failed to reactivate subscription');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { reactivate, loading, error };
}
