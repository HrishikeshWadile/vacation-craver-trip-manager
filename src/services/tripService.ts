import { supabase } from "../supabase/client";
import { cache } from "./cache";

export type Participant = {
    status: string;
    joined_at: string;
    declaration_accepted_at?: string | null;
    profiles: {
        id: string;
        full_name: string;
        age: number | null;
        phone_calling: string | null;
        phone_whatsapp: string | null;
        gender: string | null;
        gender_other: string | null;
        guardian_name: string | null;
        guardian_contact: string | null;
        guardian_relation: string | null;
        college_name: string | null;
        department: string | null;
        year_of_study: string | null;
        aadhar_number: string | null;
        aadhar_photo_path: string | null;
        id_verification_status: string;
    } | null;
};

function generateTripCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createTrip(name: string, description: string, declarationText: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const trip_code = generateTripCode();
        const { data, error } = await supabase
            .from("trips")
            .insert({
                trip_name: name,
                description,
                trip_code,
                declaration_text: declarationText.trim() || null,
            })
            .select()
            .single();

        if (!error) {
            cache.invalidate("admin:trips");
            return data;
        }
        if ((error as { code?: string }).code !== "23505") throw error;
    }
    throw new Error("Failed to generate a unique trip code. Please try again.");
}

export async function joinTrip(tripCode: string) {
    const { data, error } = await supabase.rpc("join_trip_by_code", {
        p_code: tripCode.toUpperCase().trim(),
    });
    if (error) throw new Error(error.message);
    const trip = Array.isArray(data) ? data[0] : data;
    if (!trip) throw new Error("Trip not found. Check the code and try again.");
    cache.invalidate("student:trips");
    return trip as { id: string; trip_name: string };
}

export async function getMyTrips() {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    return cache.get("student:trips", async () => {
        const { data, error } = await supabase
            .from("trip_participants")
            .select(
                `status, joined_at,
         trips (id, trip_code, trip_name, description, is_active, whatsapp_link, created_at)`
            )
            .eq("user_id", user.id)
            .eq("status", "active");

        if (error) throw error;
        return (data ?? []).map((row: any) => ({ ...row.trips, joined_at: row.joined_at }));
    });
}

export async function getAllTrips() {
    return cache.get("admin:trips", async () => {
        const { data, error } = await supabase
            .from("trips")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data ?? [];
    });
}

export async function setTripWhatsappLink(tripId: string, link: string) {
    const { error } = await supabase
        .from("trips")
        .update({ whatsapp_link: link.trim() || null })
        .eq("id", tripId);
    if (error) throw error;
    cache.invalidate("admin:trips", "student:trips");
}

export async function setTripDeclaration(tripId: string, text: string) {
    const { error } = await supabase
        .from("trips")
        .update({ declaration_text: text.trim() || null })
        .eq("id", tripId);
    if (error) throw error;
    cache.invalidate("admin:trips", "student:trips");
}

export async function acceptTripDeclaration(tripId: string) {
    const { error } = await supabase.rpc("accept_trip_declaration", { p_trip_id: tripId });
    if (error) throw error;
}

export async function getActiveParticipantCount(tripId: string) {
    return cache.get(`participant-count:${tripId}`, async () => {
        const { count, error } = await supabase
            .from("trip_participants")
            .select("user_id", { count: "exact", head: true })
            .eq("trip_id", tripId)
            .eq("status", "active");
        if (error) throw error;
        return count ?? 0;
    });
}

/** A single joined trip's details for the student's trip-detail page.
 * Relies on the same RLS as getMyTrips (participant self-read), just
 * scoped to one id instead of the whole list. */
export async function getMyTripById(tripId: string) {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from("trip_participants")
        .select(
            `status, joined_at, declaration_accepted_at,
       trips (id, trip_code, trip_name, description, is_active, whatsapp_link, declaration_text, created_at)`
        )
        .eq("user_id", user.id)
        .eq("trip_id", tripId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
        ...(data as any).trips,
        joined_at: (data as any).joined_at,
        declaration_accepted_at: (data as any).declaration_accepted_at,
    };
}

export async function getTripParticipants(tripId: string) {
    return cache.get(`participants:${tripId}`, async () => {
        const { data, error } = await supabase
            .from("trip_participants")
            .select(
                `status, joined_at, declaration_accepted_at,
         profiles (
           id, full_name, age, phone_calling, phone_whatsapp, gender, gender_other,
           guardian_name, guardian_contact, guardian_relation,
           college_name, department, year_of_study,
           aadhar_number, aadhar_photo_path, id_verification_status
         )`
            )
            .eq("trip_id", tripId)
            .order("joined_at", { ascending: true });

        if (error) throw error;
        return (data ?? []) as unknown as Participant[];
    });
}

export async function getAadharDownloadUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from("aadhar-photos")
        .createSignedUrl(path, 60 * 5);
    if (error || !data) throw error ?? new Error("Could not generate download link.");
    return data.signedUrl;
}

export async function setParticipantStatus(
    tripId: string,
    userId: string,
    status: "active" | "blocked"
) {
    const { error } = await supabase
        .from("trip_participants")
        .update({ status })
        .eq("trip_id", tripId)
        .eq("user_id", userId);

    if (error) throw error;
    cache.invalidate(`participants:${tripId}`);
}

export async function removeParticipant(tripId: string, userId: string) {
    const { error } = await supabase
        .from("trip_participants")
        .delete()
        .eq("trip_id", tripId)
        .eq("user_id", userId);

    if (error) throw error;
    cache.invalidate(`participants:${tripId}`);
}