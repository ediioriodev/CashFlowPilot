
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  }
})

// Capture the PASSWORD_RECOVERY event at module level so it is not missed
// when the Supabase client processes the URL hash before React mounts.
let _recoveryPending = false;

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    _recoveryPending = true;
  }
});

/** Returns true (and clears the flag) if a PASSWORD_RECOVERY event was captured. */
export const consumeRecoveryPending = (): boolean => {
  const val = _recoveryPending;
  _recoveryPending = false;
  return val;
};
