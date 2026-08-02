import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/ui/AuthCard";
import { FormField, SelectField } from "../../components/ui/FormField";
import { completeProfile } from "../../services/profileService";
import { useAuth } from "../../context/AuthContext";

const ALLOWED_AADHAR_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const aadharPhotoSchema =
  typeof window === "undefined"
    ? z.any()
    : z
      .instanceof(FileList)
      .refine((f) => f.length === 1, "Aadhar card file is required")
      .refine(
        (f) => ALLOWED_AADHAR_TYPES.includes(f[0]?.type),
        "Only PDF, JPG, or PNG files are allowed"
      )
      .refine((f) => f[0]?.size <= 10 * 1024 * 1024, "Max file size is 10MB");

// Plain-JS predicates used for the live "can I continue" check — kept
// separate from the zod schema so button state never depends on RHF's
// async validation cycle.
const isTenDigits = (v: string) => /^\d{10}$/.test(v);
const isTwelveDigits = (v: string) => /^\d{12}$/.test(v);

const schema = z
  .object({
    full_name: z.string().min(2, "Enter your full name"),
    age: z
      .string()
      .min(1, "Required")
      .refine((v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 16 && n <= 100;
      }, "Enter an age between 16 and 100"),
    phone_calling: z.string().refine(isTenDigits, "Enter a 10-digit phone number"),
    phone_whatsapp: z.string().refine(isTenDigits, "Enter a 10-digit phone number"),
    gender: z.enum(["male", "female", "other"], {
      error: "Select an option",
    }),
    gender_other: z.string().optional(),

    guardian_name: z.string().min(2, "Required"),
    guardian_contact: z.string().refine(isTenDigits, "Enter a 10-digit phone number"),
    guardian_relation: z.string().min(2, "e.g. Father, Mother, Sibling"),

    college_name: z.string().min(2, "Required"),
    department: z.string().min(2, "Required"),
    year_of_study: z.string().min(1, "Select an option"),

    aadhar_number: z.string().refine(isTwelveDigits, "Must be exactly 12 digits"),
    aadhar_photo: aadharPhotoSchema,
  })
  .refine(
    (data) => data.gender !== "other" || (data.gender_other?.trim().length ?? 0) > 0,
    { message: "Please specify", path: ["gender_other"] }
  );

type FormValues = z.infer<typeof schema>;

const STEPS = ["Personal & Contact", "Guardian & College", "Identity"] as const;

/** Strips a raw input event's value down to digits only, capped at
 * maxLen, then hands the cleaned value to RHF's own onChange so
 * validation state still updates normally. */
