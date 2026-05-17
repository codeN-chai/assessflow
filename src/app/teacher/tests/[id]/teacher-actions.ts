"use server";

import { createClient } from "@/lib/supabase/server";
import { submitAndScoreTest } from "@/app/student/test/[id]/actions";
import { revalidatePath } from "next/cache";

export async function stopTest(testId: string) {
  const supabase = await createClient();

  // 1. Unpublish the test immediately to prevent new entries
  const { error: unpublishError } = await supabase
    .from("tests")
    .update({ is_published: false })
    .eq("id", testId);

  if (unpublishError) return { error: unpublishError.message };

  // 2. Fetch all IN_PROGRESS submissions
  const { data: activeSubmissions, error: fetchError } = await supabase
    .from("submissions")
    .select("id")
    .eq("test_id", testId)
    .eq("status", "IN_PROGRESS");

  if (fetchError) return { error: fetchError.message };

  // 3. Force submit every active submission in one bulk update
  const { error: updateError } = await supabase
    .from("submissions")
    .update({
      status: "SUBMITTED",
      end_time: new Date().toISOString()
    })
    .eq("test_id", testId)
    .eq("status", "IN_PROGRESS");

  if (updateError) return { error: updateError.message };

  // 4. Trigger scoring for all submissions in this test
  const { data: allSubmissions } = await supabase
    .from("submissions")
    .select("id")
    .eq("test_id", testId);

  if (allSubmissions) {
    for (const sub of allSubmissions) {
      // This will calculate and update the score field
      await submitAndScoreTest(sub.id, testId);
    }
  }

  revalidatePath(`/teacher/tests/${testId}`);
  return { success: true, count: activeSubmissions?.length || 0 };
}

export async function syncScores(testId: string) {
  const supabase = await createClient();

  // 1. Fetch all submissions for this test
  const { data: allSubmissions, error: fetchError } = await supabase
    .from("submissions")
    .select("id")
    .eq("test_id", testId);

  if (fetchError) return { error: fetchError.message };

  // 2. Recalculate scores for every single one
  if (allSubmissions && allSubmissions.length > 0) {
    for (const sub of allSubmissions) {
      await submitAndScoreTest(sub.id, testId);
    }
  }

  revalidatePath(`/teacher/tests/${testId}`);
  return { success: true, count: allSubmissions?.length || 0 };
}
