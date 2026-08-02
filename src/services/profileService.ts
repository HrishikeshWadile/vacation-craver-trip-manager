import { supabase } from "../supabase/client";
import type { Tables } from "../types/database";
import type { ProfileFormValues } from "../types/user";

type ProfileRow = Tables<"profiles">;

/** Uploads a single file to `bucket` under `${userId}/${fileName}` and
 * returns the storage path (not a public URL — buckets are private).
 * Safe to call post-login only: relies on auth.uid() for the storage
 * RLS policy, so the user must already have a session. */
export async function uploadAadhar(userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("aadhar-photos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) throw error;
  return path;
}

/** Lets a signed-in student edit their own info later from a Settings
 * screen. Deliberately narrower than ProfileFormValues — role and
 * id_verification_status aren't included here (and the DB's "self
 * update" RLS policy would reject any attempt to change them anyway). */
export async function updateOwnProfile(
  userId: string,
  values: Partial<
    Pick<
      ProfileFormValues,
      | "full_name"
      | "age"
      | "phone_calling"
      | "phone_whatsapp"
      | "gender"
      | "gender_other"
      | "guardian_name"
      | "guardian_contact"
      | "guardian_relation"
      | "college_name"
      | "department"
      | "year_of_study"
      | "aadhar_number"
    >
  > & { aadhar_photo?: FileList }
) {
  let aadharPhotoPath: string | undefined;
  if (values.aadhar_photo?.[0]) {
    aadharPhotoPath = await uploadAadhar(userId, values.aadhar_photo[0]);
  }

  const { aadhar_photo: _ignored, ...rest } = values;

  const { error } = await supabase
    .from("profiles")
    .update({
      ...rest,
      age: rest.age !== undefined ? Number(rest.age) : undefined,
      gender: rest.gender as ProfileRow["gender"] | undefined,
      ...(aadharPhotoPath ? { aadhar_photo_path: aadharPhotoPath } : {}),
    })
    .eq("id", userId);

  if (error) throw error;
}

/** Fills in the rest of a student's profile after account creation
 * and login, uploading the Aadhar photo first (if provided) and then
 * marking registration_complete. */
export async function completeProfile(userId: string, values: ProfileFormValues) {
  let aadharPhotoPath: string | null = null;
  if (values.aadhar_photo?.[0]) {
    aadharPhotoPath = await uploadAadhar(userId, values.aadhar_photo[0]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: values.full_name,
      age: Number(values.age),
      phone_calling: values.phone_calling,
      phone_whatsapp: values.phone_whatsapp,
      gender: values.gender as ProfileRow["gender"],
      gender_other: values.gender_other ?? null,
      guardian_name: values.guardian_name,
      guardian_contact: values.guardian_contact,
      guardian_relation: values.guardian_relation,
      college_name: values.college_name,
      department: values.department,
      year_of_study: values.year_of_study,
      aadhar_number: values.aadhar_number,
      aadhar_photo_path: aadharPhotoPath ?? undefined,
      registration_complete: true,
    })
    .eq("id", userId);

  if (error) throw error;
}