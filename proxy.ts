import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Renueva la sesión de Supabase en cada petición y manda al login a quien no la tenga.
// Es solo una comprobación optimista: los datos los protege RLS en la base de datos.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const ruta = request.nextUrl.pathname;
  if (ruta.startsWith("/auth/")) return respuesta; // enlace del email: lo resuelve la propia ruta
  if (ruta === "/api/despertar") return respuesta; // aviso diario de Vercel, sin sesión
  const publica = ruta.startsWith("/login");

  if (!data?.claims && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (data?.claims && publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/hoy";
    return NextResponse.redirect(url);
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
