export type UserRole = "student" | "admin";
export type VerificationStatus = "pending" | "verified" | "rejected";

export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  gender: string | null;
  date_of_birth: string | null;
  college_name: string | null;
  college_roll_no: string | null;
  department: string | null;
  year_of_study: string | null;
  profile_photo_path: string | null;
  id_proof_path: string | null;
  id_verification_status: VerificationStatus;
  id_verification_note: string | null;
  current_trip_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripRow {
  id: string;
  trip_name: string;
  is_active: boolean;
  created_at: string;
}

// Minimal Supabase generic Database shape. Once you run
// `supabase gen types typescript`, replace this file with the
// generated one — this hand-written version is just enough to make
// the client typed for the auth/profile slice built so far.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; full_name: string; phone: string };
        Update: Partial<ProfileRow>;
      };
      trips: {
        Row: TripRow;
        Insert: Partial<TripRow> & { trip_name: string };
        Update: Partial<TripRow>;
      };
    };
  };
}
