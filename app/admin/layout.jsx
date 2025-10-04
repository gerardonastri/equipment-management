import { createClient } from "@/lib/supabase/server";
import AdminClientProvider from "@/components/admin-client-provider";

export default async function AdminLayout({ children }) {
  // Permetti accesso alla pagina di login
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  console.log("--------SESSIONE ADMIN LAYOUT--------");
  console.log(session);

  // Se non c'è sessione, il middleware gestirà il redirect
  if (!session) {
    return children;
  }

  // Carica dati utente dal server
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return (
    <AdminClientProvider initialUser={userData}>{children}</AdminClientProvider>
  );
}
