import type { ProfileRow, UserRole, VerificationStatus } from "./database";

export type { UserRole, VerificationStatus };

export type Profile = ProfileRow;

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;

  // personal
  full_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;

  // college
  college_name: string;
  college_roll_no: string;
  department: string;
  year_of_study: string;

  // files (handled outside the zod-validated text fields)
  profile_photo: FileList;
  id_proof: FileList;
}

export interface LoginFormValues {
  email: string;
  password: string;
}
