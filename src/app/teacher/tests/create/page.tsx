"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

function generateRandomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateTestPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [testCode, setTestCode] = useState(generateRandomCode());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (testCode.length !== 6) {
      toast.error("Test code must be exactly 6 characters");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const durationStr = formData.get("duration") as string;
    const duration = durationStr ? parseInt(durationStr) : null;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tests")
      .insert({
        teacher_id: user.id,
        title,
        description,
        duration,
        code: testCode.toUpperCase(),
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error("This test code is already taken. Please choose another one.");
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    toast.success("Test created successfully");
    router.push(`/teacher/tests/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Test</h1>
        <p className="text-muted-foreground mt-1">Set up the basic details for your assessment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
          <CardDescription>You can add questions and publish the test later.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Test Title</Label>
              <Input id="title" name="title" placeholder="e.g. Midterm Examination" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Instructions or information about the test..." 
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration in Minutes</Label>
                <Input 
                  id="duration" 
                  name="duration" 
                  type="number" 
                  min="1" 
                  placeholder="e.g. 60" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Test Code (6 Characters)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="code" 
                    value={testCode} 
                    onChange={(e) => setTestCode(e.target.value.toUpperCase().substring(0, 6))}
                    placeholder="e.g. BIO101"
                    className="font-mono uppercase tracking-widest text-center"
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setTestCode(generateRandomCode())}
                    title="Generate Random Code"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create & Add Questions
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
