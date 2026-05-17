"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitAndScoreTest } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Send, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TakeTest({ 
  test, 
  questions, 
  submissionId, 
  initialAnswers,
  startedAt
}: { 
  test: any, 
  questions: any[], 
  submissionId: string, 
  initialAnswers: any[],
  startedAt: string
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Init answers
    const ansMap: Record<string, any> = {};
    initialAnswers.forEach(a => {
      if (a.option_id) ansMap[a.question_id] = a.option_id;
      if (a.text_answer) ansMap[a.question_id] = a.text_answer;
    });
    setAnswers(ansMap);

    // Init persistent timer
    if (test.duration && test.duration > 0) {
      const calculateTimeLeft = () => {
        const startTime = new Date(startedAt).getTime();
        const durationMs = test.duration * 60 * 1000;
        const endTime = startTime + durationMs;
        const now = new Date().getTime();
        const diff = Math.floor((endTime - now) / 1000);
        
        return Math.max(0, diff);
      };

      setTimeLeft(calculateTimeLeft());
    }
  }, [initialAnswers, test.duration, startedAt]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerChange = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    // Autosave
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveAnswer(questionId, value);
    }, 1000);
  };

  const saveAnswer = async (questionId: string, value: string) => {
    setSaving(true);
    
    const question = questions.find(q => q.id === questionId);
    
    const dataToSave = {
      submission_id: submissionId,
      question_id: questionId,
      option_id: question.type === 'MULTIPLE_CHOICE' ? value : null,
      text_answer: question.type === 'SHORT_ANSWER' ? value : null
    };

    // Upsert answer (relies on UNIQUE constraint submission_id + question_id)
    const { error } = await supabase
      .from("answers")
      .upsert(dataToSave, { onConflict: "submission_id,question_id" });

    if (error) {
      console.error("Autosave failed", error);
      // Silently fail for UX, maybe show a small indicator in real app
    }
    setSaving(false);
  };

  const handleAttemptSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      setShowConfirmDialog(true);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);
    toast.info("Submitting your test...");
    
    const res = await submitAndScoreTest(submissionId, test.id);
    
    if (res?.error) {
      toast.error(res.error);
      setSubmitting(false);
    } else {
      toast.success("Test submitted successfully!");
      router.refresh();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative pb-32">
      {/* 1. Unified Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b shadow-sm mb-8 py-4 px-6 md:px-8 rounded-b-xl md:rounded-xl mx-[-1rem] md:mx-0 -mt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{test.title}</h1>
            <div className="flex items-center gap-3 text-sm font-medium mt-1.5">
              <div className="flex items-center gap-2">
                {saving ? (
                  <><Loader2 className="size-3.5 animate-spin text-primary" /> <span className="text-muted-foreground">Saving...</span></>
                ) : (
                  <><div className="size-2 rounded-full bg-green-500" /> <span className="text-muted-foreground">Saved</span></>
                )}
              </div>
              <div className="h-4 w-px bg-border" />
              {Object.keys(answers).length < questions.length ? (
                <span className="text-orange-500 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="size-3.5" /> {questions.length - Object.keys(answers).length} left
                </span>
              ) : (
                <span className="text-green-500 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle className="size-3.5" /> All Answered
                </span>
              )}
            </div>
          </div>

          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg border-2 ${timeLeft < 300 ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-muted/50 border-border'}`}>
              <Clock className={`size-5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* 2. Questions Container */}
      <div className="space-y-8">
        {questions.map((q, i) => (
          <Card key={q.id} id={`q-${q.id}`} className="overflow-hidden border-none shadow-md ring-1 ring-border">
            <div className="bg-muted/30 px-6 py-4 border-b flex items-start gap-4">
              <span className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                {i + 1}
              </span>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold tracking-tight">{q.text}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {q.points} point{q.points !== 1 && 's'} • {q.type === 'MULTIPLE_CHOICE' ? 'Select one' : 'Text response'}
                </p>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              {q.image_url && (
                <div className="relative w-full max-h-[400px] rounded-xl overflow-hidden border bg-muted/20 flex justify-center">
                  <img 
                    src={q.image_url} 
                    alt="Question figure" 
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              )}

              {q.type === 'MULTIPLE_CHOICE' ? (
                <RadioGroup 
                  value={answers[q.id] || ""} 
                  onValueChange={(val) => handleAnswerChange(q.id, val)}
                  className="grid gap-3"
                >
                  {q.options?.map((opt: any) => (
                    <div 
                      key={opt.id} 
                      className={cn(
                        "flex items-center space-x-3 border-2 p-4 rounded-xl transition-all cursor-pointer group",
                        answers[q.id] === opt.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "hover:border-primary/50 hover:bg-muted/50"
                      )}
                      onClick={() => handleAnswerChange(q.id, opt.id)}
                    >
                      <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />
                      <div className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center shrink-0",
                        answers[q.id] === opt.id ? "border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"
                      )}>
                        {answers[q.id] === opt.id && <div className="size-2.5 rounded-full bg-primary" />}
                      </div>
                      <Label htmlFor={opt.id} className="cursor-pointer flex-1 text-base font-medium">{opt.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea 
                  placeholder="Type your answer here..."
                  className="min-h-[150px] text-lg p-6 rounded-xl border-2 focus-visible:ring-primary focus-visible:border-primary"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Static Submit Section at the VERY BOTTOM */}
      <div className="mt-16">
        <Card className="border-2 border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
          <CardContent className="p-8 md:p-12 flex flex-col items-center text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-white">Ready to submit?</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {Object.keys(answers).length < questions.length 
                  ? `You still have ${questions.length - Object.keys(answers).length} unanswered questions.` 
                  : "You've answered all questions. Make sure you've reviewed them."}
              </p>
            </div>
            
            <Button 
              size="lg" 
              className={cn(
                "h-14 px-12 rounded-xl font-bold text-lg shadow-xl transition-all active:scale-95",
                Object.keys(answers).length < questions.length ? "bg-orange-600 hover:bg-orange-500 text-white" : ""
              )}
              onClick={handleAttemptSubmit} 
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-5 animate-spin mr-2" /> : <Send className="size-5 mr-2" />}
              {Object.keys(answers).length < questions.length ? "Submit Incomplete Test" : "Submit Assessment"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-white">Submit Incomplete Test?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-base">
              You still have <strong className="text-orange-500">{questions.length - Object.keys(answers).length} unanswered questions</strong>. 
              Are you absolutely sure you want to submit your assessment now? You won't be able to change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="bg-transparent border-zinc-800 text-white hover:bg-zinc-900 hover:text-white rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalSubmit}
              className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-900/20"
            >
              Yes, Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
