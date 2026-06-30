import {
  normalizePercentage,
  calculateRecipeTotalCosts,
  calculateSuggestedPrice,
  simulatePricingScenarios,
} from './pricing-calculator';

/**
 * Validação Matemática, Casos-Limite e Contrato de Erros
 */

export function runPricingCalculatorExamples() {
  console.log('--- INICIANDO TESTES DO PRICING CALCULATOR (FASE 2.6B) ---\n');

  // ==========================================
  // A) PERCENTUAIS
  // ==========================================
  console.log('--- A) PERCENTUAIS ---');
  const p1 = normalizePercentage(20, 'percent') === 0.2;
  const p2 = normalizePercentage(0.2, 'decimal') === 0.2;
  const p3 = normalizePercentage(20, 'auto') === 0.2;
  const p4 = normalizePercentage(1, 'percent') === 0.01;
  const p5 = normalizePercentage(1, 'decimal') === 1;

  console.log(`20 (percent) -> 0.2: ${p1 ? '✅' : '❌'}`);
  console.log(`0.2 (decimal) -> 0.2: ${p2 ? '✅' : '❌'}`);
  console.log(`20 (auto) -> 0.2: ${p3 ? '✅' : '❌'}`);
  console.log(`1 (percent) -> 0.01: ${p4 ? '✅' : '❌'}`);
  console.log(`1 (decimal) -> 1: ${p5 ? '✅' : '❌'}\n`);

  // ==========================================
  // B) PRECIFICAÇÃO VIÁVEL
  // ==========================================
  console.log('--- B) PRECIFICAÇÃO VIÁVEL ---');
  const viable = calculateSuggestedPrice({
    unitCost: 5,
    taxPercent: 10,
    targetMarginPercent: 40,
    percentageMode: 'percent', // Interpreta 10 como 10%, etc.
  });
  console.log(`Preço Esperado 10 | Retornado: ${viable.suggestedPrice}`);
  console.log(`Cenário Viável: ${viable.isViable}`);
  console.log(viable.isViable && viable.suggestedPrice === 10 ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // C) PRECIFICAÇÃO INVIÁVEL
  // ==========================================
  console.log('--- C) PRECIFICAÇÃO INVIÁVEL ---');
  const unviable = calculateSuggestedPrice({
    unitCost: 5,
    taxPercent: 60, // + 50% margem = 110%
    targetMarginPercent: 50,
    percentageMode: 'percent',
  });
  console.log(`Viável: ${unviable.isViable} | Motivo: ${unviable.reason}`);
  console.log(!unviable.isViable && unviable.reason === 'VARIABLE_COSTS_AND_MARGIN_EXCEED_100_PERCENT' ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // D) RENDIMENTO INVÁLIDO
  // ==========================================
  console.log('--- D) RENDIMENTO INVÁLIDO ---');
  const zeroYield = calculateRecipeTotalCosts({
    ingredients: [{ netQuantity: 1, unitPrice: 10 }],
    packagings: [],
    laborEntries: [],
    equipmentEntries: [],
    yieldQuantity: 0,
  });
  console.log(`Custo Lote: ${zeroYield.totalBatchCost} | Custo Unitário: ${zeroYield.unitCost}`);
  console.log(`Viável: ${zeroYield.isYieldViable} | Motivo: ${zeroYield.yieldReason}`);
  console.log(!zeroYield.isYieldViable && zeroYield.yieldReason === 'INVALID_YIELD' ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // E) CUSTO UNITÁRIO INVÁLIDO
  // ==========================================
  console.log('--- E) CUSTO UNITÁRIO INVÁLIDO ---');
  const zeroUnitCost = calculateSuggestedPrice({
    unitCost: 0,
    taxPercent: 10,
    targetMarginPercent: 40,
    percentageMode: 'percent',
  });
  console.log(`Viável: ${zeroUnitCost.isViable} | Motivo: ${zeroUnitCost.reason}`);
  console.log(!zeroUnitCost.isViable && zeroUnitCost.reason === 'INVALID_UNIT_COST' ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // F) SIMULATE SCENARIOS CONTRACT
  // ==========================================
  console.log('--- F) SIMULAÇÃO COM CONTRATO DE ERROS ---');
  const sim = simulatePricingScenarios({
    unitCost: 5,
    cardFeePercent: 10,
    targetMarginPercent: 50,
    percentageMode: 'percent' // 5 / (1 - 0.10 - 0.50) = 5 / 0.40 = 12.50
  });
  console.log(`Sugerido: ${sim.suggestedPrice} | Mínimo: ${sim.minimumViablePrice}`);
  console.log(`Margem (valor): ${sim.marginValue} | Markup: ${sim.markupFactor}`);
  console.log(`CMV%: ${sim.cmvPercent}`);
  console.log(sim.isViable && sim.suggestedPrice === 12.5 ? '✅ PASSOU\n' : '❌ FALHOU\n');
}
