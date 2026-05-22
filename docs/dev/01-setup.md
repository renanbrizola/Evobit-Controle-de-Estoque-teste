# 01-Setup

## Requisitos
- Node.js 18+
- npm 9+

## Instalação
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```

## Variáveis de Ambiente
O projeto utiliza Vite, portanto as variáveis devem começar com `VITE_`.
Configure o arquivo `.env.local` na raiz do projeto (não comite este arquivo):

```env
# Supabase Configuration
VITE_SUPABASE_URL=seudominio.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_publica
```

> **Nota**: O arquivo `.env.example` contém o template seguro para commit.

## Scripts
Os principais comandos disponíveis no `package.json`:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia servidor de desenvolvimento (Vite) na porta 5173. |
| `npm run build` | Gera build de produção na pasta `dist/`. |
| `npm run preview` | Serve o build de produção localmente para teste. |
| `npm run lint` | Executa verificação de código (ESLint). |
| `npm run electron:dev` | Inicia em modo desktop (experimental). |

## Rodando o Projeto
Para iniciar o desenvolvimento Web/PWA (recomendado):
```bash
npm run dev
```
Acesse `http://localhost:5173`.
