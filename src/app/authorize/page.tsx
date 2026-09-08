import { EVENT } from "@/config/form";
import { LoginForm } from "@/components/dashboard/login-form";

export const metadata = { title: "Masuk", robots: { index: false, follow: false } };

export default function AuthorizePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{EVENT.org}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Masuk ke dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Halaman internal panitia.</p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
