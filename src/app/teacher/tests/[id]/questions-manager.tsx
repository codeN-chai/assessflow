"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CldUploadWidget } from "next-cloudinary";
import { toast } from "sonner";
import { PlusCircle, Loader2, Image as ImageIcon, Trash2, CheckCircle2, Sparkles, Wand2, X, Edit2 } from "lucide-react";
import Image from "next/image";
import { uploadToCloudinary } from "./upload-action";
import { scanExamImages } from "./ai-actions";

type Question = any; // Simplify typing for MVP

export function QuestionsManager({
  testId,
  initialQuestions,
  cloudinaryConfig
}: {
  testId: string;
  initialQuestions: Question[];
  cloudinaryConfig: { cloudName: string; uploadPreset: string; }
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form State
  const [type, setType] = useState<"MULTIPLE_CHOICE" | "SHORT_ANSWER">("MULTIPLE_CHOICE");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  // AI Scanning State
  const [scanImages, setScanImages] = useState<string[]>([]);
  const [scannedQuestions, setScannedQuestions] = useState<any[]>([]);


  // Handle Clipboard Paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = async () => {
            const base64data = reader.result as string;

            if (isScanning) {
              setScanImages(prev => [...prev, base64data]);
              toast.success("Image added to scan queue");
            } else {
              setLoading(true);
              try {
                const result = await uploadToCloudinary(base64data);
                if (result.success) {
                  setImageUrl(result.url);
                  toast.success("Image pasted successfully!");
                } else {
                  toast.error(`Paste failed: ${result.error}`);
                }
              } catch (error) {
                toast.error("An unexpected error occurred during paste");
              } finally {
                setLoading(false);
              }
            }
          };
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isScanning]);

  const [uploadedScanUrls, setUploadedScanUrls] = useState<string[]>([]);

  const startAIScan = async () => {
    if (scanImages.length === 0) {
      toast.error("Please paste or upload at least one image first.");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload images to Cloudinary first so we have permanent URLs
      const uploadPromises = scanImages.map(img => uploadToCloudinary(img));
      const uploadResults = await Promise.all(uploadPromises);

      const urls = uploadResults.map(r => r.success ? r.url : null);
      setUploadedScanUrls(urls.filter((u): u is string => u !== null));

      // 2. Scan with AI
      const result = await scanExamImages(scanImages);
      if (result.success && result.questions) {
        setScannedQuestions(result.questions);
        toast.success(`AI found ${result.questions.length} questions!`);
      } else {
        toast.error(result.error || "AI could not find any questions.");
      }
    } catch (error) {
      toast.error("Failed to process images.");
    } finally {
      setLoading(false);
    }
  };

  const cropImage = async (base64: string, bbox: number[]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }

        const [ymin, xmin, ymax, xmax] = bbox;
        const width = img.width;
        const height = img.height;

        // Convert normalized coordinates to pixels
        const left = (xmin / 1000) * width;
        const top = (ymin / 1000) * height;
        const rectWidth = ((xmax - xmin) / 1000) * width;
        const rectHeight = ((ymax - ymin) / 1000) * height;

        canvas.width = rectWidth;
        canvas.height = rectHeight;
        ctx.drawImage(img, left, top, rectWidth, rectHeight, 0, 0, rectWidth, rectHeight);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(base64);
    });
  };

  const saveAllScanned = async () => {
    setLoading(true);
    try {
      for (const q of scannedQuestions) {
        let qImageUrl = null;

        // If the AI found a diagram, crop it and upload
        if (q.diagram_bbox && q.image_index !== undefined) {
          const originalBase64 = scanImages[q.image_index];
          const croppedBase64 = await cropImage(originalBase64, q.diagram_bbox);
          const uploadResult = await uploadToCloudinary(croppedBase64);
          if (uploadResult.success) {
            qImageUrl = uploadResult.url;
          }
        }

        const { data: qData, error: qError } = await supabase
          .from("questions")
          .insert({
            test_id: testId,
            type: q.type,
            text: q.text,
            image_url: qImageUrl,
            points: 1,
            order: questions.length + 1
          })
          .select()
          .single();

        if (qError) throw qError;

        if (q.type === "MULTIPLE_CHOICE" && q.options) {
          const optionsToInsert = q.options.map((o: any) => ({
            question_id: qData.id,
            text: o.text,
            is_correct: o.is_correct
          }));

          const { error: oError } = await supabase.from("options").insert(optionsToInsert);
          if (oError) throw oError;
        }
      }

      toast.success("All AI-scanned questions saved with cropped diagrams!");
      setScannedQuestions([]);
      setScanImages([]);
      setUploadedScanUrls([]);
      setIsScanning(false);
      router.refresh();
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, { text: "", isCorrect: false }]);
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index].text = val;
    setOptions(newOptions);
  };

  const setCorrectOption = (index: number) => {
    const newOptions = options.map((opt, i) => ({ ...opt, isCorrect: i === index }));
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast.error("You need at least 2 options for multiple choice");
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    if (options[index].isCorrect) {
      newOptions[0].isCorrect = true;
    }
    setOptions(newOptions);
  };

  const handleSaveQuestion = async () => {
    if (!text.trim()) {
      toast.error("Question text is required");
      return;
    }

    if (type === "MULTIPLE_CHOICE" && options.some(o => !o.text.trim())) {
      toast.error("All options must have text");
      return;
    }

    setLoading(true);

    try {
      if (editingQuestionId) {
        // Update existing question
        const { error: qError } = await supabase
          .from("questions")
          .update({
            type,
            text,
            image_url: imageUrl || null,
            points
          })
          .eq("id", editingQuestionId);

        if (qError) throw qError;

        if (type === "MULTIPLE_CHOICE") {
          // Delete old options and insert new ones (simplest way to sync)
          await supabase.from("options").delete().eq("question_id", editingQuestionId);
          
          const optionsToInsert = options.map(o => ({
            question_id: editingQuestionId,
            text: o.text,
            is_correct: o.isCorrect
          }));

          const { error: oError } = await supabase.from("options").insert(optionsToInsert);
          if (oError) throw oError;
        }

        toast.success("Question updated!");
      } else {
        // Create new question
        const { data: qData, error: qError } = await supabase
          .from("questions")
          .insert({
            test_id: testId,
            type,
            text,
            image_url: imageUrl || null,
            points,
            order: questions.length + 1
          })
          .select()
          .single();

        if (qError) throw qError;

        if (type === "MULTIPLE_CHOICE") {
          const optionsToInsert = options.map(o => ({
            question_id: qData.id,
            text: o.text,
            is_correct: o.isCorrect
          }));

          const { error: oError } = await supabase.from("options").insert(optionsToInsert);
          if (oError) throw oError;
        }
        toast.success("Question added!");
      }

      setIsAdding(false);
      setEditingQuestionId(null);
      resetForm();
      router.refresh();
      // For immediate UI update
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType("MULTIPLE_CHOICE");
    setText("");
    setImageUrl("");
    setPoints(1);
    setOptions([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);
    setEditingQuestionId(null);
  };

  const handleEdit = (q: any) => {
    setEditingQuestionId(q.id);
    setType(q.type);
    setText(q.text);
    setImageUrl(q.image_url || "");
    setPoints(q.points);
    if (q.options && q.options.length > 0) {
      setOptions(q.options.map((o: any) => ({ text: o.text, isCorrect: o.is_correct ?? o.isCorrect ?? false })));
    } else {
      setOptions([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);
    }
    setIsAdding(false); // Close the bottom form if open
  };

  const handleDelete = async (questionId: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", questionId);
    if (error) {
      toast.error("Failed to delete question");
    } else {
      toast.success("Question deleted");
      setQuestions(questions.filter(q => q.id !== questionId));
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="size-5 text-primary" />
          Test Questions
        </h2>
      </div>



      {questions.map((q, index) => (
        <Card key={q.id} className={cn(
          "overflow-hidden border-zinc-800/50 bg-zinc-950/40 backdrop-blur-md group transition-all duration-500",
          editingQuestionId === q.id ? "border-primary ring-1 ring-primary/20 shadow-2xl shadow-primary/10 scale-[1.01] z-10" : "hover:border-primary/40 hover:bg-zinc-900/40 hover:shadow-xl hover:shadow-black/20"
        )}>
          {editingQuestionId === q.id ? (
            <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 className="size-4 text-primary" />
                  Edit Question {String(index + 1).padStart(2, '0')}
                </h3>
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-zinc-500 hover:text-white rounded-full">Cancel</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Question Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                      <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Points Value</Label>
                  <Input type="number" min="1" value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 1)} className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Question Text</Label>
                <Input placeholder="Question text..." value={text} onChange={(e) => setText(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-14 text-lg" />
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Image Attachment</Label>
                {imageUrl ? (
                  <div className="relative inline-block group">
                    <img src={imageUrl} alt="Uploaded" className="max-h-60 rounded-2xl border-2 border-primary/20 shadow-xl" />
                    <Button variant="destructive" size="icon" className="absolute -top-3 -right-3 size-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setImageUrl("")}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <CldUploadWidget
                    uploadPreset="assessflow"
                    onSuccess={(result: any) => {
                      if (result.info?.secure_url) {
                        setImageUrl(result.info.secure_url);
                        toast.success("Image uploaded!");
                      }
                    }}
                  >
                    {({ open }) => (
                      <Button type="button" variant="outline" className="w-full border-dashed border-2 border-zinc-800 bg-zinc-900/30 h-32 rounded-2xl flex-col gap-3 text-zinc-500 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all" onClick={() => open()}>
                        <ImageIcon className="size-6" />
                        <span className="text-sm font-medium">Click to upload or Paste image anywhere</span>
                      </Button>
                    )}
                  </CldUploadWidget>
                )}
              </div>

              {type === "MULTIPLE_CHOICE" && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Options & Answers</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddOption} className="text-primary gap-1.5 hover:bg-primary/10 rounded-full">
                      <PlusCircle className="size-3.5" /> Add Option
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {options.map((opt, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-3 p-2 rounded-2xl border transition-all",
                        opt.isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-zinc-900/30 border-zinc-800"
                      )}>
                        <Button
                          type="button"
                          variant={opt.isCorrect ? "default" : "outline"}
                          size="icon"
                          onClick={() => setCorrectOption(i)}
                          className={cn(
                            "size-10 rounded-xl transition-all",
                            opt.isCorrect ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "border-zinc-800 text-zinc-500"
                          )}
                        >
                          {opt.isCorrect ? <CheckCircle2 className="size-5" /> : <div className="size-2 rounded-full bg-zinc-800" />}
                        </Button>
                        <Input
                          value={opt.text}
                          onChange={(e) => handleOptionChange(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="bg-transparent border-none text-white focus-visible:ring-0 h-10"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-zinc-600 hover:text-destructive hover:bg-destructive/10 rounded-xl">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                <Button variant="ghost" onClick={resetForm} className="rounded-xl px-8 text-zinc-400">Cancel</Button>
                <Button onClick={handleSaveQuestion} disabled={loading} className="rounded-xl px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
                  Update Question
                </Button>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg flex items-baseline gap-2">
                    <span className="text-primary font-mono text-sm">{String(index + 1).padStart(2, '0')}.</span>
                    <span className="text-white">{q.text}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1 rounded-full">
                      {q.type === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 'Short Answer'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{q.points} pt{q.points !== 1 && 's'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => handleEdit(q)}>
                    <Edit2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {q.image_url && (
                  <div className="mb-6 rounded-2xl overflow-hidden border border-zinc-800">
                    <img src={q.image_url} alt="Question" className="w-full max-w-2xl" />
                  </div>
                )}
                {q.type === "MULTIPLE_CHOICE" && q.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: any) => (
                      <div 
                        key={opt.id || Math.random()} 
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border transition-all",
                          opt.is_correct || opt.isCorrect 
                            ? "bg-primary/5 border-primary/30 text-primary shadow-[0_0_20px_-12px_rgba(var(--primary),0.5)]" 
                            : "bg-zinc-900/50 border-zinc-800 text-zinc-400"
                        )}
                      >
                        {opt.is_correct || opt.isCorrect ? <CheckCircle2 className="size-4 shrink-0" /> : <div className="size-4 rounded-full border border-zinc-700 shrink-0" />}
                        <span className="text-sm font-medium">{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {q.type === "SHORT_ANSWER" && (
                  <div className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/30 text-zinc-500 text-sm italic font-serif leading-relaxed">
                    "Students will provide a comprehensive text response for this question."
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      ))}

      {/* Creator Zone - AI & Manual Tools at the Bottom */}
      {!isAdding && (
        <div className="space-y-4">
          <Card className={cn(
            "border-dashed border-2 transition-all duration-500 relative overflow-hidden",
            isScanning ? "border-primary bg-primary/5 shadow-2xl shadow-primary/5" : "border-muted-foreground/10 bg-zinc-950/20"
          )}>
            <CardContent className="p-6 md:p-10">
              {isScanning ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Sparkles className="size-6 text-primary animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">AI Smart Scan</h3>
                        <p className="text-sm text-muted-foreground">Paste or upload screenshots of your questions.</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setIsScanning(false); setScanImages([]); setScannedQuestions([]); }} className="rounded-full">
                      <X className="size-5" />
                    </Button>
                  </div>

                  {scannedQuestions.length > 0 ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-primary">Detected Questions ({scannedQuestions.length})</h4>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setScannedQuestions([])} className="rounded-full">Rescan</Button>
                          <Button size="sm" onClick={saveAllScanned} disabled={loading} className="gap-2 rounded-full shadow-lg shadow-primary/20">
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                            Save All to Test
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {scannedQuestions.map((q, i) => (
                          <div key={i} className="p-4 bg-background border rounded-2xl shadow-sm space-y-2 group">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {q.type.replace('_', ' ')}
                              </span>
                              <p className="text-sm font-medium text-white">{q.text}</p>

                              {/* DIAGRAM PREVIEW */}
                              {q.diagram_bbox && q.image_index !== undefined && (
                                <div className="rounded-lg overflow-hidden border border-primary/20 bg-zinc-950 p-2 relative">
                                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-primary/20 text-primary text-[8px] font-bold rounded uppercase">Auto-Crop</div>
                                  <div className="w-full h-[120px] relative overflow-hidden rounded border border-zinc-800">
                                    <img
                                      src={scanImages[q.image_index]}
                                      style={{
                                        position: 'absolute',
                                        left: `-${(q.diagram_bbox[1] / 10)}%`,
                                        top: `-${(q.diagram_bbox[0] / 10)}%`,
                                        width: `${100000 / (q.diagram_bbox[3] - q.diagram_bbox[1])}%`,
                                        maxWidth: 'none',
                                      }}
                                      alt="Diagram preview"
                                    />
                                  </div>
                                </div>
                              )}

                              {q.options && (
                                <div className="flex flex-wrap gap-1">
                                  {q.options.map((o: any, oi: number) => (
                                    <span key={oi} className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-md border",
                                      o.is_correct ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground"
                                    )}>
                                      {o.text}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {scanImages.map((img, i) => (
                          <div key={i} className="aspect-video relative rounded-xl overflow-hidden border-2 border-primary/20 group">
                            <img src={img} alt="Scan queue" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setScanImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 size-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                        <div className="aspect-video rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center bg-primary/5 text-primary gap-2 group/add relative overflow-hidden">
                          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                          <ImageIcon className="size-6 opacity-50 group-hover/add:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold tracking-tighter uppercase opacity-60">Paste Image</span>
                        </div>
                      </div>

                      <div className="flex justify-center pt-4">
                        <Button
                          size="lg"
                          onClick={startAIScan}
                          disabled={loading || scanImages.length === 0}
                          className="relative group/btn overflow-hidden h-16 px-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/30 transition-all active:scale-95"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                          {loading ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
                          <span className="text-xl font-black tracking-tight ml-2">
                            {loading ? "Analyzing..." : "Process Exam"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-2">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Import from Screenshot</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                      Have an existing exam paper? Just take screenshots and paste them here. Our AI will do the rest.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsScanning(true)}
                    variant="outline"
                    className="gap-2 rounded-full px-8 border-primary/30 hover:bg-primary/5 text-primary font-semibold transition-all hover:scale-105"
                  >
                    <Wand2 className="size-4" /> Start AI Scan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {!isScanning && (
            <Button onClick={() => setIsAdding(true)} className="w-full relative overflow-hidden py-12 rounded-[2.5rem] bg-zinc-950/40 border-2 border-dashed border-zinc-800 hover:border-primary/50 transition-all group active:scale-[0.99]" variant="outline">
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] transition-colors" />
              <div className="flex flex-col items-center gap-4 relative z-10">
                <div className="p-4 bg-zinc-900/50 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all shadow-inner ring-1 ring-white/5">
                  <PlusCircle className="size-7 text-primary" />
                </div>
                <div className="space-y-1 text-center">
                  <span className="block text-lg font-bold text-white group-hover:text-primary transition-colors">Create Manually</span>
                  <p className="text-xs text-zinc-500 font-medium tracking-wide">Write your own question from scratch</p>
                </div>
              </div>
            </Button>
          )}
        </div>
      )}

      {isAdding && (
        <Card className="border-primary/50 shadow-2xl shadow-primary/10 bg-zinc-950 ring-1 ring-primary/20 animate-in zoom-in-95 duration-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">
              {editingQuestionId ? "Edit Question" : "Create Question"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Question Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                    <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Points Value</Label>
                <Input type="number" min="1" value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 1)} className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Question Text</Label>
              <Input placeholder="What is the objective of this question?" value={text} onChange={(e) => setText(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-14 text-lg" />
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Image Attachment</Label>
              {imageUrl ? (
                <div className="relative inline-block group">
                  <img src={imageUrl} alt="Uploaded" className="max-h-60 rounded-2xl border-2 border-primary/20 shadow-xl" />
                  <Button variant="destructive" size="icon" className="absolute -top-3 -right-3 size-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setImageUrl("")}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <CldUploadWidget
                  uploadPreset="assessflow"
                  onSuccess={(result: any) => {
                    if (result.info?.secure_url) {
                      setImageUrl(result.info.secure_url);
                      toast.success("Image uploaded!");
                    }
                  }}
                >
                  {({ open }) => (
                    <Button type="button" variant="outline" className="w-full border-dashed border-2 border-zinc-800 bg-zinc-900/30 h-32 rounded-2xl flex-col gap-3 text-zinc-500 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all" onClick={() => open()}>
                      <div className="p-3 bg-zinc-800 rounded-full group-hover:bg-primary/10 transition-colors">
                        <ImageIcon className="size-6" />
                      </div>
                      <span className="text-sm font-medium">Click to upload or Paste image anywhere</span>
                    </Button>
                  )}
                </CldUploadWidget>
              )}
            </div>

            {type === "MULTIPLE_CHOICE" && (
              <div className="space-y-4 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 uppercase text-[10px] font-bold tracking-widest">Options & Answers</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAddOption} className="text-primary gap-1.5 hover:bg-primary/10 rounded-full px-4">
                    <PlusCircle className="size-3.5" /> Add Option
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {options.map((opt, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-2 rounded-2xl border transition-all",
                      opt.isCorrect ? "bg-primary/5 border-primary/20" : "bg-zinc-900/30 border-zinc-800"
                    )}>
                      <Button
                        type="button"
                        variant={opt.isCorrect ? "default" : "outline"}
                        size="icon"
                        onClick={() => setCorrectOption(i)}
                        className={cn(
                          "size-10 rounded-xl transition-all",
                          opt.isCorrect ? "bg-primary text-white shadow-lg shadow-primary/30" : "border-zinc-800 text-zinc-500"
                        )}
                      >
                        {opt.isCorrect ? <CheckCircle2 className="size-5" /> : <div className="size-2 rounded-full bg-zinc-800" />}
                      </Button>
                      <Input
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-zinc-700 h-10"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-zinc-600 hover:text-destructive hover:bg-destructive/10 rounded-xl">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-zinc-800 p-6 bg-zinc-900/20">
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="rounded-xl px-8 hover:bg-zinc-800 text-zinc-400">Cancel</Button>
            <Button onClick={handleSaveQuestion} disabled={loading} className="rounded-xl px-10 bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20">
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : (editingQuestionId ? <Edit2 className="mr-2 size-4" /> : <PlusCircle className="mr-2 size-4" />)}
              {editingQuestionId ? "Update Question" : "Create Question"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
