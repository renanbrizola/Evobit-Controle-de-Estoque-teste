# 02-Data Model

## Banco de Dados Local (RxDB)
O banco de dados local é a fonte primária de verdade para a interface.

### Schemas Principais
Definidos em `src/db/schema.js`. O schema é **estrito** (additionalProperties: false).

#### `products`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID | Chave primária (v4). |
| `name` | String | Nome do produto. |
| `current_stock` | Number | Saldo atual (Cálculo acumulativo). |
| `cost_price` | Float | Preço de custo (última entrada). |
| `price` | Float | Preço de venda. |

#### `movements` (Imutável)
Registro histórico de auditabilidade. Não deve ser editado após criado.
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID | PK. |
| `type` | Enum | `IN` (Entrada), `OUT` (Saída), `ADJUSTMENT` (Ajuste). |
| `quantity` | Number | Quantidade movimentada (Sempre positivo). |
| `user_id` | UUID | ID do usuário que realizou a ação (**Obrigatório**). |

> **Atenção**: O campo no banco é `quantity`. O frontend as vezes usa `qty` em formulários temporários, mas deve sempre converter para `quantity` ao salvar.

## Padrões de Dados

### IDs
- Todos os IDs são **UUID v4** gerados no cliente (`uuidv4()`).
- Isso evita conflitos de ID ao criar registros offline em múltiplos dispositivos.

### Timestamps
- Use `ISO 8601` Strings para datas.
- Exemplo: `new Date().toISOString()` -> `2024-02-14T15:30:00.000Z`.
- O banco usa `updated_at` para resolução de conflitos (Last Write Wins).

### Dinheiro (Monetary Values)
- **Tipo**: `Float` (Javascript Number).
- **Armazenamento**: Armazena o valor decimal (ex: `12.50`).
- **Input**: O input de máscara converte centavos para visualização, mas salva float.
- **Arredondamento**: Cuidado com operações de ponto flutuante. Use `toFixed(2)` para exibição apenas.

## Banco de Dados Remoto (Supabase)
O Supabase atua como espelho para backup e sincronização.
- Tabelas PostgreSQL espelham 1:1 as collections do RxDB.
- **RLS (Row Level Security)**:
    - Políticas garantem que usuários só acessem dados da sua `business_id` (tenant).
    - É crucial enviar `user_id` nas transações para auditoria.
