
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://blbggyfditgdjzruchyc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmdneWZkaXRnZGp6cnVjaHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTY5MDEsImV4cCI6MjA4MzUzMjkwMX0.O9LdxAJ_kzQXcnrvoN5m6fRTuPBhBCBtXbbU6B84MYI';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
