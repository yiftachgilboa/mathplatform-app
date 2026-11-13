-- ============================================================
-- אתר הקורס kidodo — 4 טבלאות + RLS
-- ============================================================
-- הרץ ב-Supabase SQL Editor.
-- כל הכתיבה נעשית מ-routes שרת עם SUPABASE_SECRET_KEY (service role, עוקף RLS).
-- ה-policies נותנות להורה קריאה בלבד — רק לילדים שלו.
-- מחיקת ילד / משתמש מוחקת אוטומטית את השורות שלו (ON DELETE CASCADE).
-- ============================================================


-- ============================================================
-- 1. course_enrollments — איזה ילד לומד באיזה קורס
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  course_id   text NOT NULL,
  avatar      text,                       -- מזהה דמות הקורס, למשל 'char-03'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, course_id)
);

CREATE INDEX IF NOT EXISTS course_enrollments_parent_idx
  ON public.course_enrollments (parent_id);


-- ============================================================
-- 2. course_progress — שורה אחת לכל שלב בשיעור
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_progress (
  child_id      uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  course_id     text NOT NULL,
  lesson_id     text NOT NULL,
  stage         int  NOT NULL CHECK (stage BETWEEN 1 AND 5),
  completed_at  timestamptz,
  stars         int CHECK (stars BETWEEN 0 AND 3),
  score         int CHECK (score BETWEEN 0 AND 100),   -- ציון מבחן אחרון באחוזים
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, course_id, lesson_id, stage)
);


-- ============================================================
-- 3. course_answers — כל תשובה בשיעור (לחישוב דיוק)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_answers (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  child_id    uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  course_id   text NOT NULL,
  lesson_id   text NOT NULL,
  stage       int  NOT NULL CHECK (stage BETWEEN 1 AND 5),
  correct     boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- חלון 30 התשובות האחרונות לשיעור+שלב
CREATE INDEX IF NOT EXISTS course_answers_window_idx
  ON public.course_answers (child_id, course_id, lesson_id, stage, created_at DESC);


-- ============================================================
-- 4. course_mastery — שליטה בשיעור
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_mastery (
  child_id    uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  course_id   text NOT NULL,
  lesson_id   text NOT NULL,
  mastered_at timestamptz NOT NULL DEFAULT now(),
  via         text NOT NULL CHECK (via IN ('practice', 'test')),
  PRIMARY KEY (child_id, course_id, lesson_id)
);


-- ============================================================
-- RLS — הורה קורא רק את הילדים שלו; כתיבה רק דרך service role
-- ============================================================
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_mastery     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_select_course_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "parent_select_course_progress"
  ON public.course_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = course_progress.child_id AND c.parent_id = auth.uid()
  ));

CREATE POLICY "parent_select_course_answers"
  ON public.course_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = course_answers.child_id AND c.parent_id = auth.uid()
  ));

CREATE POLICY "parent_select_course_mastery"
  ON public.course_mastery FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = course_mastery.child_id AND c.parent_id = auth.uid()
  ));


-- ============================================================
-- (אופציונלי, לבדיקה) פתיחת הקורס למשפחת הבדיקה (קוד 520)
-- ============================================================
-- INSERT INTO public.parent_access (parent_id, access_key)
-- VALUES ('bda25951-ff2d-4fe2-af08-a3c3976798ba', 'course:kidodo-g1');
