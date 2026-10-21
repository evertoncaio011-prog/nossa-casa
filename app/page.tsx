"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect } from "react";

// O app legado continua em public/app.js; o cliente Supabase é inicializado no navegador.
declare global {
  interface Window {
    casaSupabase?: SupabaseClient;
  }
}

export default function Page() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key && !window.casaSupabase) {
      window.casaSupabase = createClient(url, key);
    }

    if (!document.querySelector("script[data-casa-app]")) {
      const script = document.createElement("script");
      script.src = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/app.js`;
      script.async = true;
      script.dataset.casaApp = "true";
      script.onerror = () => {
        document.querySelector("#app")!.textContent =
          "Não foi possível carregar o aplicativo. Atualize a página para tentar novamente.";
      };
      document.body.appendChild(script);
    }
  }, []);

  return (
    <>
      <nav id="nav" />
      <main id="app" />
      <div id="md" />
    </>
  );
}
