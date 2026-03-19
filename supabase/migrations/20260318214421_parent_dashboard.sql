-- ============================================================
-- 1. טבלת lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id   serial PRIMARY KEY,
  name text    NOT NULL,
  grade text   NOT NULL
);

-- ============================================================
-- 2. טבלת child_lessons
-- ============================================================
CREATE TABLE IF NOT EXISTS child_lessons (
  id         bigserial PRIMARY KEY,
  child_id   uuid        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  lesson_id  int         NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  position   int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, lesson_id)
);

-- ============================================================
-- 3. RLS על child_lessons
-- ============================================================
ALTER TABLE child_lessons ENABLE ROW LEVEL SECURITY;

-- הורה רואה שיעורים של ילדיו בלבד
CREATE POLICY "parent_select_child_lessons"
  ON child_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_lessons.child_id
        AND children.parent_id = auth.uid()
    )
  );

-- הורה מוסיף שיעורים לילדיו בלבד
CREATE POLICY "parent_insert_child_lessons"
  ON child_lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_lessons.child_id
        AND children.parent_id = auth.uid()
    )
  );

-- הורה מוחק שיעורים של ילדיו בלבד
CREATE POLICY "parent_delete_child_lessons"
  ON child_lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_lessons.child_id
        AND children.parent_id = auth.uid()
    )
  );

