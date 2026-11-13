import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const AUTO_DISMISS_MS = 5000;
const DEDUPE_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly items = signal<Toast[]>([]);
  private nextId = 1;
  private readonly recent = new Map<string, number>();

  readonly toasts = this.items.asReadonly();

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, text: string): void {
    const now = Date.now();
    const last = this.recent.get(`${kind}:${text}`);
    if (last !== undefined && now - last < DEDUPE_MS) {
      return;
    }
    this.recent.set(`${kind}:${text}`, now);
    const id = this.nextId++;
    this.items.update((list) => [...list, { id, kind, text }]);
    if (this.isBrowser) {
      setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
    }
  }
}
