import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminFaqApiService } from '../../../core/api/admin-faq-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { AdminFaqTopicDto } from '../../../core/models/admin';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'sb-topic-modal',
  imports: [ReactiveFormsModule, ButtonDirective, FieldComponent, ModalComponent],
  template: `
    <sb-modal [open]="open()" title="Нова тема" [width]="440" [locked]="sending()" (closed)="closed.emit()">
      <form id="topic-form" class="form-stack" novalidate [formGroup]="form" (ngSubmit)="submit()">
        <sb-field label="Назва теми" onSurface [error]="error()">
          <input type="text" autocomplete="off" placeholder="Наприклад, Безпека" formControlName="name" />
        </sb-field>
      </form>
      <div modalFooter class="form-stack__actions form-stack__footer">
        <button sbButton variant="ghost" type="button" [disabled]="sending()" (click)="closed.emit()">Скасувати</button>
        <button sbButton type="submit" form="topic-form" [disabled]="sending()">{{ sending() ? 'Додаємо…' : 'Додати тему' }}</button>
      </div>
    </sb-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TopicModalComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly created = output<AdminFaqTopicDto>();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
  });
  protected readonly sending = signal(false);

  private readonly api = inject(AdminFaqApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.reset();
        this.submitted.set(false);
        this.sending.set(false);
      }
    });
  }

  protected error(): string | undefined {
    const control = this.form.controls.name;
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    return control.errors['maxlength'] ? 'Не більше 60 символів' : 'Вкажіть назву теми';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.controls.name.setValue(this.form.controls.name.value.trim(), { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input')?.focus();
      return;
    }
    this.sending.set(true);
    this.api.createTopic(this.form.controls.name.value).subscribe({
      next: (topic) => {
        this.sending.set(false);
        this.toast.success('Тему додано');
        this.created.emit(topic);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (!(error instanceof HttpErrorResponse)) {
          return;
        }
        const body: unknown = error.error;
        if (error.status === 409 && isApiError(body)) {
          this.form.controls.name.setErrors({ server: body.detail });
          this.form.controls.name.markAsTouched();
        } else if (error.status === 400) {
          applyServerErrors(this.form, error);
        }
      },
    });
  }
}
