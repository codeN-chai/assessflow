import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function TestSubmissionsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("title")
    .eq("id", id)
    .single();

  if (testError || !test) {
    notFound();
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, profiles(full_name, email)")
    .eq("test_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/teacher/tests/${id}`}>
          <Button variant="ghost" size="sm" className="mb-4 gap-2 -ml-3">
            <ArrowLeft className="size-4" /> Back to Test
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Submissions: {test.title}</h1>
        <p className="text-muted-foreground mt-1">View student scores and submission details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {!submissions || submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="font-medium">{sub.profiles?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{sub.profiles?.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${sub.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {sub.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {sub.end_time ? formatDistanceToNow(new Date(sub.end_time), { addSuffix: true }) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {sub.score !== null ? sub.score : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
