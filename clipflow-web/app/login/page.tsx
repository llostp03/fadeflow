"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getMe, login, setStoredToken } from "@/lib/api";
import { needsPaywall } from "@/lib/subscription";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);

  const handleLogin = async () => {
    if (!formRef.current?.reportValidity()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const data = await login({ email, password });
      const token =
        typeof data.token === "string" && data.token.length > 0 ? data.token : null;
      if (token) {
        setStoredToken(token);
      }

      let message = "Login success.";
      if (token) {
        try {
          const meData = await getMe(token);
          if (meData) {
            if (needsPaywall(meData.subscription_status)) {
              message +=
                " Your subscription is not active — open the ClipFlow app to upgrade to ClipFlow Pro.";
            } else {
              message += " ClipFlow Pro is active.";
            }
          }
        } catch {
          /* optional /me failure — still logged in */
        }
      }

      alert(message);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error logging in");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#0b0b0f] px-4 py-16 text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#222] bg-gradient-to-b from-[#16161d] to-[#0f0f14] p-8 shadow-xl">
        <div className="mb-6 text-center text-xl font-extrabold tracking-wide">
          Clip<span className="text-[#d4af37]">Flow</span>
        </div>
        <h1 className="mb-2 text-center text-lg font-bold">Barber sign in</h1>
        <p className="mb-6 text-center text-sm text-zinc-400">
          Same email and password as the mobile app.
        </p>

        <form
          ref={formRef}
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#333] bg-[#141418] px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#d4af37] focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#333] bg-[#141418] px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#d4af37] focus:outline-none"
              placeholder="Password"
            />
          </div>

          <Button
            type="button"
            className="mt-2"
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/signup" className="font-semibold text-[#d4af37] hover:underline">
            Create account
          </Link>
          {" · "}
          <Link href="/" className="text-zinc-400 hover:text-zinc-300">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
