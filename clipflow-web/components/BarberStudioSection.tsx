"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/config";
import {
  getStudio,
  getStudioCalendarPreview,
  patchStudio,
  postStudioSmsTest,
  publishStudioAi,
  type StudioAiSettings,
  type StudioIntegrations,
  type StudioPricingRow,
} from "@/lib/api";
import { Bot, Building2, CalendarDays, Loader2, Phone, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

type Props = {
  token: string | null;
  subscriptionActive: boolean;
  barberName: string;
  onUpgrade: () => void;
  checkoutLoading: boolean;
  /** Fires when published blurb loads or after AI publish so the hero can stay in sync. */
  onPublishedBlurbChange?: (blurb: string) => void;
};

const defaultIntegrations = (): StudioIntegrations => ({
  barbershopName: "",
  shopPhones: [],
  twilioVoiceNumberE164: "",
  calendarIcsUrl: "",
});

const defaultRow = (): StudioPricingRow => ({
  id: `row_${Date.now()}`,
  name: "Premium cut",
  price: 45,
  durationMins: 45,
});

export default function BarberStudioSection({
  token,
  subscriptionActive,
  barberName,
  onUpgrade,
  checkoutLoading,
  onPublishedBlurbChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pricing, setPricing] = useState<StudioPricingRow[]>([defaultRow()]);
  const [ai, setAi] = useState<StudioAiSettings>({
    answerClientCalls: true,
    manageBookings: true,
    clientCallHours: "Mon–Sat 9a–7p",
    smsReminder: true,
  });
  const [publishedBlurb, setPublishedBlurb] = useState("");
  const [integrations, setIntegrations] = useState<StudioIntegrations>(defaultIntegrations);
  const [calendarProbing, setCalendarProbing] = useState(false);
  const [calendarPreview, setCalendarPreview] = useState<{ summary: string; rawStart: string }[] | null>(null);
  const [smsTo, setSmsTo] = useState("");
  const [smsSending, setSmsSending] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const s = await getStudio(token);
      if (s.pricing?.length) setPricing(s.pricing);
      if (s.ai) setAi(s.ai);
      const blurb = s.publishedBlurb || "";
      setPublishedBlurb(blurb);
      onPublishedBlurbChange?.(blurb);
      setIntegrations(s.integrations ?? defaultIntegrations());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load studio.");
    } finally {
      setLoading(false);
    }
  }, [token, onPublishedBlurbChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!token || !subscriptionActive) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const shopPhones = integrations.shopPhones.map((p) => p.trim()).filter(Boolean);
      await patchStudio(token, {
        pricing,
        ai,
        integrations: { ...integrations, shopPhones },
      });
      setMessage("Saved your menu, AI settings, and integrations.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const publishAi = async () => {
    if (!token || !subscriptionActive) return;
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const r = await publishStudioAi(token);
      setPublishedBlurb(r.publishedBlurb);
      onPublishedBlurbChange?.(r.publishedBlurb);
      setMessage(
        r.usedOpenAI
          ? "AI refreshed your public copy (OpenAI)."
          : "Updated your public copy (built-in template — add OPENAI_API_KEY on the server for richer AI text)."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const updateRow = (i: number, patch: Partial<StudioPricingRow>) => {
    setPricing((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => {
    setPricing((rows) => (rows.length <= 1 ? rows : rows.filter((_, j) => j !== i)));
  };

  const addRow = () => setPricing((rows) => [...rows, defaultRow()]);

  const probeCalendar = async () => {
    if (!token || !subscriptionActive) return;
    setCalendarProbing(true);
    setError(null);
    try {
      const r = await getStudioCalendarPreview(token);
      setCalendarPreview(r.events);
      if (!r.ok && r.detail) {
        setMessage(null);
        setError(r.detail);
      } else {
        setMessage(
          r.events.length
            ? `Loaded ${r.events.length} event snippet(s) from your iCal feed.`
            : "Feed responded — no events parsed (check the URL or share settings).",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calendar preview failed.");
    } finally {
      setCalendarProbing(false);
    }
  };

  const sendSmsTest = async () => {
    if (!token || !subscriptionActive || !smsTo.trim()) return;
    setSmsSending(true);
    setError(null);
    try {
      await postStudioSmsTest(token, { toE164: smsTo.trim() });
      setMessage("Test SMS sent via Twilio.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SMS failed.");
    } finally {
      setSmsSending(false);
    }
  };

  if (!token) {
    return (
      <section id="studio" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <Card className="rounded-[32px] border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Bot className="h-7 w-7 text-yellow-300" />
              AI + your prices
            </CardTitle>
            <CardDescription className="text-zinc-300">
              Sign in to set your own service menu and let ClipFlow&apos;s AI assistant handle client calls and
              bookings using your numbers.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section id="studio" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-1 text-sm text-yellow-200">
          <Sparkles className="h-4 w-4" />
          Barber-owned pricing · AI-run client experience
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Your menu & AI control center</h2>
        <p className="text-base text-zinc-300 md:text-lg">
          Set each service and price yourself. Turn on AI to answer client calls, qualify leads, and book appointments
          against your calendar — then sync updated copy to your ClipFlow page.
        </p>
      </div>

      <div className="relative mt-12">
        {!subscriptionActive && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[32px] bg-[#05060b]/90 p-8 text-center backdrop-blur-sm">
            <p className="max-w-md text-zinc-200">
              Unlock <strong className="text-white">ClipFlow Pro</strong> to save your menu, enable AI client handling,
              and publish updates to your site.
            </p>
            <Button
              type="button"
              onClick={onUpgrade}
              disabled={checkoutLoading}
              className="bg-yellow-400 font-semibold text-black hover:bg-yellow-300"
            >
              {checkoutLoading ? "Opening checkout…" : "Unlock ClipFlow Pro"}
            </Button>
          </div>
        )}

        <div className={cn("grid gap-8 lg:grid-cols-2", !subscriptionActive && "pointer-events-none opacity-40")}>
          <Card className="rounded-[32px] border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Service menu</CardTitle>
              <CardDescription className="text-zinc-400">
                Your prices — clients and AI always reference this list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  {pricing.map((row, i) => (
                    <div
                      key={row.id}
                      className="grid gap-3 rounded-2xl border border-white/10 bg-[#0d1017] p-4 sm:grid-cols-12"
                    >
                      <div className="sm:col-span-5">
                        <label className="text-xs text-zinc-500">Service</label>
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(i, { name: e.target.value })}
                          className="mt-1 border-white/10 bg-black/40 text-white"
                          disabled={!subscriptionActive}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-xs text-zinc-500">Price (USD)</label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={row.price}
                          onChange={(e) => updateRow(i, { price: Number(e.target.value) })}
                          className="mt-1 border-white/10 bg-black/40 text-white"
                          disabled={!subscriptionActive}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-xs text-zinc-500">Mins</label>
                        <Input
                          type="number"
                          min={5}
                          value={row.durationMins ?? 30}
                          onChange={(e) => updateRow(i, { durationMins: Number(e.target.value) })}
                          className="mt-1 border-white/10 bg-black/40 text-white"
                          disabled={!subscriptionActive}
                        />
                      </div>
                      <div className="flex items-end justify-end sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-zinc-500 hover:text-red-300"
                          onClick={() => removeRow(i)}
                          disabled={!subscriptionActive || pricing.length <= 1}
                          aria-label="Remove service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/15 text-white hover:bg-white/10"
                    onClick={addRow}
                    disabled={!subscriptionActive}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add service
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[32px] border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-yellow-300" />
                  AI for clients
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Control how automation represents you — AI uses your menu and these toggles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: "answerClientCalls" as const,
                    label: "AI answers client calls & texts",
                    sub: "Routes FAQs, availability, and pricing from your menu.",
                  },
                  {
                    key: "manageBookings" as const,
                    label: "AI books appointments",
                    sub: "Schedules against your rules; you get confirmations.",
                  },
                  {
                    key: "smsReminder" as const,
                    label: "SMS reminders",
                    sub: "Optional reminders powered by your hours.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-[#0d1017] p-4"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-black"
                      checked={ai[item.key]}
                      onChange={(e) => setAi((a) => ({ ...a, [item.key]: e.target.checked }))}
                      disabled={!subscriptionActive}
                    />
                    <span>
                      <span className="font-medium text-white">{item.label}</span>
                      <span className="mt-1 block text-sm text-zinc-500">{item.sub}</span>
                    </span>
                  </label>
                ))}
                <div>
                  <label className="text-xs text-zinc-500">Hours for AI / calls</label>
                  <Input
                    value={ai.clientCallHours}
                    onChange={(e) => setAi((a) => ({ ...a, clientCallHours: e.target.value }))}
                    className="mt-1 border-white/10 bg-black/40 text-white"
                    disabled={!subscriptionActive}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[32px] border-green-400/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-lg">Published on your site</CardTitle>
                <CardDescription>
                  After you save prices, generate copy so your public page reflects your menu.{" "}
                  <span className="text-zinc-500">
                    (Set <code className="text-yellow-200/90">OPENAI_API_KEY</code> on the API for richer AI
                    wording.)
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {publishedBlurb ? (
                  <blockquote className="rounded-2xl border border-white/10 bg-[#0d1017] p-4 text-left text-sm leading-relaxed text-zinc-200">
                    {publishedBlurb}
                  </blockquote>
                ) : (
                  <p className="text-sm text-zinc-500">No published blurb yet — save your menu, then sync with AI.</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="bg-yellow-400 font-semibold text-black hover:bg-yellow-300"
                    onClick={() => void save()}
                    disabled={!subscriptionActive || saving || loading}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save menu & AI settings"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => void publishAi()}
                    disabled={!subscriptionActive || publishing || loading}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing…
                      </>
                    ) : (
                      <>
                        <Bot className="mr-2 h-4 w-4" />
                        AI update site copy
                      </>
                    )}
                  </Button>
                </div>
                {barberName ? (
                  <p className="text-xs text-zinc-500">Signed in as {barberName}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className={cn("space-y-0", !subscriptionActive && "pointer-events-none opacity-40")}>
        <Card className="mt-8 rounded-[32px] border-amber-400/25 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-amber-300" />
              Barbershop name &amp; phones
            </CardTitle>
            <CardDescription className="text-zinc-400">
              This is what ClipFlow AI and Twilio use when they speak for your shop — set your public name and the
              numbers clients should call or save. Save below; incoming Twilio calls can also match these numbers for
              routing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500">Barbershop / brand name</label>
              <Input
                value={integrations.barbershopName}
                onChange={(e) =>
                  setIntegrations((i) => ({ ...i, barbershopName: e.target.value }))
                }
                placeholder="e.g. Northside Fade Lab"
                className="mt-1 border-white/10 bg-black/40 text-white"
                disabled={!subscriptionActive}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">Shop phone numbers (up to 4)</div>
              {(integrations.shopPhones.length > 0 ? integrations.shopPhones : [""]).map((phone, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={phone}
                    onChange={(e) => {
                      const base =
                        integrations.shopPhones.length > 0 ? [...integrations.shopPhones] : [""];
                      base[idx] = e.target.value;
                      setIntegrations((i) => ({ ...i, shopPhones: base }));
                    }}
                    placeholder="+1 (555) 123-4567"
                    className="border-white/10 bg-black/40 text-white"
                    disabled={!subscriptionActive}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-zinc-500 hover:text-red-300"
                    disabled={!subscriptionActive}
                    aria-label="Remove phone"
                    onClick={() => {
                      const base =
                        integrations.shopPhones.length > 0 ? [...integrations.shopPhones] : [""];
                      const next = base.filter((_, j) => j !== idx);
                      setIntegrations((i) => ({ ...i, shopPhones: next }));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/15 text-white hover:bg-white/10"
                disabled={
                  !subscriptionActive ||
                  (integrations.shopPhones.length > 0 ? integrations.shopPhones.length : 1) >= 4
                }
                onClick={() =>
                  setIntegrations((i) => {
                    const cur = i.shopPhones.length > 0 ? i.shopPhones : [""];
                    return { ...i, shopPhones: [...cur, ""] };
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add number
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-[32px] border-sky-400/20 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Phone className="h-5 w-5 text-sky-300" />
              Twilio voice &amp; SMS
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Buy a Twilio number, paste it here (E.164), then set Voice and Messaging webhooks on that number to the
              URLs below. Set <code className="text-yellow-200/90">PUBLIC_API_URL</code>,{" "}
              <code className="text-yellow-200/90">TWILIO_AUTH_TOKEN</code>, and{" "}
              <code className="text-yellow-200/90">TWILIO_ACCOUNT_SID</code> on your API host.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500">Twilio number (incoming)</label>
              <Input
                value={integrations.twilioVoiceNumberE164}
                onChange={(e) =>
                  setIntegrations((i) => ({ ...i, twilioVoiceNumberE164: e.target.value }))
                }
                placeholder="+15551234567"
                className="mt-1 border-white/10 bg-black/40 text-white"
                disabled={!subscriptionActive}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1017] p-4 font-mono text-xs leading-relaxed text-zinc-400">
              <div className="text-zinc-500">Voice webhook POST</div>
              <div className="break-all text-sky-200/90">{API_BASE}/webhooks/twilio/voice</div>
              <div className="mt-3 text-zinc-500">SMS webhook POST</div>
              <div className="break-all text-sky-200/90">{API_BASE}/webhooks/twilio/sms</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Input
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                placeholder="Test SMS to (E.164)"
                className="max-w-xs border-white/10 bg-black/40 text-white"
                disabled={!subscriptionActive}
              />
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => void sendSmsTest()}
                disabled={!subscriptionActive || smsSending || !smsTo.trim()}
              >
                {smsSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send test SMS"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-[32px] border-emerald-400/20 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="h-5 w-5 text-emerald-300" />
              Calendar (iCal)
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Paste a public <strong className="text-zinc-300">https</strong> iCal or Google Calendar secret address.
              Save, then preview — ClipFlow reads a few upcoming events for AI context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500">Calendar feed URL</label>
              <Input
                value={integrations.calendarIcsUrl}
                onChange={(e) => setIntegrations((i) => ({ ...i, calendarIcsUrl: e.target.value }))}
                placeholder="https://calendar.google.com/calendar/ical/..."
                className="mt-1 border-white/10 bg-black/40 text-white"
                disabled={!subscriptionActive}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => void probeCalendar()}
              disabled={!subscriptionActive || calendarProbing || loading}
            >
              {calendarProbing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading feed…
                </>
              ) : (
                "Preview calendar feed"
              )}
            </Button>
            {calendarPreview && calendarPreview.length > 0 ? (
              <ul className="space-y-2 rounded-2xl border border-white/10 bg-[#0d1017] p-4 text-sm text-zinc-300">
                {calendarPreview.map((ev, idx) => (
                  <li key={`${ev.rawStart}-${idx}`}>
                    <span className="font-medium text-white">{ev.summary}</span>
                    <span className="ml-2 text-zinc-500">{ev.rawStart}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
        </div>

        {(error || message) && (
          <div className="mt-6 text-center text-sm">
            {error ? <p className="text-red-300">{error}</p> : null}
            {message ? <p className="text-green-300">{message}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
}
