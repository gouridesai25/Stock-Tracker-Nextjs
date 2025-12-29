import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        {/* <Image
          className="dark:invert"
          src="/next.svg"
          alt="App logo"
          width={100}
          height={20}
          priority
        /> */}

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Trade & Stock Performance Analyzer
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Upload multiple trade or stock files and instantly analyze which set
            performs better. Compare profit, loss, and win rate to make smarter
            trading decisions with clear insights.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <button
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-gray-300 px-5 text-gray-600 md:w-[158px]"
          >
            Upload Files
          </button>

          <button
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border border-gray-300 px-5 text-gray-400 md:w-[158px]"
          >
            View Analysis
          </button>
        </div>
      </main>
    </div>
  );
}
