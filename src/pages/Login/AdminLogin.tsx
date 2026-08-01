import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthCard } from "../../components/ui/AuthCard";
import { FormField } from "../../components/ui/FormField";
import { loginAdmin } from "../../services/authService";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminLogin() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      await loginAdmin(values);
      const redirectTo = (location.state as { from?: string })?.from ?? "/admin/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Couldn't sign you in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Trip Pass · Organizer"
      title="Admin sign in"
      subtitle="Verify payments, manage rooms, and run the trip."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white
            hover:bg-slate-800 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Signing in…" : "Sign in as admin"}
        </button>
      </form>
    </AuthCard>
  );
}
