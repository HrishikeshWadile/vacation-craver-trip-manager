import { supabase } from "../supabase/client";
import type { RegisterFormValues, LoginFormValues } from "../types/user";

/** Uploads a single file to `bucket` under `${userId}/${fileName}` and
 * returns the storage path (not a public URL — buckets are private). */
async function uploadDoc(bucket: string, userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) throw error;
  return path;
}

export async function registerStudent(values: RegisterFormValues) {
  // 1. Create the auth user. The `handle_new_user` trigger inserts a
  // bare profile row automatically (full_name + phone from metadata).
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        full_name: values.full_name,
        phone: values.phone,
      },
    },
  });

  if (signUpError) throw signUpError;
  const userId = signUpData.user?.id;
  if (!userId) {
    // Email confirmation is likely required before a session/user id
    // is usable for storage uploads. Surface that clearly.
    throw new Error(
      "Check your inbox to confirm your email, then log in to finish your profile."
    );
  }

  // 2. Upload documents (only if the user already has a session —
  // if email confirmation is required, do this step after first login
  // instead, from a "complete your profile" screen).
  let profilePhotoPath: string | null = null;
  let idProofPath: string | null = null;

  if (values.profile_photo?.[0]) {
    profilePhotoPath = await uploadDoc(
      "profile-photos",
      userId,
      values.profile_photo[0]
    );
  }
  if (values.id_proof?.[0]) {
    idProofPath = await uploadDoc("id-proofs", userId, values.id_proof[0]);
  }

  // 3. Fill in the rest of the profile.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      gender: values.gender,
      date_of_birth: values.date_of_birth,
      college_name: values.college_name,
      college_roll_no: values.college_roll_no,
      department: values.department,
      year_of_study: values.year_of_study,
      profile_photo_path: profilePhotoPath ?? undefined,
      id_proof_path: idProofPath ?? undefined,
    })
    .eq("id", userId);

  if (updateError) throw updateError;

  return { userId, needsEmailConfirmation: !signUpData.session };
}

export async function loginStudent({ email, password }: LoginFormValues) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function loginAdmin({ email, password }: LoginFormValues) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  // Confirm the account is actually flagged as admin — otherwise sign
  // back out so a student can't sit "logged in" on the admin screen.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    await supabase.auth.signOut();
    throw new Error("This account doesn't have admin access.");
  }

  return data;
}
