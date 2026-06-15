/**
 * Status Helper — centralizes status display logic across the app.
 * All services now output UPPERCASE status values (COMPLETED, PENDING, etc.)
 * but legacy data may still have lowercase. This helper normalizes everything.
 */

// Status config: map of normalized (uppercase) status → display info
const STATUS_CONFIG = {
    // Sale / Order / Purchase statuses
    DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400', icon: '📝' },
    OPEN: { label: 'Aberto', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '📂' },
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '⏳' },
    APPROVED: { label: 'Aprovado', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', icon: '✅' },
    BILLED: { label: 'Faturado', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '🧾' },
    COMPLETED: { label: 'Concluído', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✔️' },
    CANCELED: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '❌' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '❌' },

    // Financial statuses
    PAID: { label: 'Pago', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '💰' },
    PARTIAL: { label: 'Parcial', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '💸' },
    OVERDUE: { label: 'Vencido', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '⚠️' },

    // Fiscal statuses
    EMITTED: { label: 'Emitida', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '📄' },
    ERROR: { label: 'Erro', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '🚫' },

    // Delivery
    WAITING_DELIVERY: { label: 'Aguardando Entrega', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '🚚' },
};

/**
 * Get display info for a status value (case-insensitive).
 * @param {string} status - The status value (e.g., 'COMPLETED', 'completed', 'pending')
 * @returns {{ label: string, color: string, icon: string }}
 */
export const getStatusInfo = (status) => {
    if (!status) return { label: '—', color: 'bg-gray-100 text-gray-500', icon: '—' };
    const normalized = status.toUpperCase();
    return STATUS_CONFIG[normalized] || { label: status, color: 'bg-gray-100 text-gray-500', icon: '❓' };
};

/**
 * Get just the label for a status.
 * @param {string} status
 * @returns {string}
 */
export const getStatusLabel = (status) => getStatusInfo(status).label;

/**
 * Get the CSS class for a status badge.
 * @param {string} status
 * @returns {string}
 */
export const getStatusColor = (status) => getStatusInfo(status).color;

/**
 * Normalize a status value to uppercase.
 * @param {string} status
 * @returns {string}
 */
export const normalizeStatus = (status) => {
    if (!status) return '';
    return status.toUpperCase();
};
