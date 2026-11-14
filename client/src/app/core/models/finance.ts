export type TransactionType = 'Income' | 'Expense';
export type AccountType = 'Card' | 'Cash' | 'Savings';
export type TransactionSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AccountDto {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
  isDefault: boolean;
  transactionCount: number;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  initialBalance: number;
  isDefault: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isSystem: boolean;
  isGoalContribution: boolean;
}

export interface CategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: number;
  occurredOn: string;
  description: string;
  note: string | null;
  account: { id: string; name: string };
  category: { id: string; name: string; icon: string; color: string };
  goal: { id: string; name: string } | null;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  occurredOn: string;
  description: string;
  note?: string | null;
  accountId: string;
  categoryId: string;
  goalId?: string | null;
}

export interface TransactionList extends Paged<TransactionDto> {
  totalIncome: number;
  totalExpense: number;
}

export interface TransactionQuery {
  search?: string | null;
  type?: TransactionType | null;
  accountId?: string | null;
  categoryId?: string | null;
  from?: string | null;
  to?: string | null;
  sort?: TransactionSort | null;
  page?: number | null;
  pageSize?: number | null;
}

export interface BudgetDto {
  id: string;
  category: { id: string; name: string; icon: string; color: string };
  limitAmount: number;
  spent: number;
  month: string;
}

export interface BudgetSummary {
  month: string;
  totalLimit: number;
  totalSpent: number;
  daysLeft: number;
  perDayLeft: number;
  items: BudgetDto[];
}

export interface GoalDto {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  icon: string;
  color: string;
  isAchieved: boolean;
  isArchived: boolean;
  monthlyNeeded: number | null;
}

interface DashboardPrevious {
  totalBalance: number;
  income: number;
  expense: number;
  savedPercent: number;
}

export interface DashboardDto {
  month: string;
  totalBalance: number;
  income: number;
  expense: number;
  savedPercent: number;
  previous: DashboardPrevious;
  monthly: { month: string; income: number; expense: number }[];
  byCategory: { categoryId: string; name: string; color: string; amount: number }[];
  recent: TransactionDto[];
}

export interface BudgetInput {
  categoryId: string;
  limitAmount: number;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  icon: string;
  color: string;
}

export interface ContributionInput {
  amount: number;
  accountId: string;
  occurredOn: string;
}
