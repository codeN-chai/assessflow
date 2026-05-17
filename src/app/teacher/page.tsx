import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users, Clock, Settings2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tests, error } = await supabase
    .from("tests")
    .select("*, submissions(count)")
    .eq("teacher_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your tests and view submissions.</p>
        </div>
        <Link href="/teacher/tests/create">
          <Button className="gap-2 w-full sm:w-auto">
            <PlusCircle className="size-4" /> Create Test
          </Button>
        </Link>
      </div>

      {!tests || tests.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="size-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">No tests yet</h3>
          <p className="text-muted-foreground mt-2 mb-6 max-w-md">
            You haven&apos;t created any tests. Create your first test to start evaluating students.
          </p>
          <Link href="/teacher/tests/create">
            <Button>Create your first test</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card key={test.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-1">{test.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {test.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    test.is_published ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}>
                    {test.is_published ? "Published" : "Draft"}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    <span>{test.duration ? `${test.duration} mins` : "Untimed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4" />
                    <span>{test.submissions?.[0]?.count || 0} submissions</span>
                  </div>
                  {test.code && (
                    <div className="mt-2 bg-muted p-2 rounded-md font-mono text-center tracking-widest text-foreground font-bold">
                      {test.code}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t gap-2">
                <Link href={`/teacher/tests/${test.id}`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <Settings2 className="size-4" /> Manage
                  </Button>
                </Link>
                <Link href={`/teacher/tests/${test.id}/submissions`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Results
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
