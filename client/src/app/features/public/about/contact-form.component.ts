import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { CheckboxComponent } from '../../../shared/ui/checkbox/checkbox.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ContactService } from '../data/contact.service';

const FIELD_ORDER = ['name', 'email', 'topic', 'message', 'consent'] as const;
type FieldName = (typeof FIELD_ORDER)[number];

const REQUIRED = 'Поле обов’язкове';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 1000;

@Component({
  selector: 'sb-contact-form',
  imports: [ReactiveFormsModule, ButtonDirective, CheckboxComponent, FieldComponent],
  templateUrl: './contact-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ContactFormComponent {
  protected readonly messageMax = MESSAGE_MAX;
  protected readonly sending = signal(false);
  protected readonly serverErrors = signal<Partial<Record<FieldName, string>>>({});

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(EMAIL_PATTERN), Validators.maxLength(120)],
    }),
    topic: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(MESSAGE_MAX)],
    }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  protected readonly messageLength = toSignal(this.form.controls.message.valueChanges.pipe(map((value) => value.length)), {
    initialValue: 0,
  });

  private readonly submitted = signal(false);
  private readonly contact = inject(ContactService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected error(name: FieldName): string | undefined {
    const server = this.serverErrors()[name];
    if (server) {
      return server;
    }
    const control = this.form.controls[name];
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    return this.message(name, control);
  }

  protected submit(): void {
    this.submitted.set(true);
    this.serverErrors.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    this.sending.set(true);
    this.form.controls.consent.disable({ emitEvent: false });
    this.contact.send(this.form.getRawValue()).subscribe({
      next: () => {
        this.finishSending();
        this.toast.success('Звернення надіслано. Ми відповімо на вашу пошту.');
        this.form.reset();
        this.submitted.set(false);
      },
      error: (response: unknown) => {
        this.finishSending();
        if (response instanceof HttpErrorResponse && response.status === 400 && this.applyServerErrors(response)) {
          this.focusFirstInvalid();
          return;
        }
        this.toast.error('Не вдалося надіслати звернення. Спробуйте пізніше.');
      },
    });
  }

  protected clearServerError(name: FieldName): void {
    if (this.serverErrors()[name]) {
      this.serverErrors.update((errors) => ({ ...errors, [name]: undefined }));
    }
  }

  private finishSending(): void {
    this.sending.set(false);
    this.form.controls.consent.enable({ emitEvent: false });
  }

  private applyServerErrors(response: HttpErrorResponse): boolean {
    const raw = (response.error as { errors?: Record<string, string[]> } | null)?.errors;
    if (!raw) {
      return false;
    }
    const mapped: Partial<Record<FieldName, string>> = {};
    for (const [key, messages] of Object.entries(raw)) {
      const name = (key.charAt(0).toLowerCase() + key.slice(1)) as FieldName;
      if (FIELD_ORDER.includes(name) && messages.length > 0) {
        mapped[name] = messages[0];
      }
    }
    if (Object.keys(mapped).length === 0) {
      return false;
    }
    this.serverErrors.set(mapped);
    return true;
  }

  private message(name: FieldName, control: AbstractControl): string {
    const errors = control.errors ?? {};
    if (errors['required'] || errors['requiredTrue']) {
      return name === 'consent' ? 'Потрібна згода на обробку даних' : REQUIRED;
    }
    if (errors['pattern']) {
      return 'Вкажіть коректну адресу пошти';
    }
    if (errors['minlength']) {
      return 'Щонайменше 10 символів';
    }
    if (errors['maxlength']) {
      return `Не більше ${(errors['maxlength'] as { requiredLength: number }).requiredLength} символів`;
    }
    return REQUIRED;
  }

  private focusFirstInvalid(): void {
    for (const name of FIELD_ORDER) {
      if (!this.error(name)) {
        continue;
      }
      let element = this.host.nativeElement.querySelector<HTMLElement>(`[formControlName="${name}"]`);
      if (element && element.tagName === 'SB-CHECKBOX') {
        element = element.querySelector<HTMLElement>('input');
      }
      element?.focus();
      return;
    }
  }
}
