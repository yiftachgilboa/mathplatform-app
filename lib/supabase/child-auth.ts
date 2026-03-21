import { createClient } from '@/lib/supabase/client';

export async function childLogin(name: string, accessCode: string) {
  const supabase = createClient();

  // שלב 1: מצא את ה-parent לפי access_code
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('access_code', accessCode)
    .single();

  if (profileError || !profile) return { error: 'קוד משפחה לא נכון' };

  // שלב 2: מצא את הילד לפי שם + parent_id
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, name, grade, avatar, parent_id')
    .eq('name', name)
    .eq('parent_id', profile.id)
    .single();

  if (childError || !child) return { error: 'שם ילד לא נמצא' };

  sessionStorage.setItem('child', JSON.stringify(child));
  return { data: child };
}
