"use client";

import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export async function createNote(title: string, content: string = "") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    toast.error("You must be logged in to create notes");
    return null;
  }

  const { data, error } = await supabase
    .from("student_notes")
    .insert([{ 
      user_id: user.id, 
      title, 
      content 
    }])
    .select()
    .single();

  if (error) {
    toast.error(error.message);
    return null;
  }

  toast.success("Note created");
  return data;
}

export async function updateNote(id: string, updates: { title?: string; content?: string }) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("student_notes")
    .update({ 
      ...updates, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    toast.error(error.message);
    return null;
  }

  return data;
}

export async function deleteNote(id: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from("student_notes")
    .delete()
    .eq("id", id);

  if (error) {
    toast.error(error.message);
    return false;
  }

  toast.success("Note deleted");
  return true;
}

export async function getNotes() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("student_notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    toast.error(error.message);
    return [];
  }

  return data;
}
