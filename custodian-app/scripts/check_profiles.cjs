const { createClient } = require("@supabase/supabase-js");

const url = "https://gksyoebjuokkbekxxhtu.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrc3lvZWJqdW9ra2Jla3h4aHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NjQ2NDMsImV4cCI6MjEwMzM0MDY0M30.NtGybajKXP6fmicMoqac9JKLGjDRU5b3BsONmNMs6eU";

const supabase = createClient(url, anonKey);

async function check() {
  const { data, error } = await supabase.from("profiles").select("*").limit(10);
  console.log("Profiles:", data, "Error:", error);
}

check();
