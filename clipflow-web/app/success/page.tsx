"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import Link from "next/link";
import {
  AUTH_TOKEN_STORAGE_KEY,
  CHECKOUT_SESSION_STORAGE_KEY,
  confirmPaidCheckout,
  getMe,
} from "@/lib/api";
import { isActiveSubscription } from "@/lib/subscription";

const POLL_MS = 2000;
const MAX_ATTEMPTS = 30;

type Phase = "checking" | "unlocked" | "pending" | "no_token";

function readCheckoutSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("session_id") || sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
}

export default function SuccessPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [checkError, setCheckError] = useState<string | null>(null);

  const runCheckOnce = useCallback(async (token: string) => {
    const me = await getMe(token);
    if (isActiveSubscription(me.subscription_status)) {
      setPhase("unlocked");
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
        : null;

    if (!token) {
      startTransition(() => setPhase("no_token"));
      return;
    }

    const sessionId = readCheckoutSessionId();
    if (sessionId) {
      sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, sessionId);
    }

    const poll = async () => {
      if (sessionId) {
        try {
          const confirmed = await confirmPaidCheckout(token, sessionId);
          if (
            !cancelled &&
            (confirmed?.ok === true ||
              isActiveSubscription(
                (confirmed as { subscription_status?: string })?.subscription_status
              ))
          ) {
            setPhase("unlocked");
            return;
          }
        } catch (e) {
          if (!cancelled) {
            setCheckError(e instanceof Error ? e.message : "Could not confirm payment with server.");
            setPhase("pending");
          }
        }
      }

      let attempts = 0;
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        attempts += 1;
        try {
          const ok = await runCheckOnce(token);
          if (cancelled) return;
          if (ok) return;
        } catch (e) {
          if (!cancelled) {
            setCheckError(e instanceof Error ? e.message : "Could not reach account service.");
          }
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) setPhase("pending");
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [runCheckOnce]);

  const handleCheckAgain = async () => {
    setCheckError(null);
    const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      setPhase("no_token");
      return;
    }
    setPhase("checking");
    const sessionId = readCheckoutSessionId();
    if (sessionId) {
      sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, sessionId);
      try {
        const confirmed = await confirmPaidCheckout(token, sessionId);
        if (
          confirmed?.ok === true ||
          isActiveSubscription(
            (confirmed as { subscription_status?: string })?.subscription_status
          )
        ) {
          setPhase("unlocked");
          return;
        }
      } catch (e) {
        setCheckError(e instanceof Error ? e.message : "Confirm failed.");
      }
    }
    try {
      const ok = await runCheckOnce(token);
      if (!ok) setPhase("pending");
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : "Check failed.");
      setPhase("pending");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-4xl font-bold">Payment successful</h1>

        {checkError ? (
          <p className="text-sm text-red-300" role="alert">
            {checkError}
          </p>
        ) : null}

        {phase === "checking" && (
          <p className="text-zinc-300">
            Confirming your ClipFlow Pro access with your account… This usually takes a few seconds.
          </p>
        )}

        {phase === "unlocked" && (
          <>
            <p className="text-zinc-300">
              Your account is unlocked. ClipFlow Pro is active on this browser session.
            </p>
            <Link
              href="/"
              className="inline-block rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black"
            >
              Back to home
            </Link>
          </>
        )}

        {phase === "pending" && (
          <>
            <p className="text-zinc-300">
              Payment is complete, but we could not confirm Pro access yet. If you just paid, open this page
              from the email receipt link or try &quot;Check again&quot;. Also confirm your API has
              STRIPE_WEBHOOK_SECRET set and the webhook URL registered in Stripe.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleCheckAgain()}
                className="inline-block rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black"
              >
                Check again
              </button>
              <Link
                href="/"
                className="inline-block rounded-2xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
              >
                Return home
              </Link>
            </div>
          </>
        )}

        {phase === "no_token" && (
          <>
            <p className="text-zinc-300">
              We don&apos;t see a ClipFlow sign-in on this browser (no saved session). If you paid while
              signed in elsewhere, sign in here with the same account—your Pro unlock is tied to your
              user id on the server.
            </p>
            <Link
              href="/#auth"
              className="inline-block rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
