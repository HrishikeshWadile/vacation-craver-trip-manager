import { supabase } from "../supabase/client";

export type Itinerary = {
    id: string;
    trip_id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    uploaded_at: string;
};

export async function uploadItinerary(tripId: string, file: File): Promise<Itinerary> {
    const ext = file.name.split(".").pop();
    const path = `${tripId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from("trip-itineraries")
        .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
        .from("trip_itineraries")
        .insert({
            trip_id: tripId,
            file_name: file.name,
            file_path: path,
            file_type: file.type,
        })
        .select()
        .single();

    if (error) throw error;
    return data as unknown as Itinerary;
}

export async function getItineraries(tripId: string): Promise<Itinerary[]> {
    const { data, error } = await supabase
        .from("trip_itineraries")
        .select("*")
        .eq("trip_id", tripId)
        .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as Itinerary[];
}

export async function deleteItinerary(itinerary: Itinerary) {
    await supabase.storage.from("trip-itineraries").remove([itinerary.file_path]);
    const { error } = await supabase
        .from("trip_itineraries")
        .delete()
        .eq("id", itinerary.id);
    if (error) throw error;
}

export async function getItineraryDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from("trip-itineraries")
        .createSignedUrl(filePath, 60 * 5); // 5 min signed URL
    if (error || !data) throw error ?? new Error("Could not generate download link.");
    return data.signedUrl;
}