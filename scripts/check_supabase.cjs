const { createClient } = require("@supabase/supabase-js");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function test() {
  const email = "testuser_dev1@custodian.app";
  const password = "Password123!";

  console.log("Trying login...");
  const loginRes = await supabase.auth.signInWithPassword({ email, password });
  if (loginRes.error) {
    console.log("Login error:", loginRes.error.message);
    console.log("Trying signup...");
    const signRes = await supabase.auth.signUp({ email, password });
    if (signRes.error) {
      console.log("Signup error:", signRes.error.message);
    } else {
      console.log("Signup success:", signRes.data.user?.id, "session:", !!signRes.data.session);
    }
  } else {
    console.log("Login success! User ID:", loginRes.data.user?.id);
  }
}

test();
