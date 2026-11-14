import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AccountsApiService } from '../../../core/api/accounts-api.service';
import { CategoriesApiService } from '../../../core/api/categories-api.service';
import { AccountDto, CategoryDto } from '../../../core/models/finance';

export type ReferenceStatus = 'loading' | 'ready' | 'error';

@Injectable()
export class ReferenceDataStore {
  private readonly accountsApi = inject(AccountsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);

  private readonly accountsState = signal<AccountDto[]>([]);
  private readonly categoriesState = signal<CategoryDto[]>([]);
  private readonly statusState = signal<ReferenceStatus>('loading');

  readonly accounts = this.accountsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly loaded = computed(() => this.statusState() === 'ready');
  readonly hasAccounts = computed(() => this.accountsState().length > 0);
  readonly expenseCategories = computed(() => this.categoriesState().filter((category) => category.type === 'Expense'));
  readonly incomeCategories = computed(() => this.categoriesState().filter((category) => category.type === 'Income'));
  readonly defaultAccount = computed(() => this.accountsState().find((account) => account.isDefault) ?? this.accountsState()[0] ?? null);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.reload();
    }
  }

  reload(): void {
    this.statusState.set('loading');
    forkJoin({ accounts: this.accountsApi.list(), categories: this.categoriesApi.list() }).subscribe({
      next: ({ accounts, categories }) => {
        this.accountsState.set(accounts);
        this.categoriesState.set(categories);
        this.statusState.set('ready');
      },
      error: () => this.statusState.set('error'),
    });
  }

  reloadAccounts(): void {
    this.accountsApi.list().subscribe({
      next: (accounts) => {
        this.accountsState.set(accounts);
        if (this.statusState() !== 'ready' && this.categoriesState().length > 0) {
          this.statusState.set('ready');
        }
      },
    });
  }

  reloadCategories(): void {
    this.categoriesApi.list().subscribe({ next: (categories) => this.categoriesState.set(categories) });
  }

  category(id: string): CategoryDto | undefined {
    return this.categoriesState().find((category) => category.id === id);
  }
}
