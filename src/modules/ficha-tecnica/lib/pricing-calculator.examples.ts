import {
  calculateIngredientCost,
  calculateRecipeTotalCosts,
  calculateSuggestedPrice,
} from './pricing-calculator';

/**
 * Este arquivo serve como Validação Manual das Fórmulas baseadas em cenários previsíveis.
 * Ele não é executado em runtime no navegador, mas serve para testes unitários ou consultas.
 */

export function runPricingCalculatorExamples() {
  console.log('--- INICIANDO TESTES DO PRICING CALCULATOR ---\n');

  // ==========================================
  // CENÁRIO 1: INGREDIENTE SIMPLES
  // ==========================================
  const ingResult = calculateIngredientCost({
    netQuantity: 0.1, // 100g líquidos (0.1 kg)
    correctionFactor: 1.10, // 10% de perda no corte
    unitPrice: 20, // R$ 20/kg
    yieldFactor: 1, // Não perde no cozimento
  });
  
  // (0.1 * 1.10) / 1 * 20 = 0.11 * 20 = 2.20
  console.log('CENÁRIO 1: Ingrediente Simples');
  console.log(`Custo Esperado: R$ 2.20`);
  console.log(`Custo Retornado: R$ ${ingResult.toFixed(2)}`);
  console.log(ingResult === 2.2 ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // CENÁRIO 2: RECEITA SIMPLES (Agregação e Unitário)
  // ==========================================
  const recipeResult = calculateRecipeTotalCosts({
    ingredients: [
      { netQuantity: 1, unitPrice: 20 }, // R$ 20
      { netQuantity: 2, unitPrice: 10 }, // R$ 20
    ],
    packagings: [
      { quantity: 10, unitPrice: 0.5 }, // R$ 5
    ],
    laborEntries: [
      { minutesUsed: 60, monthlySalary: 1320, monthlyHours: 220 }, // 1h. 1320 / (220*60) = 0.1/min = R$ 6
    ],
    equipmentEntries: [
      { hoursUsed: 1, consumptionPerHour: 2, utilityRate: 0.5 }, // 1 * 2 * 0.5 = R$ 1
    ],
    yieldQuantity: 10,
  });

  // Total Batch: 20+20 + 5 + 6 + 1 = 52.
  // Wait, let's recalculate labor: 1320 / (220*60) = 1320 / 13200 = 0.10. 0.10 * 60 = 6.00.
  // Total Batch: 40 + 5 + 6 + 1 = 52.
  // Unit Cost: 52 / 10 = 5.20.
  console.log('CENÁRIO 2: Receita Simples');
  console.log(`Custo Lote Esperado: R$ 52.00 | Retornado: R$ ${recipeResult.totalBatchCost.toFixed(2)}`);
  console.log(`Custo Unit Esperado: R$ 5.20 | Retornado: R$ ${recipeResult.unitCost.toFixed(2)}`);
  console.log(recipeResult.unitCost === 5.2 ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // CENÁRIO 3: PRECIFICAÇÃO (Markup e Margem)
  // ==========================================
  // custo unitário = 5, variaveis = 10%, margem = 40%
  // 5 / (1 - 0.10 - 0.40) = 5 / 0.5 = 10
  const pricingResult = calculateSuggestedPrice({
    unitCost: 5,
    taxPercent: 10, // 10%
    targetMarginPercent: 40, // 40%
  });

  console.log('CENÁRIO 3: Precificação');
  console.log(`Preço Esperado: R$ 10.00 | Retornado: R$ ${pricingResult.toFixed(2)}`);
  console.log(pricingResult === 10 ? '✅ PASSOU\n' : '❌ FALHOU\n');

  // ==========================================
  // CENÁRIO 4: PROTEÇÃO DIVISÃO POR ZERO E NEGATIVOS
  // ==========================================
  const pricingZero = calculateSuggestedPrice({
    unitCost: 5,
    taxPercent: 50, // 50%
    targetMarginPercent: 60, // 60%
    // Total = 110%, denominador negativo! Deve retornar 0.
  });

  console.log('CENÁRIO 4: Proteção Divisão Negativa');
  console.log(`Preço Esperado (Inviável): R$ 0.00 | Retornado: R$ ${pricingZero.toFixed(2)}`);
  console.log(pricingZero === 0 ? '✅ PASSOU\n' : '❌ FALHOU\n');
}
