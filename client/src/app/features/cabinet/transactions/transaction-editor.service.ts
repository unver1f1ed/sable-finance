import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { TransactionDto } from '../../../core/models/finance';

export type TransactionChange = 'created' | 'updated' | 'deleted';

export interface EditorRequest {
  transaction: TransactionDto | null;
}

@Injectable({ providedIn: 'root' })
export class TransactionEditorService {
  private readonly requestState = signal<EditorRequest | null>(null);
  private readonly changeSubject = new Subject<TransactionChange>();

  readonly request = this.requestState.asReadonly();
  readonly changes$ = this.changeSubject.asObservable();

  openCreate(): void {
    this.requestState.set({ transaction: null });
  }

  edit(transaction: TransactionDto): void {
    this.requestState.set({ transaction });
  }

  close(): void {
    this.requestState.set(null);
  }

  notify(change: TransactionChange): void {
    this.changeSubject.next(change);
  }
}
