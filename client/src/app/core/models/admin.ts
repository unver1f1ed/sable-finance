import { Role } from './auth';
import { FeatureKind, PlanCode, PlanDto } from './public-content';

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  planCode: PlanCode;
  isBlocked: boolean;
  createdAt: string;
  transactionCount: number;
}

export interface AdminUserStats {
  total: number;
  activeThisMonth: number;
  onPlus: number;
  blocked: number;
}

export interface AdminUserInput {
  firstName: string;
  lastName: string;
  role: Role;
  planCode: PlanCode;
  isBlocked: boolean;
}

export type AdminUserSort = 'created_desc' | 'created_asc' | 'name_asc';
export type AdminUserStatus = 'active' | 'blocked';

export interface AdminUserQuery {
  search?: string | null;
  role?: Role | null;
  planCode?: PlanCode | null;
  status?: AdminUserStatus | null;
  sort?: AdminUserSort | null;
  page?: number | null;
  pageSize?: number | null;
}

export interface AdminPlanDto extends PlanDto {
  id: string;
  isPublished: boolean;
  sortOrder: number;
  userCount: number;
}

export interface AdminPlanInput {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearlyPerMonth: number;
  isPopular: boolean;
  isPublished: boolean;
}

export interface FeatureValue {
  kind: FeatureKind;
  text: string | null;
}

export interface AdminFeatureDto {
  id: string;
  name: string;
  sortOrder: number;
  values: Record<string, FeatureValue>;
}

export interface AdminFeatureInput {
  name: string;
  values: Record<string, FeatureValue>;
}

export interface AdminReviewDto {
  id: string;
  author: string;
  text: string;
  rating: number;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminReviewInput {
  author: string;
  text: string;
  rating: number;
  isPublished: boolean;
}

export type AdminReviewStatus = 'published' | 'hidden';

export interface AdminReviewQuery {
  search?: string | null;
  status?: AdminReviewStatus | null;
  rating?: number | null;
  page?: number | null;
  pageSize?: number | null;
}

export interface AdminFaqItemDto {
  id: string;
  topicId: string;
  topicName: string;
  question: string;
  answer: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface AdminFaqItemInput {
  topicId: string;
  question: string;
  answer: string;
  isPublished: boolean;
}

export interface AdminFaqTopicDto {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
}
