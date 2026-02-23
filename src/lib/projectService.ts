import { supabase } from "./supabase";

export type Project = {
    id: string;
    user_id: string;
    project_name: string;
    budget: string;
    duration: string;
    project_type: string;
    objective: string;
    constraints: string;
    charter: string;
    wbs: any[];
    risks: any[];
    kanban: { todo: any[]; inprogress: any[]; done: any[] };
    created_at: string;
    updated_at: string;
};

export type ProjectInput = Partial<Omit<Project, "id" | "user_id" | "created_at" | "updated_at">>;

/** Fetch all projects for the logged-in user */
export async function listProjects(): Promise<Project[]> {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Project[];
}

/** Create a new blank project */
export async function createProject(input: ProjectInput): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from("projects")
        .insert([{ ...input, user_id: user?.id }])
        .select()
        .single();
    if (error) throw error;
    return data as Project;
}

/** Update an existing project by id */
export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
    const { data, error } = await supabase
        .from("projects")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data as Project;
}

/** Delete a project by id */
export async function deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
}

/** Upsert: if id provided update, else create */
export async function saveProject(id: string | null, input: ProjectInput): Promise<Project> {
    if (id) return updateProject(id, input);
    return createProject(input);
}
