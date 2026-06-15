# 06-Gotchas & Implementation Details

Armadilhas conhecidas e detalhes de implementação que você deve saber.

## 1. `qty` vs `quantity`
Existe uma inconsistência histórica entre UI e Banco de Dados.
- **UI (Forms/Cards)**: Muitas vezes usa a prop `qty` para inputs de quantidade.
- **Banco de Dados / API**: O Schema exige estritamente `quantity`.
- **Regra**: Sempre mapeie `item.qty` para `item.quantity` antes de enviar para qualquer função de `api.js` ou salvar no banco.
  ```javascript
  // CORRETO
  const payload = {
    ...item,
    quantity: item.qty || item.quantity // Garante o valor correto
  };
  ```

## 2. Enums de Tipo (`type`)
Os valores exibidos na tela são diferentes dos valores salvos no banco.

| Contexto | Valores |
| :--- | :--- |
| **UI (Ptb-BR)** | "Entrada", "Saída", "Ajuste" |
| **Banco (EN)** | `IN`, `OUT`, `ADJUSTMENT` |

- **Regra**: A camada de serviço (`src/services/api.js`) deve fazer essa conversão. Nunca salve "Entrada" no campo `type` do banco.

## 3. `user_id` é Obrigatório
O Supabase RLS (Row Level Security) bloqueia inserções sem `user_id` vinculado ao tenant (empresa).
- **Problema**: Se você não enviar `user_id`, a inserção pode falhar silenciosamente ou o sync rejeitará.
- **Solução**: Sempre pegue o usuário do contexto:
  ```javascript
  const { user } = useAuth();
  const payload = { ..., user_id: user.id };
  ```

## 4. Floats e Arredondamento
O sistema armazena valores monetários como `Float`.
- **Problema**: `0.1 + 0.2 !== 0.3`.
- **Solução**: Para exibição, sempre formatar: `value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Futuro**: Migrar para `Int` (centavos) para maior precisão contábil.
