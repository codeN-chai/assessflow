"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Square, Loader2, AlertTriangle } from "lucide-react";
import { stopTest } from "./teacher-actions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function StopTestButton({ testId }: { testId: string }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await stopTest(testId);
      if (res.success) {
        toast.success(`Test ended. ${res.count} submissions were force-submitted.`);
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to stop test");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={(props) => (
        <Button 
          {...props}
          variant="outline" 
          className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-all hover:shadow-lg hover:shadow-destructive/20 font-bold"
        >
          <Square className="size-4 fill-current" />
          End Live Test
        </Button>
      )} />
      <DialogContent className="sm:max-w-[425px] border-destructive/20 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            End Assessment?
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-2">
            This will immediately **unpublish** the test and **force-submit** all active student sessions. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl text-zinc-400">
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleStop} 
            disabled={loading}
            className="rounded-xl font-bold bg-destructive hover:bg-destructive/90 shadow-xl shadow-destructive/20 px-6"
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            End Test Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
