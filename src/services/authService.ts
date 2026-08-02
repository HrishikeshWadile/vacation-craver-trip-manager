import { supabase } from "../supabase/client";
import type { RegisterFormValues, LoginFormValues } from "../types/user";

export async function registerStudent(values: RegisterFormValues) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        full_name: values.full_name,
      },
    },
  });

  if (signUpError) throw signUpError;
  const userId = signUpData.user?.id;
  if (!userId) {
    throw new Error(
      "Check your inbox to confirm your email, then log in to finish your profile."
    );
  }

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
