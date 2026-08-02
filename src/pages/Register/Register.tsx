import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/ui/AuthCard";
import { FormField } from "../../components/ui/FormField";
import { registerStudent } from "../../services/authService";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const schema = z
  .object({
    email: z.string().refine(isValidEmail, "Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
    full_name: z.string().min(2, "Enter your full name"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  async function onSubmit(formValues: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await registerStudent(formValues);
      if (result.needsEmailConfirmation) {
        alert(
          "Registration successful. Please check your email to confirm your account, then log in to finish your profile."
        );
        navigate("/login");
      } else {
        navigate("/complete-profile");
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Trip Pass · Student"
      title="Create your account"
      subtitle="Just the basics for now — you'll fill in the rest after logging in."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Full Name"
          error={errors.full_name?.message}
          {...register("full_name")}
        />

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={`w-full rounded-xl border px-3.5 py-2.5 pr-16 text-sm text-slate-900
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.password ? "border-rose-400" : "border-slate-300"}`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-600">{errors.password.message}</p>
          )}
        </div>

        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${submitting
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
