import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { AdminFaqApiService } from '../../../core/api/admin-faq-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { AdminFaqItemDto, AdminFaqTopicDto } from '../../../core/models/admin';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';
import { formatDateDots } from '../../../shared/util/format';
import { FAQ_ANSWER_MAX, FAQ_ANSWER_MIN, FAQ_QUESTION_MAX, FAQ_QUESTION_MIN } from './admin-faq-logic';

type FaqField = 'question' | 'answer' | 'topicId';

@Component({
  selector: 'sb-faq-editor',
  imports: [ReactiveFormsModule, ButtonDirective, FieldComponent, SelectComponent, ToggleComponent],
  templateUrl: './faq-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FaqEditorComponent {
  readonly item = input<AdminFaqItemDto | null>(null);
  readonly topics = input<AdminFaqTopicDto[]>([]);
  readonly defaultTopicId = input<string | null>(null);
  readonly saved = output<AdminFaqItemDto>();
  readonly cancelled = output<void>();
  readonly deleteRequested = output<AdminFaqItemDto>();
  readonly dirtyChange = output<boolean>();

  protected readonly form = new FormGroup({
    isPublished: new FormControl(true, { nonNullable: true }),
    question: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(FAQ_QUESTION_MIN), Validators.maxLength(FAQ_QUESTION_MAX)],
    }),
    topicId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    answer: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(FAQ_ANSWER_MIN), Validators.maxLength(FAQ_ANSWER_MAX)],
    }),
  });
  protected readonly sending = signal(false);
  protected readonly answerLength = toSignal(this.form.controls.answer.valueChanges.pipe(startWith('')), { initialValue: '' });
  protected readonly topicOptions = computed<SelectOption[]>(() => this.topics().map((topic) => ({ value: topic.id, label: topic.name })));
  protected readonly updated = computed(() => {
    const item = this.item();
    return item ? formatDateDots(item.updatedAt) : '';
  });
  protected readonly answerCounter = computed(() => `${this.answerLength().length} / ${FAQ_ANSWER_MAX} символів`);
  protected readonly answerOver = computed(() => this.answerLength().length > FAQ_ANSWER_MAX);

  private readonly api = inject(AdminFaqApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      const item = this.item();
      const fallback = untracked(() => this.defaultTopicId() ?? this.topics()[0]?.id ?? '');
      this.form.reset(
        item
          ? { isPublished: item.isPublished, question: item.question, topicId: item.topicId, answer: item.answer }
          : { isPublished: true, question: '', topicId: fallback, answer: '' },
      );
      this.submitted.set(false);
      this.sending.set(false);
      this.dirtyChange.emit(false);
    });
    this.form.valueChanges.subscribe(() => this.dirtyChange.emit(this.form.dirty));
  }

  protected error(name: FaqField): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    if (name === 'topicId') {
      return 'Оберіть тему';
    }
    const [min, max] = name === 'question' ? [FAQ_QUESTION_MIN, FAQ_QUESTION_MAX] : [FAQ_ANSWER_MIN, FAQ_ANSWER_MAX];
    if (control.errors['maxlength']) {
      return `Не більше ${max} символів`;
    }
    return control.errors['minlength'] ? `Щонайменше ${min} символів` : 'Поле обов’язкове';
  }

  protected requestDelete(): void {
    const item = this.item();
    if (item) {
      this.deleteRequested.emit(item);
    }
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const first = (['question', 'topicId', 'answer'] as const).find((name) => this.form.controls[name].invalid);
      this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${first}"]`)?.focus();
      return;
    }
    const item = this.item();
    const input = this.form.getRawValue();
    this.sending.set(true);
    const request = item ? this.api.updateItem(item.id, input) : this.api.createItem(input);
    request.subscribe({
      next: (result) => {
        this.sending.set(false);
        this.form.markAsPristine();
        this.dirtyChange.emit(false);
        this.toast.success(item ? 'Зміни збережено' : 'Питання додано');
        this.saved.emit(result);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (error instanceof HttpErrorResponse && error.status === 400) {
          applyServerErrors(this.form, error);
        }
      },
    });
  }
}
