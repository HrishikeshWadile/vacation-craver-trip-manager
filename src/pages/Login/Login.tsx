import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthCard } from "../../components/ui/AuthCard";
import { FormField } from "../../components/ui/FormField";
import { loginStudent } from "../../services/authService";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
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
      await loginStudent(values);
      const redirectTo = (location.state as { from?: string })?.from ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Couldn't sign you in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Trip Pass · Student"
      title="Welcome back"
      subtitle="Sign in to manage your trip, room, and payments."
      footer={
        <p>
          New here?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
            Create your student profile
          </Link>
        </p>
      }
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
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white
            hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-slate-400">
          Are you an organizer?{" "}
          <Link to="/admin/login" className="text-slate-500 underline hover:text-slate-700">
            Go to admin login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
