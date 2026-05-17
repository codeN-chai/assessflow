"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  FileText, 
  Clock, 
  Loader2, 
  Save 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getNotes, createNote, updateNote, deleteNote } from "./actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Update editor content when selected note changes
  useEffect(() => {
    if (editorRef.current && selectedNote) {
      if (editorRef.current.getAttribute('data-note-id') !== selectedNote.id) {
        editorRef.current.innerHTML = selectedNote.content || "";
        editorRef.current.setAttribute('data-note-id', selectedNote.id);
        lastSavedContentRef.current = selectedNote.content || "";
      }
    }
  }, [selectedNote]);

  async function fetchNotes() {
    setLoading(true);
    const data = await getNotes();
    setNotes(data || []);
    if (data && data.length > 0 && !selectedNote) {
      setSelectedNote(data[0]);
    }
    setLoading(false);
  }

  const handleCreateNote = async () => {
    const newNote = await createNote("Untitled Note", "");
    if (newNote) {
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
    }
  };

  const handleInput = () => {
    if (!selectedNote || !editorRef.current) return;
    
    const newContent = editorRef.current.innerHTML;
    if (newContent === lastSavedContentRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      lastSavedContentRef.current = newContent;
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content: newContent, updated_at: new Date().toISOString() } : n));
      setIsSaving(true);
      await updateNote(selectedNote.id, { content: newContent });
      setIsSaving(false);
    }, 800);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;

        setIsSaving(true);
        toast.info("Uploading image...");

        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const { uploadToCloudinary } = await import("../../teacher/tests/[id]/upload-action");
          const res = await uploadToCloudinary(base64);

          if (res.success && res.url) {
            // Create a non-editable container to prevent cursor stretching
            const imgContainer = document.createElement('div');
            imgContainer.contentEditable = "false";
            imgContainer.className = "my-6 rounded-2xl overflow-hidden border border-white/5 shadow-2xl block select-none max-w-full mx-auto";
            
            const img = document.createElement('img');
            img.src = res.url;
            img.className = "w-full h-auto block";
            imgContainer.appendChild(img);
            
            // Create a fresh line after the image for the cursor
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(imgContainer);
              imgContainer.after(p);
              
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              editorRef.current?.appendChild(imgContainer);
              editorRef.current?.appendChild(p);
            }
            
            handleInput();
            toast.success("Image added");
          } else {
            toast.error("Upload failed");
          }
          setIsSaving(false);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    const id = noteToDelete;
    const success = await deleteNote(id);
    if (success) {
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      if (selectedNote?.id === id) {
        setSelectedNote(updatedNotes[0] || null);
      }
    }
    setNoteToDelete(null);
  };

  const handleUpdateNote = (updates: Partial<Note>) => {
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, ...updates };
    setSelectedNote(updatedNote);
    setNotes(notes.map(n => n.id === selectedNote.id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await updateNote(selectedNote.id, updates);
      setIsSaving(false);
    }, 1000);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n.content || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden -m-4 md:-m-6 lg:-m-8">
      {/* Sidebar: Notes List */}
      <aside className="w-80 border-r bg-muted/30 flex flex-col hidden md:flex">
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <BookOpen className="size-5 text-primary" />
              <span>Study Vault</span>
            </div>
            <Button size="icon" variant="ghost" onClick={handleCreateNote} className="rounded-full hover:bg-primary/10 hover:text-primary">
              <Plus className="size-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              className="pl-9 bg-background/50 border-muted text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs">Loading Vault...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="size-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No notes found</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all group relative cursor-pointer",
                  selectedNote?.id === note.id 
                    ? "bg-primary/10 border-primary/20 shadow-sm" 
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <div className="flex flex-col gap-1 pr-6">
                  <span className={cn(
                    "font-semibold truncate",
                    selectedNote?.id === note.id ? "text-primary" : "text-foreground"
                  )}>
                    {note.title || "Untitled Note"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDistanceToNow(new Date(note.updated_at))} ago
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => handleDeleteNote(note.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main: Editor Area */}
      <section className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {selectedNote ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-2 bg-muted rounded-lg md:hidden">
                  <BookOpen className="size-5 text-primary" />
                </div>
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                  className="text-xl md:text-2xl font-bold bg-transparent border-none focus:outline-none w-full placeholder:text-muted-foreground/30 text-white"
                  placeholder="Note Title..."
                />
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                >
                  <Trash2 className="size-4" />
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 bg-muted/50 rounded-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3" />
                      <span>Saved</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
              <div 
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                className="w-full h-full min-h-[500px] bg-transparent border-none focus:outline-none text-lg leading-relaxed font-serif text-zinc-300 prose prose-invert prose-zinc max-w-4xl mx-auto editor-content"
                data-placeholder="Start writing... Paste images anywhere! 🪄"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="size-20 rounded-3xl bg-muted flex items-center justify-center mb-6">
              <BookOpen className="size-10 text-muted-foreground/40" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Your Study Vault</h2>
            <p className="max-w-xs mb-8 text-zinc-400">
              Create personal study notes, reminders, and learning materials for your future preparation.
            </p>
            <Button onClick={handleCreateNote} className="gap-2 rounded-full px-6 shadow-lg shadow-primary/20">
              <Plus className="size-4" /> Create First Note
            </Button>
          </div>
        )}
      </section>

      {/* Premium Deletion Modal */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-white">Delete this note?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. Your revision material will be permanently removed from the Study Vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="rounded-full border-zinc-800 hover:bg-zinc-800 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
