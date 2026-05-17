<div align="center">
  
# 🎓 AssessFlow

**A smart, easy-to-use exam platform built to save teachers time and help students focus.**

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="https://assessflow-app.vercel.app/">Live Demo</a>
</p>

</div>

---

## 👋 Hello! Welcome to AssessFlow!

**AssessFlow** is a full-stack project I built to solve a simple problem: making online tests shouldn't be annoying, and taking them shouldn't be distracting.

If you're a teacher, typing out 50 questions from a piece of paper takes hours. So, I connected **Google Gemini AI** to the app. Now, you can just take a picture of a paper exam, upload it, and the AI turns it into a digital test automatically! 

## ✨ Cool Things It Does

### For Teachers (Making the Test)
* 🪄 **AI Photo Scanner:** Just upload a screenshot of an exam paper. The AI reads it and creates the digital questions and options for you.
* 📊 **Live Dashboard:** See exactly how students are doing while they are taking the test.
* 🛑 **The "Time's Up" Button:** With one click, you can end the test and force everyone's answers to submit automatically.

### For Students (Taking the Test)
* 🛡️ **Clean, Dark UI:** No messy sidebars or popups. Just you and the test.
* ⏲️ **Un-cheatable Timers:** If your laptop dies or you accidentally refresh the page, the timer keeps running in the background. You don't lose any time, and you can't cheat the clock!
* 🚫 **"Oops" Protection:** The app warns you if you try to hit submit while you still have blank questions left.

## 🛠️ Tech Stack

* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS + Shadcn UI + Lucide Icons
* **Database & Auth:** Supabase (PostgreSQL + RLS Security Policies)
* **AI Engine:** Google Gemini 2.5 Flash Vision (via Google Generative AI SDK)
* **Image Hosting:** Cloudinary
* **Deployment:** Vercel

## 💻 Getting Started

To run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/assessflow.git
cd assessflow
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory and add the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 3. Setup the Database
1. Create a new Supabase project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of the `supabase/schema.sql` file provided in this repository.
4. Paste it into the SQL Editor and click **Run**. This will instantly configure all tables, enums, triggers, and highly secure Row Level Security (RLS) policies.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

<div align="center">
  <p><b>AssessFlow</b> — Making exams better for everyone.</p>
</div>
