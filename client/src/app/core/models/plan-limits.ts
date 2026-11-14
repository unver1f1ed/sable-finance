import { PlanCode } from './public-content';

export interface PlanLimits {
  accounts: number | null;
  budgets: number | null;
  goals: number | null;
  csvExport: boolean;
}

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  start: { accounts: 2, budgets: 5, goals: 1, csvExport: false },
  plus: { accounts: null, budgets: null, goals: null, csvExport: true },
};