function digitsOnlyHandler(
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  maxLen: number
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    onChange(e);
  };
}

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      full_name: profile?.full_name ?? "",
    },
  });

  const values = watch();
  const gender = values.gender;

  const phoneCallingReg = register("phone_calling");
  const phoneWhatsappReg = register("phone_whatsapp");
  const guardianContactReg = register("guardian_contact");
  const aadharNumberReg = register("aadhar_number");

  const stepFields: (keyof FormValues)[][] = [
    ["full_name", "age", "phone_calling", "phone_whatsapp", "gender", "gender_other"],
    ["guardian_name", "guardian_contact", "guardian_relation", "college_name", "department", "year_of_study"],
    ["aadhar_number", "aadhar_photo"],
  ];

  const stepValid = [
    Boolean(values.full_name?.trim()) &&
    Boolean(values.age) &&
    Number.isInteger(Number(values.age)) &&
    Number(values.age) >= 16 &&
    Number(values.age) <= 100 &&
    isTenDigits(values.phone_calling ?? "") &&
    isTenDigits(values.phone_whatsapp ?? "") &&
    Boolean(values.gender) &&
    (values.gender !== "other" || Boolean(values.gender_other?.trim())),

    Boolean(values.guardian_name?.trim()) &&
    isTenDigits(values.guardian_contact ?? "") &&
    Boolean(values.guardian_relation?.trim()) &&
    Boolean(values.college_name?.trim()) &&
    Boolean(values.department?.trim()) &&
    Boolean(values.year_of_study),

    isTwelveDigits(values.aadhar_number ?? "") &&
    values.aadhar_photo?.length === 1 &&
    ALLOWED_AADHAR_TYPES.includes(values.aadhar_photo?.[0]?.type ?? "") &&
    (values.aadhar_photo?.[0]?.size ?? Infinity) <= 10 * 1024 * 1024,
  ][step];

  async function goNext() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(formValues: FormValues) {
    if (!session?.user.id) return;
    setServerError(null);
    setSubmitting(true);
    try {
      await completeProfile(session.user.id, formValues);
      await refreshProfile();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setSubmitting(false);
    }
  }

  const continueBtnClass = `flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${stepValid
    ? "bg-indigo-600 text-white hover:bg-indigo-700"
    : "bg-slate-200 text-slate-400 cursor-not-allowed"
    }`;

  return (
    <AuthCard
      eyebrow="Trip Pass · Student"
      title="Complete your profile"
      subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
    >
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-indigo-600" : "bg-slate-200"
              }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 0 && (
          <>
            <FormField
              label="Full Name"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <FormField
              label="Age"
              type="number"
              inputMode="numeric"
              error={errors.age?.message}
              {...register("age")}
            />
            <FormField
              label="Contact (calling)"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit number"
              error={errors.phone_calling?.message}
              {...phoneCallingReg}
              onChange={digitsOnlyHandler(phoneCallingReg.onChange, 10)}
            />
            <FormField
              label="Contact (WhatsApp)"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit number"
              error={errors.phone_whatsapp?.message}
              {...phoneWhatsappReg}
              onChange={digitsOnlyHandler(phoneWhatsappReg.onChange, 10)}
            />
            <SelectField label="Gender" error={errors.gender?.message} {...register("gender")}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </SelectField>
            {gender === "other" && (
              <FormField
                label="Please specify"
                error={errors.gender_other?.message}
                {...register("gender_other")}
              />
            )}
          </>
        )}

        {step === 1 && (
          <>
            <FormField
              label="Guardian / Emergency Name"
              error={errors.guardian_name?.message}
              {...register("guardian_name")}
            />
            <FormField
              label="Guardian / Emergency Contact"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit number"
              error={errors.guardian_contact?.message}
              {...guardianContactReg}
              onChange={digitsOnlyHandler(guardianContactReg.onChange, 10)}
            />
            <FormField
              label="Relation to Guardian / Emergency contact"
              placeholder="e.g. Father"
              error={errors.guardian_relation?.message}
              {...register("guardian_relation")}
            />
            <FormField
              label="College Name"
              placeholder="e.g. AISSMS IOIT (or the authority you work under, if not a student)"
              error={errors.college_name?.message}
              {...register("college_name")}
            />
            <FormField
              label="Department"
              placeholder="e.g. Computer Science"
              error={errors.department?.message}
              {...register("department")}
            />
            <SelectField
              label="Year of Study"
              error={errors.year_of_study?.message}
              {...register("year_of_study")}
            >
              <option value="">Select</option>
              <option value="FY">1st year (FY)</option>
              <option value="SY">2nd year (SY)</option>
              <option value="TY">3rd year (TY)</option>
              <option value="B.Tech">Final year (B.Tech)</option>
              <option value="pg">Postgraduate</option>
              <option value="na">Not applicable</option>
            </SelectField>
          </>
        )}

        {step === 2 && (
          <>
            <FormField
              label="Aadhar Card Number"
              placeholder="12-digit number"
              inputMode="numeric"
              error={errors.aadhar_number?.message}
              {...aadharNumberReg}
              onChange={digitsOnlyHandler(aadharNumberReg.onChange, 12)}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Aadhar Card Photo
              </label>
              <p className="text-xs text-slate-500">
                Rename the file with your name before uploading (e.g. "Abhi Desai"). PDF,
                JPG, or PNG only, max 10MB.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="block w-full text-sm text-slate-600
                  file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50
                  file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-indigo-700
                  hover:file:bg-indigo-100"
                {...register("aadhar_photo")}
              />
              {errors.aadhar_photo && (
                <p className="text-xs text-rose-600">
                  {String(errors.aadhar_photo.message)}
                </p>
              )}
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
              disabled={!stepValid}
              className={continueBtnClass}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || !stepValid}
              className={continueBtnClass}
            >
              {submitting ? "Saving…" : "Complete profile"}
            </button>
          )}
        </div>
      </form>
    </AuthCard>
  );
}
