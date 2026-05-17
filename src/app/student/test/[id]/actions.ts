"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitAndScoreTest(submissionId: string, testId: string) {
  const supabase = await createClient();

  // 1. Fetch correct options
  const { data: questions } = await supabase
    .from("questions")
    .select("id, points, type, options(id, is_correct)")
    .eq("test_id", testId);

  // 2. Fetch user answers
  const { data: answers } = await supabase
    .from("answers")
    .select("question_id, option_id, text_answer")
    .eq("submission_id", submissionId);

  if (!questions || !answers) return { error: "Failed to score" };

  let score = 0;

  for (const q of questions) {
    const ans = answers.find(a => a.question_id === q.id);
    if (!ans) continue;

    if (q.type === "MULTIPLE_CHOICE") {
      const correctOption = q.options?.find((o: any) => o.is_correct);
      if (correctOption && ans.option_id === correctOption.id) {
        score += q.points;
      }
    } else if (q.type === "SHORT_ANSWER") {
      // Basic automatic scoring for short answer MVP or leave for teacher
      // MVP: give points if they wrote anything. In real app, teacher reviews it.
      if (ans.text_answer && ans.text_answer.trim().length > 0) {
        score += q.points; // MVP shortcut
      }
    }
  }

  // 3. Update submission status and score
  const { error } = await supabase
    .from("submissions")
    .update({ 
      status: "SUBMITTED", 
      score, 
      end_time: new Date().toISOString() 
    })
    .eq("id", submissionId);

  if (error) return { error: error.message };

  return { success: true, score };
}
