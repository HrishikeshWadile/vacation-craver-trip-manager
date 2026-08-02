import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateOwnProfile } from "../../services/profileService";

const ALLOWED_AADHAR_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const isTenDigits = (v: string) => /^\d{10}$/.test(v);
const isTwelveDigits = (v: string) => /^\d{12}$/.test(v);

// aadhar_photo is optional here — unlike registration, editing your
// profile shouldn't force a fresh upload every time.
const optionalAadharPhotoSchema =
    typeof window === "undefined"
        ? z.any()
        : z
            .instanceof(FileList)
            .optional()
            .refine((f) => !f || f.length === 0 || ALLOWED_AADHAR_TYPES.includes(f[0]?.type), {
                message: "Only PDF, JPG, or PNG files are allowed",
            })
            .refine((f) => !f || f.length === 0 || f[0]?.size <= 10 * 1024 * 1024, {
                message: "Max file size is 10MB",
            });

const schema = z
    .object({
        full_name: z.string().min(2, "Enter your full name"),
        age: z.string().refine((v) => {
            const n = Number(v);
            return Number.isInteger(n) && n >= 16 && n <= 100;
        }, "Enter an age between 16 and 100"),
        phone_calling: z.string().refine(isTenDigits, "Enter a 10-digit phone number"),
        phone_whatsapp: z.string().refine(isTenDigits, "Enter a 10-digit phone number"),
        gender: z.enum(["male", "female", "other"], { error: "Select an option" }),
        gender_other: z.string().optional(),
        guardian_name: z.string().min(2, "Required"),
        guardian_contact: z.string().refine(isTenDigits, "Enter a 10-digit phone number"),
        guardian_relation: z.string().min(2, "Required"),
        college_name: z.string().min(2, "Required"),
        department: z.string().min(2, "Required"),
        year_of_study: z.string().min(1, "Select an option"),
        aadhar_number: z.string().refine(isTwelveDigits, "Must be exactly 12 digits"),
        aadhar_photo: optionalAadharPhotoSchema,
    })
    .refine((data) => data.gender !== "other" || (data.gender_other?.trim().length ?? 0) > 0, {
        message: "Please specify",
        path: ["gender_other"],
    });

type FormValues = z.infer<typeof schema>;

function digitsOnlyHandler(
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    maxLen: number
) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, maxLen);
        onChange(e);
    };
}

function Field({
    label,
    error,
    ...rest
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs text-slate-400 uppercase tracking-wider">{label}</label>
            <input
                className={`w-full rounded-xl bg-slate-800 border px-4 py-2.5 text-sm text-white
          placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${error ? "border-rose-600" : "border-slate-700"}`}
                {...rest}
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
    );
}

