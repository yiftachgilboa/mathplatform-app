-- ============================================================
-- ארנק + חנות: תנועות מטבעות, מראה הדמות, קופסאות הפתעה
-- ============================================================
-- הרץ ב-Supabase SQL Editor. אפשר להריץ שוב בבטחה. לא מוחק ולא משנה נתונים קיימים.
-- children.coins נשאר היתרה. משתנה רק דרך הפונקציות כאן (שרת, service role).
-- ============================================================

-- תנועות. ref ייחודי לילד → אותה פעולה לא משולמת פעמיים.
CREATE TABLE IF NOT EXISTS public.coin_ledger (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  child_id    uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  amount      int  NOT NULL,
  boxes       int  NOT NULL DEFAULT 0,      -- קופסאות מתנה שניתנו בתנועה הזו
  ref         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, ref)
);

-- שורה לילד שכבר נכנס לחנות. pending = פריט שנפתח ועוד לא הוחלט עליו (וי / איקס).
CREATE TABLE IF NOT EXISTS public.child_shop (
  child_id    uuid PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
  look        jsonb NOT NULL DEFAULT '{}'::jsonb,
  pending     jsonb,
  gift_boxes  int NOT NULL DEFAULT 0 CHECK (gift_boxes >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_shop  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_select_coin_ledger" ON public.coin_ledger;
CREATE POLICY "parent_select_coin_ledger" ON public.coin_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = coin_ledger.child_id AND c.parent_id = auth.uid()));
DROP POLICY IF EXISTS "parent_select_child_shop" ON public.child_shop;
CREATE POLICY "parent_select_child_shop" ON public.child_shop FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_shop.child_id AND c.parent_id = auth.uid()));

-- תשלום: true אם שולם עכשיו, false אם ה-ref כבר שולם
CREATE OR REPLACE FUNCTION public.award_coins(p_child uuid, p_amount int, p_ref text, p_boxes int DEFAULT 0)
RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF p_amount < 0 OR p_boxes < 0 THEN RETURN false; END IF;
  INSERT INTO coin_ledger (child_id, amount, boxes, ref) VALUES (p_child, p_amount, p_boxes, p_ref)
    ON CONFLICT (child_id, ref) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE children SET coins = COALESCE(coins, 0) + p_amount WHERE id = p_child;
  IF p_boxes > 0 THEN
    INSERT INTO child_shop (child_id, gift_boxes) VALUES (p_child, p_boxes)
      ON CONFLICT (child_id) DO UPDATE SET gift_boxes = child_shop.gift_boxes + EXCLUDED.gift_boxes, updated_at = now();
  END IF;
  RETURN true;
END $$;

-- כניסה ראשונה לחנות: יוצרת שורה ונותנת מטבעות פתיחה (פעם אחת)
CREATE OR REPLACE FUNCTION public.shop_start(p_child uuid, p_coins int)
RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO child_shop (child_id) VALUES (p_child) ON CONFLICT (child_id) DO NOTHING;
  RETURN award_coins(p_child, p_coins, 'start', 0);
END $$;

-- קניית קופסה: 'ok' | 'pending' (יש פריט שמחכה להחלטה) | 'poor' | 'nogift'
CREATE OR REPLACE FUNCTION public.shop_buy(p_child uuid, p_price int, p_item jsonb, p_gift boolean)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_coins int; v_shop child_shop%ROWTYPE;
BEGIN
  IF p_price < 0 THEN RETURN 'poor'; END IF;
  INSERT INTO child_shop (child_id) VALUES (p_child) ON CONFLICT (child_id) DO NOTHING;
  SELECT COALESCE(coins, 0) INTO v_coins FROM children WHERE id = p_child FOR UPDATE;
  SELECT * INTO v_shop FROM child_shop WHERE child_id = p_child FOR UPDATE;
  IF v_shop.pending IS NOT NULL THEN RETURN 'pending'; END IF;
  IF p_gift THEN
    IF v_shop.gift_boxes < 1 THEN RETURN 'nogift'; END IF;
    UPDATE child_shop SET gift_boxes = gift_boxes - 1, pending = p_item, updated_at = now() WHERE child_id = p_child;
    RETURN 'ok';
  END IF;
  IF v_coins < p_price THEN RETURN 'poor'; END IF;
  INSERT INTO coin_ledger (child_id, amount, ref) VALUES (p_child, -p_price, 'buy:' || gen_random_uuid());
  UPDATE children SET coins = v_coins - p_price WHERE id = p_child;
  UPDATE child_shop SET pending = p_item, updated_at = now() WHERE child_id = p_child;
  RETURN 'ok';
END $$;

-- וי / איקס: הפריט נלבש (מחליף את מה שהיה) או נעלם
CREATE OR REPLACE FUNCTION public.shop_decide(p_child uuid, p_take boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_shop child_shop%ROWTYPE;
BEGIN
  SELECT * INTO v_shop FROM child_shop WHERE child_id = p_child FOR UPDATE;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  IF v_shop.pending IS NOT NULL THEN
    IF p_take THEN
      v_shop.look := v_shop.look || jsonb_build_object(v_shop.pending->>'slot', v_shop.pending - 'slot' - 'box');
    END IF;
    UPDATE child_shop SET look = v_shop.look, pending = NULL, updated_at = now() WHERE child_id = p_child;
  END IF;
  RETURN v_shop.look;
END $$;

-- הפונקציות לשרת בלבד
REVOKE EXECUTE ON FUNCTION public.award_coins(uuid, int, text, int), public.shop_start(uuid, int),
  public.shop_buy(uuid, int, jsonb, boolean), public.shop_decide(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins(uuid, int, text, int), public.shop_start(uuid, int),
  public.shop_buy(uuid, int, jsonb, boolean), public.shop_decide(uuid, boolean) TO service_role;

-- הורה מחובר לא יכול לשנות מטבעות ישירות מהדפדפן (שאר השדות כרגיל)
CREATE OR REPLACE FUNCTION public.guard_children_coins()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') THEN NEW.coins := OLD.coins; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_children_coins ON public.children;
CREATE TRIGGER guard_children_coins BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.guard_children_coins();
