"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function EditTestSettings({ 
  test 
}: { 
  test: { id: string; title: string; description: string | null; duration: number | null; code: string | null } 
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description || "");
  const [duration, setDuration] = useState(test.duration?.toString() || "");
  const [code, setCode] = useState(test.code || "");
  
  const router = useRouter();
  const supabase = createClient();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("tests")
        .update({
          title,
          description: description || null,
          duration: duration ? parseInt(duration) : null,
          code: code.toUpperCase() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", test.id);

      if (error) throw error;

      toast.success("Test settings updated!");
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/20 hover:bg-primary/5 text-primary">
            <Settings className="size-4" /> Edit Settings
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Test Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Test Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white rounded-xl min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Duration (Minutes)</Label>
            <div className="relative">
              <Input
                id="duration"
                type="number"
                placeholder="Leave empty for untimed"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">mins</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Joining Code</Label>
            <Input
              id="code"
              placeholder="e.g. REACT101"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12 font-mono tracking-widest uppercase"
            />
            <p className="text-[10px] text-zinc-500 italic">Students use this code to join the test.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl px-6 text-zinc-400">Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading} className="rounded-xl px-10 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all">
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
