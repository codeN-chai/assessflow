-- ==========================================
-- 🎓 AssessFlow: Master Database Setup
-- ==========================================
-- This script sets up the entire database including tables, 
-- enums, triggers, and security policies (RLS).

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('TEACHER', 'STUDENT');
CREATE TYPE question_type AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER');
CREATE TYPE submission_status AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- 2. TABLES

-- PROFILES: Linked to Supabase Auth
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TESTS: Created by teachers
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration INT, -- in minutes
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  code TEXT UNIQUE, -- 6 character unique code to join
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QUESTIONS: Assessment items
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  type question_type NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  points INT NOT NULL DEFAULT 1,
  "order" INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OPTIONS: Multiple choice choices
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBMISSIONS: Student test instances
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status submission_status NOT NULL DEFAULT 'IN_PROGRESS',
  score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

-- ANSWERS: Student responses
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES options(id) ON DELETE SET NULL, -- For MCQs
  text_answer TEXT, -- For short answers
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- STUDENT_NOTES: Personal study vault
CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SECURITY (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Tests Policies
CREATE POLICY "Teachers can manage own tests" ON tests USING (auth.uid() = teacher_id);
CREATE POLICY "Allow students to see test titles" ON tests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Students can read published tests" ON tests FOR SELECT USING (is_published = TRUE);

-- Questions Policies
CREATE POLICY "Teachers can manage questions" ON questions USING (
  EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.teacher_id = auth.uid())
);
CREATE POLICY "Students can view questions" ON questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.is_published = TRUE)
);

-- Options Policies
CREATE POLICY "Teachers can manage options" ON options USING (
  EXISTS (SELECT 1 FROM questions JOIN tests ON questions.test_id = tests.id WHERE questions.id = options.question_id AND tests.teacher_id = auth.uid())
);
CREATE POLICY "Students can view options" ON options FOR SELECT USING (
  EXISTS (SELECT 1 FROM questions JOIN tests ON questions.test_id = tests.id WHERE questions.id = options.question_id AND tests.is_published = TRUE)
);

-- Submissions Policies
CREATE POLICY "Teachers can view submissions" ON submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM tests WHERE tests.id = submissions.test_id AND tests.teacher_id = auth.uid())
);
CREATE POLICY "Teachers can update submissions for their tests" ON submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tests WHERE tests.id = submissions.test_id AND tests.teacher_id = auth.uid())
);
CREATE POLICY "Students can manage own submissions" ON submissions USING (student_id = auth.uid());

-- Answers Policies
CREATE POLICY "Teachers can view answers" ON answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM submissions JOIN tests ON submissions.test_id = tests.id WHERE submissions.id = answers.submission_id AND tests.teacher_id = auth.uid())
);
CREATE POLICY "Students can manage their own answers" ON answers USING (
  EXISTS (SELECT 1 FROM submissions WHERE submissions.id = answers.submission_id AND submissions.student_id = auth.uid())
);

-- Student Notes Policies
CREATE POLICY "Students can manage their own notes" ON student_notes FOR ALL USING (auth.uid() = user_id);

-- 4. TRIGGERS

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    CAST(COALESCE(new.raw_user_meta_data->>'role', 'STUDENT') AS public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
