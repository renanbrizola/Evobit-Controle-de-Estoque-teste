# 03-Sync & Offline

## Estratégia Offline-First
O Evobit Desktop assume que a conexão de internet é instável ou inexistente.
- **Leitura**: Sempre lê do **RxDB** (banco local).
- **Escrita**: Sempre escreve no **RxDB** primeiro.
- **Background**: O script de sincronização (`src/db/sync.js`) tenta replicar as mudanças para o Supabase.

## Sincronização (Sync)
A sincronização é **Bidirecional** e ocorre em background a cada 60 segundos (configurável) ou ao iniciar a aplicação.

### 1. Push (Local -> Remoto)
- O RxDB monitora mudanças nas coleções locais.
- Quando detecta uma mudança, envia para a API REST/GraphQL do Supabase.
- **Idempotência**: O servidor usa `UPSERT`. Se o registro já existe (mesmo ID), ele atualiza.

### 2. Pull (Remoto -> Local)
- O cliente pede "mudanças desde o último checkpoint".
- O Supabase retorna registros onde `updated_at > last_pull_checkpoint`.
- O cliente aplica as mudanças no RxDB.

## Conflitos & Resolução
A estratégia adotada é **Last Write Wins (LWW)** baseada no campo `updated_at`.
- Se dois dispositivos alteram o mesmo produto offline:
  - Dispositivo A altera preço às 14:00.
  - Dispositivo B altera preço às 14:05.
  - Quando ambos sincronizarem, a alteração de 14:05 prevalecerá, pois `updated_at` é maior.

> **Importante**: Para minimizar conflitos, entidades transacionais como `Movements` e `Sales` devem ser tratadas como **Append-Only** (apenas criação, sem edição). Edição é permitida apenas em cadastros (Produtos, Clientes).
