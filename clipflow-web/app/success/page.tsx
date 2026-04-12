export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Payment successful
        </h1>
        <p className="text-zinc-300">
          Your one-time ClipFlow Pro payment is processing. Go back to the app or home page and refresh your account.
        </p>
        <a
          href="/"
          className="inline-block rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black"
        >
          Return home
        </a>
      </div>
    </div>
  );
}
