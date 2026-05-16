const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function saveReport(data) {
  const { error } = await supabase
    .from("reports")
    .insert([data]);

  if (error) {
    console.log(error);
  }
}

module.exports = saveReport;