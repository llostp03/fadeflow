"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createCheckoutSession } from "@/lib/api";
import {
  AUTH_TOKEN_STORAGE_KEY,
  clearStoredToken,
  getMe,
  getStoredToken,
  login,
  signup,
  type AuthUser,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Calendar,
  CreditCard,
  Scissors,
  ShieldCheck,
  ArrowRight,
  Mail,
  Lock,
  LogIn,
  Crown,
  Star,
  Clock3,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart booking",
    text: "Let clients book faster with a clean, premium experience that feels easy from first tap to confirmed appointment.",
  },
  {
    icon: CreditCard,
    title: "Payments built in",
    text: "Take deposits and payments inside one system so you reduce no-shows and keep your cash flow tighter.",
  },
  {
    icon: ShieldCheck,
    title: "Pro access control",
    text: "Barbers create an account, upgrade to Pro, and unlock their full workflow without manual onboarding.",
  },
  {
    icon: Scissors,
    title: "Made for barbers",
    text: "Built around barber services, repeat clients, grooming add-ons, and a premium brand feel from day one.",
  },
];

const steps = [
  "Create your ClipFlow account",
  "Sign in and explore the app",
  "Upgrade to ClipFlow Pro",
  "Unlock bookings, payments, and growth tools",
];

const testimonials = [
  {
    name: "Jay, mobile barber",
    quote:
      "ClipFlow made my booking process look way more premium. Clients stopped DMing me for every little thing.",
  },
  {
    name: "Marcus, shop owner",
    quote:
      "The payment flow helped cut down no-shows, and the whole brand feel instantly looked more legit.",
  },
  {
    name: "Andre, solo barber",
    quote:
      "It feels like a real system, not a random booking link. That made people trust me faster.",
  },
];

/** Quick manual test values for signup / signin fields (not real accounts—sign up once against your API if needed). */
const QUICK_TEST_AUTH = {
  name: "QA Test User",
  email: "clipflow.qa.local@example.com",
  password: "ClipFlowLocal2026",
} as const;

const appointments = [
  { time: "9:00 AM", client: "Jordan W.", service: "Fade + Beard", status: "Confirmed" },
  { time: "11:30 AM", client: "Chris P.", service: "Premium Cut", status: "Paid" },
  { time: "2:00 PM", client: "Malik T.", service: "House Call", status: "Pending" },
];

function SectionTitle({
  badge,
  title,
  text,
}: {
  badge: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-center">
      <Badge className="rounded-full px-4 py-1 text-sm">{badge}</Badge>
      <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">{title}</h2>
      <p className="text-base text-zinc-300 md:text-lg">{text}</p>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-2xl font-black tracking-tight text-white md:text-3xl">
      Clip<span className="text-yellow-400">Flow</span>
    </div>
  );
}