function Select({
    label,
    error,
    children,
    ...rest
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs text-slate-400 uppercase tracking-wider">{label}</label>
            <select
                className={`w-full rounded-xl bg-slate-800 border px-4 py-2.5 text-sm text-white
          focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? "border-rose-600" : "border-slate-700"}`}
                {...rest}
            >
                {children}
            </select>
            {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
    );
}

export default function Settings() {
    const { profile, session, refreshProfile } = useAuth();
    const [saved, setSaved] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: {
            full_name: profile?.full_name ?? "",
            age: profile?.age?.toString() ?? "",
            phone_calling: profile?.phone_calling ?? "",
            phone_whatsapp: profile?.phone_whatsapp ?? "",
            gender: (profile?.gender as "male" | "female" | "other") ?? undefined,
            gender_other: profile?.gender_other ?? "",
            guardian_name: profile?.guardian_name ?? "",
            guardian_contact: profile?.guardian_contact ?? "",
            guardian_relation: profile?.guardian_relation ?? "",
            college_name: profile?.college_name ?? "",
            department: profile?.department ?? "",
            year_of_study: profile?.year_of_study ?? "",
            aadhar_number: profile?.aadhar_number ?? "",
        },
    });

    const gender = watch("gender");
    const phoneCallingReg = register("phone_calling");
    const phoneWhatsappReg = register("phone_whatsapp");
    const guardianContactReg = register("guardian_contact");
    const aadharNumberReg = register("aadhar_number");

    async function onSubmit(values: FormValues) {
        if (!session?.user.id) return;
        setServerError(null);
        setSaved(false);
        setSubmitting(true);
        try {
            await updateOwnProfile(session.user.id, values);
            await refreshProfile();
            setSaved(true);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "Couldn't save changes.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold tracking-widest uppercase text-indigo-400">
                        Trip Pass
                    </p>
                    <h1 className="text-lg font-bold">Your Details</h1>
                </div>
                <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                    ← Back to dashboard
                </Link>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8">
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4 rounded-2xl bg-slate-900 border border-slate-800 p-6"
                >
                    <Field label="Full Name" error={errors.full_name?.message} {...register("full_name")} />
                    <Field
                        label="Age"
                        type="number"
                        inputMode="numeric"
                        error={errors.age?.message}
                        {...register("age")}
                    />
                    <Field
                        label="Contact (calling)"
                        type="tel"
                        inputMode="numeric"
                        error={errors.phone_calling?.message}
                        {...phoneCallingReg}
                        onChange={digitsOnlyHandler(phoneCallingReg.onChange, 10)}
                    />
                    <Field
                        label="Contact (WhatsApp)"
                        type="tel"
                        inputMode="numeric"
                        error={errors.phone_whatsapp?.message}
                        {...phoneWhatsappReg}
                        onChange={digitsOnlyHandler(phoneWhatsappReg.onChange, 10)}
                    />
                    <Select label="Gender" error={errors.gender?.message} {...register("gender")}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </Select>
                    {gender === "other" && (
                        <Field
                            label="Please specify"
                            error={errors.gender_other?.message}
                            {...register("gender_other")}
                        />
                    )}

                    <div className="border-t border-slate-800 pt-4" />

                    <Field
                        label="Guardian / Emergency Name"
                        error={errors.guardian_name?.message}
                        {...register("guardian_name")}
                    />
                    <Field
                        label="Guardian / Emergency Contact"
                        type="tel"
                        inputMode="numeric"
                        error={errors.guardian_contact?.message}
                        {...guardianContactReg}
                        onChange={digitsOnlyHandler(guardianContactReg.onChange, 10)}
                    />
                    <Field
                        label="Relation to Guardian"
                        error={errors.guardian_relation?.message}
                        {...register("guardian_relation")}
                    />

                    <div className="border-t border-slate-800 pt-4" />

                    <Field
                        label="College Name"
                        error={errors.college_name?.message}
                        {...register("college_name")}
                    />
                    <Field label="Department" error={errors.department?.message} {...register("department")} />
                    <Select
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
                    </Select>

                    <div className="border-t border-slate-800 pt-4" />

                    <Field
                        label="Aadhar Card Number"
                        inputMode="numeric"
                        error={errors.aadhar_number?.message}
                        {...aadharNumberReg}
                        onChange={digitsOnlyHandler(aadharNumberReg.onChange, 12)}
                    />
                    <div className="space-y-1.5">
                        <label className="block text-xs text-slate-400 uppercase tracking-wider">
                            Replace Aadhar Photo (optional)
                        </label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="block w-full text-sm text-slate-400
                file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-950
                file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-indigo-300
                hover:file:bg-indigo-900"
                            {...register("aadhar_photo")}
                        />
                        {errors.aadhar_photo && (
                            <p className="text-xs text-rose-400">{String(errors.aadhar_photo.message)}</p>
                        )}
                    </div>

                    {serverError && (
                        <p className="rounded-lg bg-rose-950/40 border border-rose-900 px-3 py-2 text-sm text-rose-300">
                            {serverError}
                        </p>
                    )}
                    {saved && (
                        <p className="rounded-lg bg-emerald-950/40 border border-emerald-900 px-3 py-2 text-sm text-emerald-300">
                            Saved.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
              py-2.5 text-sm font-semibold text-white transition-colors"
                    >
                        {submitting ? "Saving…" : "Save changes"}
                    </button>
                </form>
            </main>
        </div>
    );
}