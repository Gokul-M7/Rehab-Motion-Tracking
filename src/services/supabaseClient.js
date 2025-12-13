import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const saveSession = async (sessionData) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving session:', error);
    return { success: false, error };
  }
};

export const getSessions = async (userId = 'demo-user') => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return { success: false, error };
  }
};