import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SignInPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-copy-muted text-sm">Loading sign in...</div>}>
        <SignIn />
      </Suspense>
    </AuthLayout>
  );
}

