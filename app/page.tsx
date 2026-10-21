import Script from "next/script";

// Shell do app. A lógica atual está em public/app.js (armazenamento local).
// Próximo passo: migrar cada tela para componentes React e trocar load/save por Supabase.
export default function Page() {
  return (
    <>
      <nav id="nav" />
      <main id="app" />
      <div id="md" />
      <Script
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/app.js`}
        strategy="afterInteractive"
      />
    </>
  );
}
