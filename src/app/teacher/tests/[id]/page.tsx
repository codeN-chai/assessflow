import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { QuestionsManager } from "@/app/teacher/tests/[id]/questions-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users } from "lucide-react";
import { CopyButton } from "@/app/teacher/tests/[id]/copy-button";
import { PublishButton } from "@/app/teacher/tests/[id]/publish-button";
import { DeleteButton } from "@/app/teacher/tests/[id]/delete-button";
import { EditTestSettings } from "./edit-test-settings";
import { StopTestButton } from "./stop-test-button";
import { SyncScoresButton } from "./sync-scores-button";

export default async function ManageTestPage(props: { 
  params: Promise<{ id: string }> 
}) {
  const params = await props.params;
  const id = params.id;
  const supabase = await createClient();

  const { data: test, error } = await supabase
    .from("tests")
    .select("*, submissions(count)")
    .eq("id", id)
    .single();

  if (error || !test) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*, options(*)")
    .eq("test_id", id)
    .order("order", { ascending: true });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${test.is_published ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
              }`}>
              {test.is_published ? "Published" : "Draft"}
            </div>
            <EditTestSettings test={test} />
          </div>
          <p className="text-muted-foreground">{test.description || "No description provided."}</p>
        </div>

        <div className="flex flex-col gap-2 min-w-[200px]">
          <PublishButton testId={test.id} isPublished={test.is_published} />
          {test.is_published && <StopTestButton testId={test.id} />}
          <SyncScoresButton testId={test.id} />
          <DeleteButton testId={test.id} testTitle={test.title} />
          {test.is_published && test.code && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Test Code</p>
                  <p className="text-2xl font-mono font-bold tracking-widest">{test.code}</p>
                </div>
                <CopyButton textToCopy={test.code} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{test.duration ? `${test.duration} mins` : "Untimed"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{test.submissions?.[0]?.count || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Questions</h2>
        <QuestionsManager
          testId={test.id}
          initialQuestions={questions || []}
          cloudinaryConfig={{
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
            uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
          }}
        />
      </div>
    </div>
  );
}
