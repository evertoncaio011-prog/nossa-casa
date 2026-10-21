# Nossa Casa – controle financeiro doméstico (Next.js)

## Rodar
    npm install
    npm run dev        # http://localhost:3000

## Publicar no GitHub Pages
1. Envie este projeto para um repositório GitHub na branch `main`.
2. No repositório, abra **Settings → Pages** e escolha **GitHub Actions** como fonte.
3. Cada push na branch `main` publica o site automaticamente. Também é possível iniciar a publicação em **Actions → Deploy to GitHub Pages → Run workflow**.

O workflow cria uma exportação estática do Next.js e configura automaticamente o caminho do site para repositórios de projeto e repositórios `usuario.github.io`. O app salva os dados no `localStorage` do navegador; a publicação não sincroniza dados entre usuários ou dispositivos.

## Deploy na Vercel
Suba a pasta para um repositório no GitHub, importe na Vercel (detecta Next.js sozinha). Sem variáveis de ambiente por enquanto.

## Dados
Hoje ficam no localStorage do navegador (`public/app.js`, funções `load`/`save`).

## Conta compartilhada (2 usuários)
`supabase/schema.sql` já traz tabelas, limite de 2 membros, RLS e Realtime. Falta ligar o app: criar projeto no Supabase, rodar o SQL, preencher `.env.local` (veja `.env.example`) e trocar `load`/`save` por chamadas ao Supabase + telas de login/convite.
