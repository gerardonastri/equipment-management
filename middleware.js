import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Permetti accesso alla pagina di login
    if (request.nextUrl.pathname === "/admin/login") {
      return response;
    }

    console.log(
      "[v0] Middleware: Checking admin access for path:",
      request.nextUrl.pathname
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("[v0] Middleware: User from auth:", user?.id, "Error:", error);

    if (error || !user || !user.id) {
      console.log("[v0] Middleware: No valid user found, redirecting to login");
      // return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Verifica ruolo amministratore
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("ruolo")
      .eq("id", user.id)
      .single();

    console.log(
      "[v0] Middleware: User data from DB:",
      userData,
      "Error:",
      userError
    );
    console.log("[v0] Middleware: User role:", userData?.ruolo);

    if (userError || !userData || userData.ruolo !== "amministratore") {
      console.log(
        "[v0] Middleware: User is not admin or error occurred, signing out and redirecting"
      );
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    console.log("[v0] Middleware: User is admin, allowing access");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
