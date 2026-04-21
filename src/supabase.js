import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bbbrmuhfcuidzhqipaxk.supabase.co';
const supabaseKey = 'sb_publishable_UDjAKwddtQgS6u8VryqCLg_QMWTk46U';

export const supabase = createClient(supabaseUrl, supabaseKey);
