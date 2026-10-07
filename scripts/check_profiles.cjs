const { createClient } = require("@supabase/supabase-js");

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function check() {
  const { data, error } = await supabase.from("profiles").select("*").limit(10);
  console.log("Profiles:", data, "Error:", error);
}

check();
