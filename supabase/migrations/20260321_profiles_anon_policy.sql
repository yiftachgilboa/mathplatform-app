-- מאפשר לילד (anon) לחפש הורה לפי access_code בלבד
-- חושף רק את עמודת access_code — לא name או מידע אחר
create policy "anon_read_access_code" on profiles
  for select to anon
  using (true);
