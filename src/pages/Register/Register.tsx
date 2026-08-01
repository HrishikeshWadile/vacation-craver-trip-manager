import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/ui/AuthCard";
import { FormField, SelectField } from "../../components/ui/FormField";
import { registerStudent } from "../../services/authService";

const fileSchema =
  typeof window === "undefined"
    ? z.any()
    : z
        .instanceof(FileList)
        .refine((f) => f.length === 1, "This file is required")
        .refine((f) => f[0]?.size <= 5 * 1024 * 1024, "Max file size is 5MB");

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),

    full_name: z.string().min(2, "Enter your full name"),
    phone: z.string().min(10, "Enter a valid phone number"),
    gender: z.string().min(1, "Select an option"),
    date_of_birth: z.string().min(1, "Required"),

    college_name: z.string().min(2, "Required"),
    college_roll_no: z.string().min(1, "Required"),
    department: z.string().min(1, "Required"),
    year_of_study: z.string().min(1, "Select an option"),

    profile_photo: fileSchema,
    id_proof: fileSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const STEPS = ["Account", "Personal", "College", "Documents"] as const;

export default function Register() {
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ needsEmailConfirmation: boolean } | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  // Fields validated before letting the user move to the next step.
  const stepFields: (keyof FormValues)[][] = [
    ["email", "password", "confirmPassword"],
    ["full_name", "phone", "gender", "date_of_birth"],
    ["college_name", "college_roll_no", "department", "year_of_study"],
    ["profile_photo", "id_proof"],
  ];

  async function goNext() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await registerStudent(values);
      if (result.needsEmailConfirmation) {
        setDone({ needsEmailConfirmation: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard eyebrow="Trip Pass · Student" title="Check your email">
        <p className="text-sm text-slate-600">
          We've sent a confirmation link to your email. Once confirmed, log in to
          finish uploading your documents if they didn't save automatically.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Trip Pass · Student"
      title="Create your profile"
      subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      }
    >
      {/* progress */}
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-indigo-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 0 && (
          <>
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
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <FormField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </>
        )}

        {step === 1 && (
          <>
            <FormField
              label="Full name"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <FormField
              label="Phone number"
              type="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <SelectField label="Gender" error={errors.gender?.message} {...register("gender")}>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </SelectField>
            <FormField
              label="Date of birth"
              type="date"
              error={errors.date_of_birth?.message}
              {...register("date_of_birth")}
            />
          </>
        )}

        {step === 2 && (
          <>
            <FormField
              label="College name"
              error={errors.college_name?.message}
              {...register("college_name")}
            />
            <FormField
              label="Roll number"
              error={errors.college_roll_no?.message}
              {...register("college_roll_no")}
            />
            <FormField
              label="Department"
              placeholder="e.g. Computer Engineering"
              error={errors.department?.message}
              {...register("department")}
            />
            <SelectField
              label="Year of study"
              error={errors.year_of_study?.message}
              {...register("year_of_study")}
            >
              <option value="">Select</option>
              <option value="1">1st year</option>
              <option value="2">2nd year</option>
              <option value="3">3rd year</option>
              <option value="4">4th year</option>
              <option value="pg">Postgraduate</option>
            </SelectField>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Profile photo
              </label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-slate-600
                  file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50
                  file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-indigo-700
                  hover:file:bg-indigo-100"
                {...register("profile_photo")}
              />
              {errors.profile_photo && (
                <p className="text-xs text-rose-600">
                  {String(errors.profile_photo.message)}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                College ID / government ID (photo or scan)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-sm text-slate-600
                  file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50
                  file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-indigo-700
                  hover:file:bg-indigo-100"
                {...register("id_proof")}
              />
              {errors.id_proof && (
                <p className="text-xs text-rose-600">{String(errors.id_proof.message)}</p>
              )}
              <p className="text-xs text-slate-400">
                An admin will verify this before your registration is confirmed.
              </p>
            </div>
          </>
        )}

        {serverError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {serverError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Creating profile…" : "Create profile"}
            </button>
          )}
        </div>
      </form>
    </AuthCard>
  );
}
