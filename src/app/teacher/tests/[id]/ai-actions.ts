"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(apiKey);

export async function scanExamImages(base64Images: string[]) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing");
    return { error: "AI Service not configured. Please add GEMINI_API_KEY to environment variables." };
  }


  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
      You are a professional exam architect. 
      Analyze the provided image(s) and extract every question you find.
      
      For each question, determine:
      1. The question type: 'MULTIPLE_CHOICE' or 'SHORT_ANSWER'.
      2. The question text.
      3. For MULTIPLE_CHOICE questions, list all options and identify the 'is_correct' option.
      4. The 'image_index' (0, 1, 2, etc.) of the provided image that contains this question.
      5. If there is a diagram, figure, chart, table, or any illustration (like 'room allocations' or 'logic gates'), provide its 'diagram_bbox' as [ymin, xmin, ymax, xmax] in normalized coordinates (0-1000). Ensure the box covers the ENTIRE figure, including labels. If no diagram, set to null.
      
      Output exactly in this JSON format:
      {
        "questions": [
          {
            "type": "MULTIPLE_CHOICE",
            "text": "Question text...",
            "image_index": 0,
            "diagram_bbox": [100, 200, 400, 800],
            "options": [
              { "text": "Option...", "is_correct": true }
            ]
          }
        ]
      }
    `;

    const imageParts = base64Images.map(base64 => {
      // Basic check for data URL format
      const parts = base64.split(",");
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/png";
      const data = parts[1];

      return {
        inlineData: {
          data,
          mimeType
        }
      };
    });

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    try {
      const parsed = JSON.parse(text);
      return { success: true, questions: parsed.questions };
    } catch (e) {
      // Fallback in case JSON mode fails or AI includes markdown
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, questions: parsed.questions };
    }
  } catch (error: any) {
    console.error("AI Scan Error:", error);
    return { error: error.message || "Failed to scan image. Please try again." };
  }
}
