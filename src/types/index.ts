export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export const INCOME_CATEGORIES = [
  'Fresh Mushroom Sales',
  'Dried Mushroom Sales',
  'Spawn Bag Sales',
  'Mushroom Powder Sales',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Spawn Bags & Materials',
  'Substrate (Sawdust, Rice Bran)',
  'Electricity',
  'Water',
  'Labor / Wages',
  'Packaging',
  'Equipment & Tools',
  'Transport',
  'Other Expense',
] as const;
