import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DEFAULT_PAGE_SIZE = 15;

/**
 * Paginação client-side para tabelas: no máximo `pageSize` itens por página,
 * com "Mostrar mais" (estende a página atual) e navegação anterior/próxima.
 * Reseta para a primeira página quando a lista filtrada muda de tamanho.
 */
export function usePagination(items, pageSize = DEFAULT_PAGE_SIZE) {
    const [page, setPage] = useState(1);
    const [extra, setExtra] = useState(0);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    useEffect(() => {
        setPage(1);
        setExtra(0);
    }, [total]);

    const start = (safePage - 1) * pageSize;
    const end = Math.min(total, start + pageSize + extra);
    const pageItems = useMemo(() => items.slice(start, end), [items, start, end]);

    return {
        pageItems,
        page: safePage,
        totalPages,
        total,
        start,
        end,
        canShowMore: end < total,
        showMore: () => setExtra((current) => current + pageSize),
        next: () => { setExtra(0); setPage((current) => Math.min(current + 1, totalPages)); },
        prev: () => { setExtra(0); setPage((current) => Math.max(current - 1, 1)); },
    };
}

/** Barra de controles: renderize logo abaixo da tabela paginada. */
export function PaginationBar({ pagination, className = '' }) {
    const { page, totalPages, total, start, end, canShowMore, showMore, next, prev } = pagination;

    if (total <= 0) return null;

    return (
        <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 text-sm ${className}`}>
            <p className="text-xs text-[var(--text-muted)]">
                Mostrando {total === 0 ? 0 : start + 1}–{end} de {total}
            </p>
            <div className="flex items-center gap-2">
                {canShowMore ? (
                    <button
                        type="button"
                        onClick={showMore}
                        className="border border-[var(--line-soft)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-strong)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]"
                    >
                        Mostrar mais
                    </button>
                ) : null}
                {totalPages > 1 ? (
                    <>
                        <button
                            type="button"
                            onClick={prev}
                            disabled={page <= 1}
                            title="Página anterior"
                            className="border border-[var(--line-soft)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <span className="text-xs font-medium text-[var(--text-muted)]">
                            página {page} de {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={next}
                            disabled={page >= totalPages}
                            title="Próxima página"
                            className="border border-[var(--line-soft)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
