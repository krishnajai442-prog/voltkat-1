import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="container-x py-20">
          <div className="mx-auto h-80 max-w-md animate-pulse rounded-2xl bg-ink-900/5" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}