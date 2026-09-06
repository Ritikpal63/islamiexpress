import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";
export const metadata = { title: "Create Reader Account" };
export default function Register() {
  return (
    <div className="auth-page">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
