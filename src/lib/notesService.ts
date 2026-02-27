import { supabase } from "./supabase";

export async function fetchNote(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";

    const { data, error } = await supabase
        .from("notes")
        .select("content")
        .eq("user_id", user.id)
        .single();

    // PGRST116 is "No rows found"
    if (error && error.code !== "PGRST116") {
        console.error("Error fetching note:", error);
    }

    return data?.content || "";
}

export async function saveNote(content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from("notes")
        .upsert({
            user_id: user.id,
            content,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "user_id"
        });

    if (error) {
        console.error("Error saving note:", error);
        throw error;
    }
}
