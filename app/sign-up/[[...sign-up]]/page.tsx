import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="text-copy-muted text-sm">Loading sign up...</div>}>
        <SignUp />
      </Suspense>
    </AuthLayout>
  );
}

