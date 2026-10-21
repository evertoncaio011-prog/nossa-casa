# Nossa Casa — controle financeiro doméstico

## Rodar localmente

```sh
npm install
npm run dev
```

Abra http://localhost:3000.

## Configurar login e casa compartilhada

O login usa Supabase Auth com e-mail e senha. Os dados financeiros são armazenados em uma casa compartilhada, protegida por RLS, com limite de dois membros.

1. Crie um projeto no Supabase.
2. No **SQL Editor** do projeto, execute todo o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
3. Em **Project Settings → API**, copie a Project URL e a chave publicável (`anon`/`publishable`).
4. Crie `.env.local` na raiz a partir de `.env.example` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Em **Authentication → URL Configuration**, configure `http://localhost:3000` como Site URL e adicione `http://localhost:3000/**` às Redirect URLs. Para produção, adicione também `https://nossa-casa-steel.vercel.app/**`.
6. Reinicie `npm run dev`. Crie a primeira conta e a casa compartilhada. Para adicionar a segunda pessoa, gere um convite em **Configurações** e envie o link. A pessoa precisa criar/usar uma conta com o mesmo e-mail convidado.
7. Para produção, configure as mesmas variáveis em **Vercel → Project → Settings → Environment Variables** e faça um novo deploy.

O Supabase pode exigir que a pessoa confirme o e-mail antes do primeiro login. O convite dura sete dias e só pode ser aceito com o endereço convidado; o app gera o link, mas ele deve ser enviado manualmente.

Ao criar a casa, é possível importar os dados salvos no navegador atual; exemplos fictícios são excluídos. Depois disso, as alterações são sincronizadas entre os dois membros em tempo real. Se ambos alterarem a casa simultaneamente, o app recusa uma gravação desatualizada e pede para atualizar a página, evitando sobrescrever silenciosamente a versão mais recente.

Sem as variáveis do Supabase, o app permanece no modo local deste navegador e não oferece login compartilhado.

## Deploy na Vercel

O projeto está conectado ao GitHub e pode ser publicado pela integração da Vercel. Configure as variáveis do Supabase no projeto para habilitar login e sincronização em produção.
