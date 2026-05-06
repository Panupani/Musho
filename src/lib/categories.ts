import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';

const KEYS = {
  income:  'musho_income_categories',
  expense: 'musho_expense_categories',
} as const;

export function getCategories(type: 'income' | 'expense'): string[] {
  try {
    const raw = localStorage.getItem(KEYS[type]);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore
  }
  return type === 'income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES];
}

export function saveCategories(type: 'income' | 'expense', cats: string[]): void {
  localStorage.setItem(KEYS[type], JSON.stringify(cats));
}
