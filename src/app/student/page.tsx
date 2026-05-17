"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function StudentDashboard() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchSubmissions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("submissions")
        .select("*, tests(id, title, duration, is_published)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setSubmissions(data);
      }
    }
    fetchSubmissions();
  }, [supabase]);

  const handleJoinTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a test code");
      return;
    }

    setLoading(true);

    // Check if test exists and is published
    const { data: test, error } = await supabase
      .from("tests")
      .select("id, is_published, updated_at")
      .eq("code", code.toUpperCase())
      .single();

    if (error || !test) {
      toast.error("Invalid test code");
      setLoading(false);
      return;
    }

    if (!test.is_published) {
      toast.error("This test is not available yet");
      setLoading(false);
      return;
    }

    // Check if already submitted
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: existingSub } = await supabase
        .from("submissions")
        .select("status, id, created_at")
        .eq("test_id", test.id)
        .eq("student_id", user.id)
        .maybeSingle(); // Use maybeSingle to avoid errors if no submission exists

      if (existingSub) {
        // CHECK FOR AUTO-RESET: If test was updated AFTER the submission was created
        const submissionDate = new Date(existingSub.created_at);
        const testUpdateDate = new Date(test.updated_at);

        if (testUpdateDate > submissionDate) {
          // The teacher "reset" the test by editing it (e.g. changing the code)
          // Delete old submission to allow a new one
          await supabase.from("submissions").delete().eq("id", existingSub.id);
          toast.success("New version of the test found. Starting a fresh attempt!");
        } else if (existingSub.status === "SUBMITTED") {
          toast.error("You have already submitted this test.");
          setLoading(false);
          return;
        } else {
          // Resume in-progress
          toast.success("Resuming your test...");
        }
      }
    }

    router.push(`/student/test/${test.id}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">Join tests and view your results.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Join a Test</CardTitle>
            <CardDescription>Enter the code provided by your teacher.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinTest} className="flex gap-4">
              <Input
                placeholder="e.g. A1B2C3"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono uppercase text-lg tracking-widest bg-background"
                maxLength={6}
              />
              <Button type="submit" disabled={loading} className="gap-2 shrink-0">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Join <ArrowRight className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Link href="/student/notes" className="group block">
          <Card className="border-primary/10 hover:border-primary/30 transition-colors relative overflow-hidden h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-primary" />
                  Study Vault
                </CardTitle>
                <ArrowRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
              </div>
              <CardDescription>Create and manage your revision notes for future exams.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-primary">Open Workspace →</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Your Assessments</h2>

        {submissions.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg bg-muted/30">
            <p className="text-muted-foreground">You haven&apos;t taken any tests yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="line-clamp-1">{sub.tests?.title}</CardTitle>
                    {sub.status === 'SUBMITTED' ? (
                      <CheckCircle className="size-5 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="size-5 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <CardDescription>
                    {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    <span className="text-lg font-bold">
                      {sub.score !== null ? sub.score : "Pending"}
                    </span>
                  </div>
                </CardContent>
                {sub.status === 'IN_PROGRESS' && sub.tests?.is_published && (
                  <CardFooter className="pt-0">
                    <Link
                      href={`/student/test/${sub.tests?.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      )}
                    >
                      Resume Test
                    </Link>
                  </CardFooter>
                )}
                {sub.status === 'IN_PROGRESS' && !sub.tests?.is_published && (
                  <CardFooter className="pt-0">
                    <div className="w-full text-center py-2 px-4 rounded-xl bg-muted text-muted-foreground text-sm font-medium">
                      Test Ended by Teacher
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
