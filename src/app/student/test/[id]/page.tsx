import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TakeTest } from "./take-test";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function TestPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch Test
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("*")
    .eq("id", id)
    .single();

  if (testError || !test || !test.is_published) {
    notFound();
  }

  // Fetch Questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*, options(id, text)") // Don't select is_correct for students!
    .eq("test_id", id)
    .order("order", { ascending: true });

  // Handle Submission
  let { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("test_id", id)
    .eq("student_id", user.id)
    .single();

  if (!submission) {
    // Create new submission
    const { data: newSubmission, error } = await supabase
      .from("submissions")
      .insert({
        test_id: id,
        student_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    submission = newSubmission;
  }

  // If already submitted, show results
  if (submission.status === "SUBMITTED") {
    return (
      <div className="max-w-3xl mx-auto mt-12">
        <Card className="text-center py-12 px-6">
          <div className="flex justify-center mb-6">
            <CheckCircle className="size-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl mb-2">Test Completed</CardTitle>
          <CardDescription className="text-lg">You have successfully submitted: {test.title}</CardDescription>
          
          <div className="mt-8 mb-12 p-6 bg-muted/30 rounded-xl inline-block min-w-[250px]">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Your Score</p>
            <p className="text-5xl font-bold">
              {submission.score !== null ? submission.score : "Pending"}
            </p>
          </div>

          <div>
            <Link href="/student">
              <Button size="lg">Return to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Fetch existing answers if resuming
  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("submission_id", submission.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <TakeTest 
        test={test} 
        questions={questions || []} 
        submissionId={submission.id} 
        initialAnswers={answers || []}
        startedAt={submission.created_at}
      />
    </div>
  );
}
