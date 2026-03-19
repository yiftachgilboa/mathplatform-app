-- ============================================================
-- RLS — הגנה על כל הטבלאות
-- ============================================================
-- הרץ ב-Supabase SQL Editor
-- routes שרת משתמשים ב-SUPABASE_SECRET_KEY (service role) → עוקפים RLS
-- לכן ה-policies מגנות על גישה ישירה ל-API ו-Dashboard של Supabase
-- ============================================================


-- ============================================================
-- 1. games — קריאה ציבורית לכל משתמש מחובר
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- כל משתמש מחובר יכול לקרוא משחקים
CREATE POLICY "authenticated_select_games"
  ON games FOR SELECT
  TO authenticated
  USING (true);

-- רק service role יכול לשנות (sync-games script)
-- אין INSERT/UPDATE/DELETE policies למשתמשים רגילים


-- ============================================================
-- 2. children — הורה מנהל רק את הילדים שלו
-- ============================================================
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_select_children"
  ON children FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "parent_insert_children"
  ON children FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "parent_update_children"
  ON children FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "parent_delete_children"
  ON children FOR DELETE
  USING (parent_id = auth.uid());


-- ============================================================
-- 3. progress — הורה רואה התקדמות של ילדיו
-- ============================================================
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- הורה קורא התקדמות של ילדיו
CREATE POLICY "parent_select_progress"
  ON progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = progress.child_id
        AND children.parent_id = auth.uid()
    )
  );

-- כתיבה (INSERT/UPDATE/DELETE) דרך service role בלבד — אין policy למשתמשים


-- ============================================================
-- 4. wrong_answers — אם הטבלה קיימת
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wrong_answers'
  ) THEN
    EXECUTE 'ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY';

    -- הורה קורא טעויות של ילדיו
    EXECUTE '
      CREATE POLICY "parent_select_wrong_answers"
        ON wrong_answers FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM children
            WHERE children.id = wrong_answers.child_id
              AND children.parent_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;


-- ============================================================
-- 5. sessions — אם הטבלה קיימת
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sessions'
  ) THEN
    EXECUTE 'ALTER TABLE sessions ENABLE ROW LEVEL SECURITY';

    EXECUTE '
      CREATE POLICY "parent_select_sessions"
        ON sessions FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM children
            WHERE children.id = sessions.child_id
              AND children.parent_id = auth.uid()
          )
        )
    ';
  END IF;
END $$;
