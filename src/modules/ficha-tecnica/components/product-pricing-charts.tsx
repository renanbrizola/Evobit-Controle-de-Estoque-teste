

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartSlice {
  name: string;
  value: number;
  color: string;
}

interface ProductPricingChartsProps {
  marginVsCost: ChartSlice[];
  general: ChartSlice[];
  difference: ChartSlice[];
  equilibrium: ChartSlice[];
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_16px_40px_rgba(16,34,71,0.08)]">
      <h3 className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      <div className="h-[250px]">{children}</div>
    </div>
  );
}

function CurrencyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartSlice }> }) {
  if (!active || !payload?.length) return null;

  const slice = payload[0]?.payload;
  if (!slice) return null;

  return (
    <div className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{slice.name}</p>
      <p className="mt-1 text-slate-600">{slice.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
    </div>
  );
}

function DonutChart({ data }: { data: ChartSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} innerRadius={62} outerRadius={96} paddingAngle={2} dataKey="value" strokeWidth={0}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CurrencyTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProductPricingCharts({
  marginVsCost,
  general,
  difference,
  equilibrium,
}: ProductPricingChartsProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <ChartFrame title="Análise percentual margem / custos">
        <DonutChart data={marginVsCost} />
      </ChartFrame>

      <ChartFrame title="Análise percentual geral">
        <DonutChart data={general} />
      </ChartFrame>

      <ChartFrame title="Diferença percentual">
        <DonutChart data={difference} />
      </ChartFrame>

      <ChartFrame title="Composição geral">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={marginVsCost} margin={{ top: 16, right: 0, left: -24, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={-8} textAnchor="end" height={48} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {marginVsCost.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Preço sugerido x custo">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={difference} layout="vertical" margin={{ top: 8, right: 12, left: 28, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} width={100} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="value" radius={[0, 10, 10, 0]}>
              {difference.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Equilíbrio entre os custos">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={equilibrium} margin={{ top: 16, right: 0, left: -24, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={-8} textAnchor="end" height={48} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {equilibrium.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
