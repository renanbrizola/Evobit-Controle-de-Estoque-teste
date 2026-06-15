import { useEffect, useMemo, useState } from 'react';
import { formatBRL } from '../../modules/ficha-tecnica/utils';
import { ActionButton, ConfirmDialog, Field, SelectInput, StatusMessage, TextInput } from '../../modules/ficha-tecnica/components/management-primitives';
import { HighlightCard, SheetBlock } from '../../modules/ficha-tecnica/components/page-primitives';
import { getApiErrorMessage } from '../../modules/ficha-tecnica/lib/api-errors';
import { listPrices, type PriceRow } from '../../modules/ficha-tecnica/lib/pricing-management-api';
import { addPromotionItem, createPromotion, deletePromotionItem, listPromotions, publishPromotion, updatePromotion, updatePromotionItem, type PromotionRow } from '../../modules/ficha-tecnica/lib/promotions-management-api';
import { getToneClassName } from '../../modules/ficha-tecnica/mock/technical-sheet-data';
import { useAuthStore } from '../../modules/ficha-tecnica/mock/auth.store';

const emptyPromotionForm = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
};

const emptyItemForm = {
  priceId: '',
  discountPercent: 10,
};

export default function PromotionsPage() {
  const isDemoSession = useAuthStore((state) => state.isDemoSession);
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState('');
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isDemoSession);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (isDemoSession) {
      setLoading(false);
      return;
    }
    void bootstrap();
    // bootstrap is a stable loader recreated each render; running it once per
    // session change is intentional (avoids re-bootstrap loops).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoSession]);

  const selectedPromotion = useMemo(
    () => promotions.find((promotion) => promotion.id === selectedPromotionId) ?? null,
    [promotions, selectedPromotionId],
  );

  const viableItems = prices.filter((price) => price.status === 'APPROVED' || price.status === 'ACTIVE');

  async function bootstrap(preferredPromotionId?: string) {
    try {
      setLoading(true);
      const [promotionRows, priceRows] = await Promise.all([listPromotions(), listPrices()]);
      setPromotions(promotionRows);
      setPrices(priceRows);
      const nextSelectedPromotionId =
        preferredPromotionId && promotionRows.some((promotion) => promotion.id === preferredPromotionId)
          ? preferredPromotionId
          : promotionRows[0]?.id ?? '';
      setSelectedPromotionId(nextSelectedPromotionId);
      if (editingPromotionId) {
        const found = promotionRows.find((p) => p.id === editingPromotionId);
        if (!found) { setEditingPromotionId(null); setPromotionForm(emptyPromotionForm); }
      }
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível carregar as promoções.') });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePromotion() {
    try {
      setLoading(true);
      const promotion = editingPromotionId
        ? await updatePromotion(editingPromotionId, promotionForm)
        : await createPromotion(promotionForm);
      setPromotionForm(emptyPromotionForm);
      setEditingPromotionId(null);
      await bootstrap(promotion.id);
      setMessage({ tone: 'success', text: editingPromotionId ? 'Promoção atualizada com sucesso.' : 'Promoção criada com sucesso.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar a promoção.') });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    if (!selectedPromotionId) return;
    try {
      setLoading(true);
      if (editingItemId) {
        await updatePromotionItem(selectedPromotionId, editingItemId, itemForm);
      } else {
        await addPromotionItem(selectedPromotionId, itemForm);
      }
      setItemForm(emptyItemForm);
      setEditingItemId(null);
      await bootstrap(selectedPromotionId);
      setMessage({ tone: 'success', text: editingItemId ? 'Item atualizado com sucesso.' : 'Item adicionado com sucesso.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível salvar o item.') });
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteItem(itemId: string) {
    if (!selectedPromotionId) return;
    const promotionId = selectedPromotionId;
    setPendingConfirm({
      message: 'Deseja remover este item da campanha?',
      onConfirm: async () => {
        try {
          setLoading(true);
          await deletePromotionItem(promotionId, itemId);
          if (editingItemId === itemId) { setEditingItemId(null); setItemForm(emptyItemForm); }
          await bootstrap(promotionId);
          setMessage({ tone: 'success', text: 'Item removido com sucesso.' });
        } catch (error) {
          setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível remover o item.') });
        } finally {
          setLoading(false);
        }
      },
    });
  }

  async function handlePublish(id: string) {
    try {
      setLoading(true);
      await publishPromotion(id);
      await bootstrap(id);
      setMessage({ tone: 'success', text: 'Promoção publicada com sucesso.' });
    } catch (error) {
      setMessage({ tone: 'error', text: getApiErrorMessage(error, 'Não foi possível publicar a promoção.') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {pendingConfirm ? (
        <ConfirmDialog
          message={pendingConfirm.message}
          onConfirm={() => { void (pendingConfirm.onConfirm as () => Promise<void>)(); setPendingConfirm(null); }}
          onCancel={() => setPendingConfirm(null)}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <HighlightCard label="Promoções cadastradas" value={String(promotions.length)} toneClassName={getToneClassName('pink')} />
        <HighlightCard label="Preços aptos" value={String(viableItems.length)} toneClassName={getToneClassName('lime')} />
        <HighlightCard label="Publicadas" value={String(promotions.filter((p) => p.status === 'PUBLISHED').length)} toneClassName={getToneClassName('amber')} />
      </div>

      {isDemoSession ? <StatusMessage tone="error" message="Entre com a API para criar campanhas e publicar promoções reais." /> : null}
      {message ? <StatusMessage tone={message.tone} message={message.text} onDismiss={() => setMessage(null)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SheetBlock title="Nova promoção">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome">
                <TextInput value={promotionForm.name} onChange={(event) => setPromotionForm((current) => ({ ...current, name: event.target.value }))} disabled={loading || isDemoSession} />
              </Field>
              <Field label="Descrição">
                <TextInput value={promotionForm.description} onChange={(event) => setPromotionForm((current) => ({ ...current, description: event.target.value }))} disabled={loading || isDemoSession} />
              </Field>
              <Field label="Início">
                <TextInput type="date" value={promotionForm.startDate} onChange={(event) => setPromotionForm((current) => ({ ...current, startDate: event.target.value }))} disabled={loading || isDemoSession} />
              </Field>
              <Field label="Fim">
                <TextInput type="date" value={promotionForm.endDate} onChange={(event) => setPromotionForm((current) => ({ ...current, endDate: event.target.value }))} disabled={loading || isDemoSession} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={() => void handleCreatePromotion()} disabled={loading || isDemoSession || !promotionForm.name || !promotionForm.startDate || !promotionForm.endDate}>
                {editingPromotionId ? 'Atualizar promoção' : 'Criar promoção'}
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => { setEditingPromotionId(null); setPromotionForm(emptyPromotionForm); }} disabled={loading}>
                Limpar
              </ActionButton>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
              <p className="text-sm text-gray-500">
                Monte a campanha em rascunho, adicione os itens elegíveis e publique somente quando o preço promocional ainda respeitar a estratégia da casa.
              </p>
            </div>
          </div>
        </SheetBlock>

        <SheetBlock title="Campanhas">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Promoção', 'Período', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className={`border-b border-gray-100 transition-colors last:border-0 ${promotion.id === selectedPromotionId ? 'bg-amber-50/60' : 'hover:bg-gray-50/60'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{promotion.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(promotion.startDate).toLocaleDateString('pt-BR')} – {new Date(promotion.endDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        promotion.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>
                        {promotion.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton tone="secondary" className="px-3 py-1.5 text-xs" onClick={() => { setSelectedPromotionId(promotion.id); setEditingItemId(null); setItemForm(emptyItemForm); }} disabled={loading}>
                          Selecionar
                        </ActionButton>
                        <ActionButton
                          tone="secondary"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => {
                            setEditingPromotionId(promotion.id);
                            setSelectedPromotionId(promotion.id);
                            setPromotionForm({
                              name: promotion.name,
                              description: promotion.description ?? '',
                              startDate: new Date(promotion.startDate).toISOString().slice(0, 10),
                              endDate: new Date(promotion.endDate).toISOString().slice(0, 10),
                            });
                          }}
                          disabled={loading || isDemoSession}
                        >
                          Editar
                        </ActionButton>
                        <ActionButton className="px-3 py-1.5 text-xs" onClick={() => void handlePublish(promotion.id)} disabled={loading || isDemoSession || promotion.status === 'PUBLISHED'}>
                          Publicar
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!promotions.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                      Nenhuma promoção cadastrada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SheetBlock>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SheetBlock title="Adicionar item promocional">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Campanha">
                <SelectInput value={selectedPromotionId} onChange={(event) => { setSelectedPromotionId(event.target.value); setEditingItemId(null); setItemForm(emptyItemForm); }} disabled={loading || isDemoSession}>
                  <option value="">Selecione</option>
                  {promotions.map((promotion) => (
                    <option key={promotion.id} value={promotion.id}>{promotion.name}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Preço">
                <SelectInput value={itemForm.priceId} onChange={(event) => setItemForm((current) => ({ ...current, priceId: event.target.value }))} disabled={loading || isDemoSession}>
                  <option value="">Selecione</option>
                  {viableItems.map((price) => (
                    <option key={price.id} value={price.id}>
                      {price.recipe.name} · {formatBRL(Number(price.finalPrice ?? price.suggestedPrice))}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Desconto %">
                <TextInput type="number" step="0.01" value={itemForm.discountPercent} onChange={(event) => setItemForm((current) => ({ ...current, discountPercent: Number(event.target.value) }))} disabled={loading || isDemoSession} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton onClick={() => void handleAddItem()} disabled={loading || isDemoSession || !selectedPromotionId || !itemForm.priceId}>
                {editingItemId ? 'Atualizar item' : 'Adicionar item'}
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => { setEditingItemId(null); setItemForm(emptyItemForm); }} disabled={loading}>
                Limpar
              </ActionButton>
            </div>
          </div>
        </SheetBlock>

        <SheetBlock title={`Itens da campanha${selectedPromotion ? `: ${selectedPromotion.name}` : ''}`}>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Produto', 'Preço base', 'Desconto', 'Preço promocional', 'Ações'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedPromotion?.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.price.recipe.name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatBRL(Number(item.price.finalPrice ?? item.price.suggestedPrice))}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(item.discountPercent).toFixed(2).replace('.', ',')}%</td>
                    <td className="px-4 py-3 font-semibold text-[#C9A84C]">{formatBRL(Number(item.promotionalPrice))}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <ActionButton
                          tone="secondary"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setItemForm({ priceId: item.price.id, discountPercent: Number(item.discountPercent) });
                          }}
                        >
                          Editar
                        </ActionButton>
                        <ActionButton tone="danger" className="px-3 py-1.5 text-xs" onClick={() => void handleDeleteItem(item.id)} disabled={loading || isDemoSession}>
                          Excluir
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {!selectedPromotion?.items.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      {selectedPromotion ? 'Nenhum item adicionado a esta campanha.' : 'Selecione uma campanha para ver os itens.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SheetBlock>
      </div>
    </div>
  );
}
