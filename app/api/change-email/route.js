import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  //   const { userId, email, password } = await req.json();

  //   const { data, error } = await supabase.auth.admin.updateUserById(
  //     "7ee80c0f-782b-4eda-aa96-9a5eed05bddd",
  //     { password: "qazcor-runfo1-ceNqyx" }
  //   );

  //   const { data, error } = await supabase.auth.admin.createUser({
  //     id: "908b0fd3-5af5-43e2-82d1-11a0e3e5a893",
  //     email: "sabatino.de.rosa@icloud.com",
  //     password: "qazcor-runfo1-ceNqyx",
  //     email_confirm: true,
  //   });

  //   if (error) {
  //     return NextResponse.json({ error: error.message }, { status: 400 });
  //   }
  //   console.log(error);
  return NextResponse.json({ status: 200 });
}
