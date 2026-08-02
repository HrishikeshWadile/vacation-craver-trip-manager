import type { Tables, Enums } from "./database";

export type UserRole = Enums<"user_role">;
export type VerificationStatus = Enums<"verification_status">;

export type Profile = Tables<"profiles">;

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
}

export interface ProfileFormValues {
  full_name: string;
  age: string;
  phone_calling: string;
  phone_whatsapp: string;
  gender: string;
  gender_other?: string;

  guardian_name: string;
  guardian_contact: string;
  guardian_relation: string;

  college_name: string;
  department: string;
  year_of_study: string;

  aadhar_number: string;
  aadhar_photo: FileList;
}

export interface LoginFormValues {
  email: string;
  password: string;
}