export function isPositive(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && value > 0;
}

export function isNonNegative(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && value >= 0;
}

export function isBetween(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits.slice(0, 12), w1);
  const d2 = calcDigit(digits.slice(0, 13), w2);

  return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
}

export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += parseInt(base[i]) * (length + 1 - i);
    }
    const rem = (sum * 10) % 11;
    return rem === 10 || rem === 11 ? 0 : rem;
  };

  const d1 = calcDigit(digits, 9);
  const d2 = calcDigit(digits, 10);

  return parseInt(digits[9]) === d1 && parseInt(digits[10]) === d2;
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z\d]/.test(password)
  );
}

export function isValidYield(value: number): boolean {
  return isPositive(value);
}

export function isValidPercentageSum(values: number[], tolerance = 0.01): boolean {
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) <= tolerance;
}

export function formatCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '');
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return phone;
}
