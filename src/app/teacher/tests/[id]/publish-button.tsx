"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Globe, Lock } from "lucide-react";

export function PublishButton({ testId, isPublished }: { testId: string; isPublished: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const togglePublish = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("tests")
      .update({ is_published: !isPublished })
      .eq("id", testId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isPublished ? "Test unpublished" : "Test published successfully");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Button 
      variant={isPublished ? "outline" : "default"} 
      className="w-full gap-2" 
      onClick={togglePublish}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : isPublished ? <Lock className="size-4" /> : <Globe className="size-4" />}
      {isPublished ? "Unpublish Test" : "Publish Test"}
    </Button>
  );
}
