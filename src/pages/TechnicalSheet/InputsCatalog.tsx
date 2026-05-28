import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { formatBRL } from '../../modules/ficha-tecnica/utils/index';
import { ActionButton, StatusMessage } from '../../modules/ficha-tecnica/components/management-primitives';
import { SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { api } from '../../services/api';

export default function InputCatalogPage() {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<any[]>([]);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch raw materials and packaging from Evobit DB
      const response = await api.products.list({ limit: 1000 });
      const allProducts = Array.isArray(response) ? response : (response.items || []);
      const rawMaterials = allProducts.filter(
        (p: any) => Boolean(p.is_raw_material) || p.category?.toLowerCase() === 'embalagens'
      );
      
      // 2. Fetch providers to map provider_id to name
      const allProviders = await api.providers.list();
      const providerMap: Record<string, string> = {};
      allProviders.forEach((prov: any) => {
        providerMap[prov.id] = prov.name;
      });

      setInputs(rawMaterials);
      setProviders(providerMap);
    } catch (err: any) {
      setMessage({ tone: 'error', text: err.message || 'Erro ao carregar insumos do banco de dados.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = inputs.filter((row) =>
    !search || row.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {message && <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} />}

      <SheetBlock title="Catálogo de insumos · Banco de Dados Real">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">
              {inputs.length} {inputs.length === 1 ? 'insumo cadastrado' : 'insumos cadastrados'}
            </p>
            {inputs.length > 0 && (
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por nome..."
                className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/15"
              />
            )}
          </div>
          <ActionButton onClick={() => navigate('/app/produtos')} className="gap-1.5">
            <Package size={13} />
            Gerenciar no Estoque
          </ActionButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="text-sm text-gray-400">Carregando insumos reais do banco...</span>
          </div>
        ) : inputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Package size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Nenhum insumo cadastrado</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Para o módulo de Ficha Técnica funcionar, você precisa cadastrar os ingredientes no módulo de Produtos marcando a opção "Matéria-prima".
            </p>
            <button onClick={() => navigate('/app/produtos')} className="mt-4 text-sm font-semibold text-[#C9A84C] hover:underline">
              Ir para o módulo de Produtos
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Nome', 'Tipo', 'Unidade', 'Preço unitário', 'Estoque atual', 'Fornecedor', ''].map((h, i) => (
                    <th
                      key={h + i}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                        h === 'Preço unitário' || h === 'Estoque atual' || h === '' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      Nenhum insumo encontrado para "{search}".
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const price = Number(row.cost_price || row.average_cost || row.price || 0);
                    const stock = Number(row.current_stock || 0);
                    const providerName = row.provider_id ? (providers[row.provider_id] || 'Fornecedor Desconhecido') : '—';
                    const isPackage = row.category?.toLowerCase() === 'embalagens';

                    return (
                      <tr key={row.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {isPackage ? 'Embalagem' : 'Insumo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{row.unit || 'UN'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatBRL(price)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {stock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{providerName}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate('/app/produtos')}
                            title="Editar no Estoque"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Package size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </SheetBlock>
    </div>
  );
}
