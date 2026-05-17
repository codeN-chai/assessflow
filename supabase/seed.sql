-- Insert a demo teacher and student into auth.users (Note: in reality you should sign up via UI to handle passwords correctly, 
-- but this seed script inserts mock profiles directly assuming auth user IDs exist, or we just insert dummy UUIDs for testing DB relationships)

-- We will insert mock users into auth.users. The trigger will automatically create the profiles.
-- The password for both accounts is: password123
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'teacher@demo.com', 
    crypt('password123', gen_salt('bf')), current_timestamp, 
    '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Teacher","role":"TEACHER"}', current_timestamp, current_timestamp
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'student@demo.com', 
    crypt('password123', gen_salt('bf')), current_timestamp, 
    '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Student","role":"STUDENT"}', current_timestamp, current_timestamp
  )
ON CONFLICT (id) DO NOTHING;

-- Insert a mock test
INSERT INTO tests (id, teacher_id, title, description, duration, is_published, code)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Introduction to React', 'A basic test on React concepts.', 30, true, 'REACT1')
ON CONFLICT (id) DO NOTHING;

-- Insert questions
INSERT INTO questions (id, test_id, type, text, points, "order")
VALUES 
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333333', 'MULTIPLE_CHOICE', 'What does JSX stand for?', 1, 1),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333333', 'MULTIPLE_CHOICE', 'What hook is used for side effects in React?', 2, 2),
  ('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333333', 'SHORT_ANSWER', 'Explain the virtual DOM in one sentence.', 3, 3)
ON CONFLICT (id) DO NOTHING;

-- Insert options
INSERT INTO options (question_id, text, is_correct)
VALUES 
  ('44444444-4444-4444-4444-444444444441', 'JavaScript XML', true),
  ('44444444-4444-4444-4444-444444444441', 'Java Syntax Extension', false),
  ('44444444-4444-4444-4444-444444444441', 'JSON X', false),

  ('44444444-4444-4444-4444-444444444442', 'useState', false),
  ('44444444-4444-4444-4444-444444444442', 'useEffect', true),
  ('44444444-4444-4444-4444-444444444442', 'useContext', false);