export default function ClipFlowWebsite() {
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [meUser, setMeUser] = useState<AuthUser | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [email, setEmail] = useState<string>(QUICK_TEST_AUTH.email);
  const [name, setName] = useState<string>(QUICK_TEST_AUTH.name);
  const [password, setPassword] = useState<string>(QUICK_TEST_AUTH.password);
  const [confirmPassword, setConfirmPassword] = useState<string>(QUICK_TEST_AUTH.password);
  const [loading, setLoading] = useState<"signup" | "signin" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [dashboardHint, setDashboardHint] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const refreshAccount = useCallback(async () => {
    setMeLoading(true);
    try {
      const t = getStoredToken();
      setToken(t);
      if (!t) {
        setMeUser(null);
        setCurrentUser(null);
        return;
      }
      const me = await getMe(t);
      setMeUser(me);
      setCurrentUser(me);
      setEmail(me.email);
      setName(me.name?.trim() || "ClipFlow Barber");
    } catch {
      clearStoredToken();
      setMeUser(null);
      setCurrentUser(null);
      setToken(null);
    } finally {
      setMeLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!saved) {
      setMeLoading(false);
      return;
    }

    setToken(saved);

    getMe(saved)
      .then((user) => {
        setCurrentUser(user);
        setMeUser(user);
        setEmail(user.email);
        setName(user.name?.trim() || "ClipFlow Barber");
      })
      .catch(() => {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setToken(null);
        setCurrentUser(null);
        setMeUser(null);
      })
      .finally(() => {
        setMeLoading(false);
      });
  }, []);

  useEffect(() => {
    const onFocus = () => void refreshAccount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_STORAGE_KEY || e.key === null) void refreshAccount();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshAccount]);

  const handleSignup = async () => {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Confirm password must match your password exactly.");
      return;
    }

    try {
      setLoading("signup");

      await signup({
        name,
        email,
        password,
      });

      setMessage("Account created. You can sign in now.");
      setAuthMode("signin");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setLoading(null);
    }
  };

  const handleSignin = async () => {
    setError("");
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading("signin");

      const result = await login({
        email,
        password,
      });

      window.localStorage.setItem("clipflow_token", result.token);
      setToken(result.token);
      setCurrentUser(result.user);
      setMeUser(result.user);
      setEmail(result.user.email);
      setName(result.user.name?.trim() || "ClipFlow Barber");
      setMessage("Signed in successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(null);
    }
  };

  const handleRefreshAccount = async () => {
    if (!token) return;

    setError("");
    setMessage("");

    try {
      const me = await getMe(token);
      setCurrentUser(me);
      setMeUser(me);
      setEmail(me.email);
      setName(me.name?.trim() || "ClipFlow Barber");
      setMessage("Account refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh account.");
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("clipflow_token");
    setToken(null);
    setCurrentUser(null);
    setMeUser(null);
    setDashboardHint(null);
    setEmail(QUICK_TEST_AUTH.email);
    setName(QUICK_TEST_AUTH.name);
    setPassword(QUICK_TEST_AUTH.password);
    setConfirmPassword(QUICK_TEST_AUTH.password);
    setMessage("Signed out.");
    setError("");
  };

  const isLoggedIn = !!meUser;
  const sub = String(currentUser?.subscription_status ?? "").trim().toLowerCase();
  const subscriptionActive = sub === "active";
  const showPaywall = !!(currentUser && !subscriptionActive);

  const handleUpgrade = async () => {
    if (!token) {
      setError("Sign in first.");
      return;
    }

    setError("");
    setMessage("");

    try {
      setCheckoutLoading(true);

      const data = await createCheckoutSession(token);

      if (!data?.url) {
        throw new Error("Checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const status = useMemo(() => {
    if (meLoading) return "…";
    if (!meUser) return "locked";
    if (showPaywall) return "paywall";
    return "active";
  }, [meLoading, meUser, showPaywall]);

  return (
    <div className="min-h-screen bg-[#05060b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_28%)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060b]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
            <a href="#auth" className="transition-colors hover:text-white">
              Account
            </a>
            <a href="#dashboard" className="transition-colors hover:text-white">
              Dashboard
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={handleLogout}
              >
                Sign out
              </Button>
            )}
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-white/15 bg-transparent text-white hover:bg-white/10",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "default" }),
                "bg-yellow-400 font-semibold text-black hover:bg-yellow-300",
              )}
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-14 md:grid-cols-2 md:px-8 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-8"
          >
            <Badge className="rounded-full border border-yellow-400/30 bg-white/10 px-4 py-1 text-sm text-yellow-300">
              Premium booking and payments for barbers
            </Badge>
            <div className="space-y-5">
              <h1 className="text-5xl font-black leading-tight tracking-tight md:text-7xl">
                The website, account flow, and barber dashboard for{" "}
                <span className="text-yellow-400">ClipFlow</span>.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-zinc-300 md:text-xl">
                Show off your brand, let barbers create accounts, upgrade to ClipFlow Pro, and unlock
                a premium dashboard for bookings, payments, and growth.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-yellow-400 text-base font-bold text-black hover:bg-yellow-300",
                )}
              >
                Create account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              {isLoggedIn ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-transparent text-base text-white hover:bg-white/10"
                  type="button"
                  disabled={!token}
                  onClick={() => void handleRefreshAccount()}
                >
                  Refresh account
                </Button>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "border-white/15 bg-transparent text-base text-white hover:bg-white/10",
                  )}
                >
                  Sign in
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
              <Card className="rounded-2xl border-white/10 bg-white/5">
                <CardContent className="p-5">
                  <div className="text-3xl font-black text-yellow-400">24/7</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Booking flow that keeps working while you cut, travel, or sleep.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-white/10 bg-white/5">
                <CardContent className="p-5">
                  <div className="text-3xl font-black text-yellow-400">Pro</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Unlock premium features only after payment and active subscription.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-white/10 bg-white/5">
                <CardContent className="p-5">
                  <div className="text-3xl font-black text-yellow-400">1 flow</div>
                  <p className="mt-2 text-sm text-zinc-300">
                    Marketing, signup, payment, and dashboard all feel like one clean system.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <Card className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 shadow-2xl shadow-yellow-500/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold">ClipFlow Pro preview</CardTitle>
                    <CardDescription className="text-zinc-300">
                      What barbers see after login and upgrade
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      meLoading
                        ? "border-zinc-400/30 bg-zinc-500/20 text-zinc-300"
                        : subscriptionActive
                          ? "border-green-400/30 bg-green-500/20 text-green-300"
                          : "border-yellow-400/30 bg-yellow-500/20 text-yellow-300"
                    }
                  >
                    {meLoading ? "…" : subscriptionActive ? "Active" : isLoggedIn ? "Paywall" : "Locked"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-2">
                <div className="relative">
                  <div
                    className={cn(
                      "space-y-4",
                      (!isLoggedIn || showPaywall) && "opacity-45",
                    )}
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="rounded-2xl border-white/10 bg-[#0f1118]">
                        <CardContent className="p-4">
                          <div className="text-xs text-zinc-400">Today</div>
                          <div className="mt-2 text-2xl font-bold">6</div>
                        </CardContent>
                      </Card>
                      <Card className="rounded-2xl border-white/10 bg-[#0f1118]">
                        <CardContent className="p-4">
                          <div className="text-xs text-zinc-400">Revenue</div>
                          <div className="mt-2 text-2xl font-bold">$420</div>
                        </CardContent>
                      </Card>
                      <Card className="rounded-2xl border-white/10 bg-[#0f1118]">
                        <CardContent className="p-4">
                          <div className="text-xs text-zinc-400">Status</div>
                          <div className="mt-2 text-2xl font-bold capitalize">{status}</div>
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="rounded-2xl border-white/10 bg-[#0b0e15]">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Upcoming appointments</div>
                          <Clock3 className="h-4 w-4 text-zinc-400" />
                        </div>
                        {appointments.map((item) => (
                          <div
                            key={`${item.time}-${item.client}`}
                            className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 p-3"
                          >
                            <div>
                              <div className="font-medium">{item.client}</div>
                              <div className="text-sm text-zinc-400">
                                {item.time} · {item.service}
                              </div>
                            </div>
                            <Badge variant="outline" className="border-white/15 text-zinc-200">
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                  {!isLoggedIn && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 p-4 text-center">
                      <p className="max-w-[220px] rounded-full border border-white/15 bg-[#0b0e15]/90 px-4 py-2 text-sm text-zinc-200">
                        Sign in to sync live subscription status
                      </p>
                    </div>
                  )}
                {isLoggedIn && showPaywall && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 p-4 text-center">
                    <div className="flex max-w-[280px] flex-col items-center gap-3 rounded-2xl border border-yellow-400/25 bg-[#0b0e15]/95 px-4 py-4 text-sm text-yellow-100">
                      <p>Upgrade to ClipFlow Pro to unlock this preview.</p>
                      <Button
                        type="button"
                        onClick={handleUpgrade}
                        disabled={!token || checkoutLoading}
                        className="bg-yellow-400 font-semibold text-black hover:bg-yellow-300"
                      >
                        {checkoutLoading ? "Opening checkout..." : "Upgrade to ClipFlow Pro"}
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionTitle
            badge="Features"
            title="Everything the ClipFlow website needs"
            text="This first version combines your marketing site, create-account flow, sign-in path, payment upgrade story, and a barber dashboard preview in one place."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="rounded-3xl border-white/10 bg-white/5 transition-colors hover:bg-white/7"
                >
                  <CardContent className="space-y-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/15">
                      <Icon className="h-6 w-6 text-yellow-300" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-sm leading-7 text-zinc-300">{feature.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <SectionTitle
                badge="How it works"
                title="A clean self-serve barber flow"
                text="People browse the site, create an account, sign in, and only unlock ClipFlow Pro when their subscription becomes active."
              />
            </div>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <Card key={step} className="rounded-3xl border-white/10 bg-white/5">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400 font-black text-black">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{step}</div>
                      <p className="mt-1 text-sm text-zinc-300">
                        {index === 0 &&
                          "Start with a simple, self-serve signup that feels fast and premium."}
                        {index === 1 &&
                          "Signed-in barbers can access their account and see whether Pro is unlocked."}
                        {index === 2 &&
                          "Stripe checkout becomes the unlock moment for the full product."}
                        {index === 3 &&
                          "Once active, they get the dashboard, payments flow, and booking tools."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionTitle
            badge="Pricing"
            title="One clear upgrade path"
            text="Keep the choice simple. Let barbers explore ClipFlow, then upgrade to Pro when they are ready to unlock the full system."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <Card className="overflow-hidden rounded-[32px] border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 via-white/5 to-white/5">
              <CardContent className="p-8 md:p-10">
                <div className="mb-4 flex items-center gap-3">
                  <Crown className="h-6 w-6 text-yellow-300" />
                  <div className="text-xl font-bold">ClipFlow Pro</div>
                </div>
                <div className="text-5xl font-black">
                  $29<span className="text-xl font-semibold text-zinc-400">/mo</span>
                </div>
                <p className="mt-4 max-w-xl leading-7 text-zinc-300">
                  Give barbers the premium booking, payment, and account experience they expect, with
                  a locked-to-unlocked path that makes the app feel valuable.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    "Premium booking flow",
                    "Payments and deposits",
                    "Barber sign-in and account access",
                    "Pro unlock after Stripe payment",
                    "Dashboard view",
                    "Branded client-facing experience",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <CheckCircle2 className="h-5 w-5 text-yellow-300" />
                      <span className="text-sm text-zinc-200">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  {currentUser && subscriptionActive ? (
                    <Button
                      type="button"
                      disabled
                      className="bg-white/10 font-semibold text-zinc-400"
                    >
                      ClipFlow Pro active
                    </Button>
                  ) : currentUser && !subscriptionActive ? (
                    <Button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={!token || checkoutLoading}
                      className="bg-yellow-400 font-semibold text-black hover:bg-yellow-300"
                    >
                      {checkoutLoading ? "Opening checkout..." : "Upgrade to ClipFlow Pro"}
                    </Button>
                  ) : (
                    <Link
                      href="#auth"
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "bg-yellow-400 font-semibold text-black hover:bg-yellow-300",
                      )}
                    >
                      Sign in to upgrade
                    </Link>
                  )}
                  <a
                    href="#features"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "border-white/15 bg-transparent text-white hover:bg-white/10",
                    )}
                  >
                    View features
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border-white/10 bg-white/5">
              <CardContent className="space-y-5 p-8">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                  <span className="font-medium">Why this converts</span>
                </div>
                <div className="space-y-4 text-sm leading-7 text-zinc-300">
                  <p>
                    Barbers can create an account immediately, but they only unlock the real value
                    once their subscription becomes active.
                  </p>
                  <p>That keeps the app self-serve while still making payment the moment that matters.</p>
                  <p>It feels like a real SaaS product, not a manual email flow.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c0f16] p-4">
                  <div className="text-sm text-zinc-400">Unlock rule</div>
                  <div className="mt-2 text-base font-semibold">
                    user exists + subscription_status === &apos;active&apos;
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="auth" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionTitle
            badge="Account flow"
            title="Create account and sign in"
            text="A clean starting point for barbers, with a self-serve create-account flow and a matching sign-in experience."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-[32px] border-white/10 bg-white/5">
              <CardContent className="p-8">
                {(error || message) && (
                  <div className="mb-4 space-y-3">
                    {error ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </div>
                    ) : null}

                    {message ? (
                      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                        {message}
                      </div>
                    ) : null}
                  </div>
                )}
                <Tabs
                  value={authMode}
                  onValueChange={(v) => setAuthMode(v as "signup" | "signin")}
                >
                  <TabsList className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5">
                    <TabsTrigger value="signup" className="rounded-xl">
                      Create account
                    </TabsTrigger>
                    <TabsTrigger value="signin" className="rounded-xl">
                      Sign in
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signup" className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold">Get started</h3>
                      <p className="mt-2 text-zinc-300">
                        Create your ClipFlow account to access bookings and payments.
                      </p>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSignup();
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-sm text-zinc-300">Name</label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoComplete="name"
                          className="mt-2 h-12 rounded-2xl border-white/10 bg-[#0d1017] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-zinc-300">Email</label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          className="mt-2 h-12 rounded-2xl border-white/10 bg-[#0d1017] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-zinc-300">Password</label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          className="mt-2 h-12 rounded-2xl border-white/10 bg-[#0d1017] text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-zinc-300">Confirm password</label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          className="mt-2 h-12 rounded-2xl border-white/10 bg-[#0d1017] text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading === "signup"}
                        className="w-full h-12 rounded-2xl bg-yellow-400 font-bold text-black"
                      >
                        {loading === "signup" ? "Creating account..." : "Create account"}
                      </button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signin" className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold">Welcome back</h3>
                      <p className="mt-2 text-zinc-300">
                        Sign in to your ClipFlow account and continue into the Pro flow.
                      </p>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSignin();
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-sm text-zinc-300">Email</label>
                        <div className="relative mt-2">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className="h-12 rounded-2xl border-white/10 bg-[#0d1017] pl-10 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-zinc-300">Password</label>
                        <div className="relative mt-2">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                          <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="pl-10 h-12 rounded-2xl bg-[#0d1017] border-white/10 text-white"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={loading === "signin"}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 font-bold text-black hover:bg-yellow-300"
                      >
                        <LogIn className="h-4 w-4" />
                        {loading === "signin" ? "Signing in..." : "Sign in"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border-white/10 bg-white/5">
              <CardContent className="space-y-5 p-8">
                <h3 className="text-2xl font-bold">How access works</h3>
                <div className="space-y-4">
                  {[
                    "Anyone can create an account.",
                    "Signed-in barbers without an active subscription see the paywall.",
                    "Stripe payment + webhook sets subscription_status to active.",
                    "Once active, the main dashboard unlocks.",
                  ].map((line) => (
                    <div
                      key={line}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d1017] p-4"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-yellow-300" />
                      <p className="text-sm leading-7 text-zinc-300">{line}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="dashboard" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionTitle
            badge="Dashboard"
            title="A barber dashboard that feels premium"
            text="This gives you a strong direction for the post-login experience: subscription status, appointments, revenue, and simple actions in one place."
          />
          <div className="mt-12 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
            <Card className="overflow-hidden rounded-[32px] border-white/10 bg-white/5">
              <CardContent className="relative space-y-6 p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-zinc-400">Barber account</div>
                    <div className="text-3xl font-black mt-1">
                      {currentUser?.name || "Guest barber"}
                    </div>
                    <div className="text-zinc-300 mt-1">
                      {currentUser?.email || "Sign in to load your account"}
                    </div>
                  </div>
                  <Badge
                    className={
                      subscriptionActive
                        ? "bg-green-500/20 text-green-300 border-green-400/30 px-4 py-1"
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-400/30 px-4 py-1"
                    }
                  >
                    {currentUser
                      ? subscriptionActive
                        ? "ClipFlow Pro Active"
                        : "Needs upgrade"
                      : "Signed out"}
                  </Badge>
                </div>

                {dashboardHint ? (
                  <div className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                    <span>{dashboardHint}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-yellow-300 underline"
                      onClick={() => setDashboardHint(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleRefreshAccount}
                    disabled={!token}
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/10"
                  >
                    Refresh account
                  </Button>

                  <Button
                    onClick={handleLogout}
                    disabled={!token}
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/10"
                  >
                    Logout
                  </Button>
                </div>

                <div
                  className={cn(
                    "space-y-6",
                    (!isLoggedIn || showPaywall) && "pointer-events-none opacity-40",
                  )}
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { label: "This week", value: "18 bookings" },
                      { label: "Collected", value: "$1,280" },
                      { label: "Repeat rate", value: "64%" },
                    ].map((item) => (
                      <Card key={item.label} className="rounded-2xl border-white/10 bg-[#0d1017]">
                        <CardContent className="p-5">
                          <div className="text-sm text-zinc-400">{item.label}</div>
                          <div className="mt-2 text-2xl font-bold">{item.value}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="rounded-2xl border-white/10 bg-[#0d1017]">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold">Today&apos;s appointments</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-transparent text-white hover:bg-white/10"
                          type="button"
                          onClick={() =>
                            setDashboardHint(
                              "Manage appointments — wire this to your booking admin or calendar.",
                            )
                          }
                        >
                          Manage
                        </Button>
                      </div>
                      {appointments.map((item) => (
                        <div
                          key={`dash-${item.time}-${item.client}`}
                          className="flex flex-col gap-2 border-t border-white/10 pt-4 first:border-0 first:pt-0 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <div className="font-medium">{item.client}</div>
                            <div className="text-sm text-zinc-400">{item.service}</div>
                          </div>
                          <div className="text-sm text-zinc-300">{item.time}</div>
                          <Badge variant="outline" className="w-fit border-white/15">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {!isLoggedIn && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[32px] bg-[#05060b]/88 p-6 text-center">
                    <p className="text-lg font-semibold text-white">Sign in to load your dashboard</p>
                    <Link
                      href="/login"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "bg-yellow-400 font-bold text-black hover:bg-yellow-300",
                      )}
                    >
                      Sign in
                    </Link>
                  </div>
                )}
                {isLoggedIn && showPaywall && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[32px] bg-[#05060b]/88 p-6 text-center">
                    <Crown className="h-10 w-10 text-yellow-400" />
                    <p className="text-lg font-semibold text-white">ClipFlow Pro required</p>
                    <p className="max-w-sm text-sm text-zinc-300">
                      Your subscription is not active yet. Pay with Stripe, then return here and click{" "}
                      <strong className="text-white">Refresh account</strong> after the webhook updates
                      your status.
                    </p>
                    <Button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={!token || checkoutLoading}
                      className="bg-yellow-400 font-semibold text-black hover:bg-yellow-300"
                    >
                      {checkoutLoading ? "Opening checkout..." : "Upgrade to ClipFlow Pro"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card
                className={cn(
                  "rounded-[32px] border-white/10 bg-white/5",
                  (!isLoggedIn || showPaywall) && "opacity-45",
                )}
              >
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-300" />
                    <h4 className="text-lg font-bold">Quick actions</h4>
                  </div>
                  <div className="grid gap-3">
                    <Button
                      type="button"
                      disabled={!subscriptionActive}
                      className="h-12 justify-between rounded-2xl bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
                      onClick={() =>
                        setDashboardHint("Open booking page — set your public booking URL in the app.")
                      }
                    >
                      Open booking page <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      disabled={!subscriptionActive}
                      variant="outline"
                      className="h-12 justify-between rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10 disabled:opacity-50"
                      onClick={() =>
                        setDashboardHint("View payouts — connect Stripe payouts or your ledger here.")
                      }
                    >
                      View payouts <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      disabled={!subscriptionActive}
                      variant="outline"
                      className="h-12 justify-between rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/10 disabled:opacity-50"
                      onClick={() =>
                        setDashboardHint("Edit services — link to your services and pricing screen.")
                      }
                    >
                      Edit services <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-white/10 bg-white/5">
                <CardContent className="space-y-4 p-6">
                  <h4 className="text-lg font-bold">Subscription preview</h4>
                  <p className="text-sm leading-7 text-zinc-300">
                    After you sign in, this page reads <code className="text-yellow-200/90">GET /me</code>{" "}
                    and uses <code className="text-yellow-200/90">subscription_status</code>: locked when
                    signed out, paywall when not active, and full dashboard when active.
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-4">
                    <div className="text-sm text-zinc-400">Current state</div>
                    <div className="mt-2 text-2xl font-bold capitalize">{status}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <SectionTitle
            badge="Social proof"
            title="Make ClipFlow feel trusted fast"
            text="A strong first impression matters. These cards give you a place to add real barber wins once users start paying and getting results."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name} className="rounded-3xl border-white/10 bg-white/5">
                <CardContent className="space-y-4 p-6">
                  <div className="flex gap-1 text-yellow-300">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="leading-7 text-zinc-200">&ldquo;{item.quote}&rdquo;</p>
                  <div className="text-sm text-zinc-400">{item.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 md:flex-row md:items-center md:px-8">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-zinc-400">
              A premium booking, payments, and Pro-unlock experience for barbers.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#auth" className="hover:text-white">
              Account
            </a>
            <a href="#dashboard" className="hover:text-white">
              Dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
