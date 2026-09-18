const { createClient } = require("@supabase/supabase-js");

const url = "https://gksyoebjuokkbekxxhtu.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrc3lvZWJqdW9ra2Jla3h4aHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NjQ2NDMsImV4cCI6MjEwMzM0MDY0M30.NtGybajKXP6fmicMoqac9JKLGjDRU5b3BsONmNMs6eU";

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
