"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { syncScores } from "./teacher-actions";
import { toast } from "sonner";

export function SyncScoresButton({ testId }: { testId: string }) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await syncScores(testId);
      if (res.success) {
        toast.success(`Synchronized ${res.count} scores successfully.`);
      } else {
        toast.error(res.error || "Failed to sync scores");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSync} 
      disabled={loading}
      className="w-full gap-2 text-primary border-primary/20 hover:bg-primary/10 transition-all font-semibold"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      Sync Scores
    </Button>
  );
}
