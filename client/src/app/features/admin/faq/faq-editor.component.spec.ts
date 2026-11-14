import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AdminFaqItemDto, AdminFaqTopicDto } from '../../../core/models/admin';
import { FaqEditorComponent } from './faq-editor.component';

const TOPICS: AdminFaqTopicDto[] = [
  { id: 't1', name: 'Початок роботи', sortOrder: 1, itemCount: 2 },
  { id: 't2', name: 'Безпека', sortOrder: 2, itemCount: 0 },
];

const ITEM: AdminFaqItemDto = {
  id: 'i1',
  topicId: 't1',
  topicName: 'Початок роботи',
  question: 'Як додати рахунок?',
  answer: 'Відкрийте налаштування й натисніть «Додати рахунок».',
  isPublished: true,
  sortOrder: 1,
  updatedAt: '2026-11-05T10:00:00Z',
};

function setup(item: AdminFaqItemDto | null, defaultTopicId: string | null = null): { fixture: ComponentFixture<FaqEditorComponent>; http: HttpTestingController; root: HTMLElement } {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(FaqEditorComponent);
  fixture.componentRef.setInput('topics', TOPICS);
  fixture.componentRef.setInput('defaultTopicId', defaultTopicId);
  fixture.componentRef.setInput('item', item);
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController), root: fixture.nativeElement as HTMLElement };
}

function type(root: HTMLElement, selector: string, value: string): void {
  const element = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector) as HTMLInputElement;
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('FaqEditorComponent', () => {
  it('preselects the current topic for a new question and creates it', () => {
    const { fixture, http, root } = setup(null, 't2');
    type(root, '[formControlName="question"]', 'Де зберігаються дані?');
    type(root, 'textarea', 'Дані зберігаються в захищеній базі даних.');
    fixture.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/faq/items'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      topicId: 't2',
      question: 'Де зберігаються дані?',
      answer: 'Дані зберігаються в захищеній базі даних.',
      isPublished: true,
    });
  });

  it('shows the minimum length messages and does not send a short question', () => {
    const { fixture, http, root } = setup(null, 't1');
    type(root, '[formControlName="question"]', 'Так?');
    type(root, 'textarea', 'Коротко');
    fixture.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(root.textContent).toContain('Щонайменше 5 символів');
    expect(root.textContent).toContain('Щонайменше 10 символів');
    http.expectNone(() => true);
  });

  it('reports a dirty form after typing and a clean one after loading another item', () => {
    const { fixture, root } = setup(ITEM);
    const states: boolean[] = [];
    fixture.componentInstance.dirtyChange.subscribe((value) => states.push(value));
    type(root, '[formControlName="question"]', 'Як створити новий рахунок?');
    const typing = root.querySelector<HTMLInputElement>('[formControlName="question"]') as HTMLInputElement;
    typing.dispatchEvent(new Event('blur'));
    expect(states).toContain(true);
    fixture.componentRef.setInput('item', { ...ITEM, id: 'i2', question: 'Інше питання про рахунки' });
    fixture.detectChanges();
    expect(states[states.length - 1]).toBe(false);
  });

  it('updates an existing question and shows the last change date', () => {
    const { fixture, http, root } = setup(ITEM);
    expect(root.textContent).toContain('Востаннє змінено 05.11.2026');
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    const request = http.expectOne((req) => req.url.endsWith('/api/admin/faq/items/i1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ topicId: 't1', question: ITEM.question, answer: ITEM.answer, isPublished: true });
  });
});
