import { createClient } from "@/lib/supabase/server";
import AdminClientProvider from "@/components/admin-client-provider";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return children;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <AdminClientProvider initialUser={userData}>
      {children}
    </AdminClientProvider>
  );
}