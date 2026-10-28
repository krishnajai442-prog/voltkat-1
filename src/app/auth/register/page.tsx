import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="container-x py-20">
          <div className="mx-auto h-96 max-w-md animate-pulse rounded-2xl bg-ink-900/5" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}