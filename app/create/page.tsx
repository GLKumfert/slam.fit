"use client";

import { useRouter } from "next/navigation";
import SessionForm from "@/components/SessionForm";

export default function CreatePage() {
  const router = useRouter();

  function handleSuccess(slug: string, _hostToken: string) {
    router.push(`/s/${slug}/host`);
  }

  return (
    <div className="min-h-screen bg-[#dadada]/30">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <a
            href="/"
            className="text-lg font-bold text-[#034377] hover:text-[#3ba2bc] transition-colors"
          >
            SLAM.FIT
          </a>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Create session</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1d1d1e]">Create a session</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define the dates, times, and roles — then share the link.
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6 sm:p-8">
          <SessionForm onSuccess={handleSuccess} />
        </div>
      </main>
    </div>
  );
}
