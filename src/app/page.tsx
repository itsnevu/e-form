import { EVENT } from "@/config/form";
import { FormClient } from "@/components/public/form-client";

export const metadata = { title: EVENT.title, description: EVENT.description };

export default function Home() {
  return (
    <main className="mx-auto min-h-svh max-w-2xl px-6 py-16 sm:py-24">
      <header className="mb-12">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{EVENT.org}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{EVENT.title}</h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">{EVENT.description}</p>
      </header>

      <FormClient />

      <footer className="mt-16 border-t pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {EVENT.org}
      </footer>
    </main>
  );
}
