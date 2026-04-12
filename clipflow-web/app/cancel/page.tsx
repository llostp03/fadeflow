export default function CancelPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Checkout canceled
        </h1>
        <p className="text-zinc-300">
          No worries. Your account is still there, and you can unlock ClipFlow Pro anytime.
        </p>
        <a
          href="/"
          className="inline-block rounded-2xl border border-white/15 px-6 py-3 font-bold text-white"
        >
          Back to ClipFlow
        </a>
      </div>
    </div>
  );
}
