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
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { AdminReviewsApiService } from '../../../core/api/admin-reviews-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { AdminReviewDto } from '../../../core/models/admin';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { RatingInputComponent } from '../../../shared/ui/rating/rating-input.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';
import { REVIEW_TEXT_MAX, REVIEW_TEXT_MIN, counterText } from './admin-reviews-logic';

type ReviewField = 'author' | 'text' | 'rating';

@Component({
  selector: 'sb-review-modal',
  imports: [ReactiveFormsModule, ButtonDirective, FieldComponent, ModalComponent, RatingInputComponent, ToggleComponent],
  templateUrl: './review-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ReviewModalComponent {
  readonly open = input(false);
  readonly review = input<AdminReviewDto | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly form = new FormGroup({
    author: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    rating: new FormControl(0, { nonNullable: true, validators: [Validators.min(1), Validators.max(5)] }),
    text: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(REVIEW_TEXT_MIN), Validators.maxLength(REVIEW_TEXT_MAX)],
    }),
    isPublished: new FormControl(true, { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly editing = computed(() => this.review() !== null);
  protected readonly title = computed(() => (this.editing() ? 'Редагування відгуку' : 'Новий відгук'));
  protected readonly textLength = toSignal(this.form.controls.text.valueChanges.pipe(startWith('')), { initialValue: '' });
  protected readonly counter = computed(() => counterText(this.textLength().length, REVIEW_TEXT_MAX, 'символів'));
  protected readonly over = computed(() => this.textLength().length > REVIEW_TEXT_MAX);

  private readonly api = inject(AdminReviewsApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const review = this.review();
      this.form.reset(
        review
          ? { author: review.author, rating: review.rating, text: review.text, isPublished: review.isPublished }
          : { author: '', rating: 0, text: '', isPublished: true },
      );
      this.submitted.set(false);
      this.sending.set(false);
    });
  }

  protected error(name: ReviewField): string | undefined {
    const control = this.form.controls[name];
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    if (name === 'rating') {
      return 'Оберіть оцінку';
    }
    if (name === 'author') {
      return control.errors['maxlength'] ? 'Не більше 60 символів' : 'Вкажіть ім’я автора';
    }
    if (control.errors['maxlength']) {
      return `Не більше ${REVIEW_TEXT_MAX} символів`;
    }
    return 'Щонайменше 10 символів';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.controls.author.setValue(this.form.controls.author.value.trim(), { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const first = (['author', 'rating', 'text'] as const).find((name) => this.form.controls[name].invalid);
      const selector = first === 'rating' ? 'sb-rating-input input' : `[formControlName="${first}"]`;
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
      return;
    }
    const review = this.review();
    const input = this.form.getRawValue();
    this.sending.set(true);
    const request = review ? this.api.update(review.id, input) : this.api.create(input);
    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(review ? 'Зміни збережено' : 'Відгук додано');
        this.saved.emit();
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
