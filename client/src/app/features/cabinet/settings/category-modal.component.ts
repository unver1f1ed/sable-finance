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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoriesApiService } from '../../../core/api/categories-api.service';
import { applyServerErrors, serverError } from '../../../core/forms/form-errors';
import { isApiError } from '../../../core/models/api-error';
import { CategoryDto, TransactionType } from '../../../core/models/finance';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../../core/models/palette';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ColorPickerComponent } from '../../../shared/ui/color-picker/color-picker.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconPickerComponent } from '../../../shared/ui/icon-picker/icon-picker.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const NAME_LIMIT = 40;

@Component({
  selector: 'sb-category-modal',
  imports: [ReactiveFormsModule, ButtonDirective, ColorPickerComponent, FieldComponent, IconPickerComponent, ModalComponent, SegmentedComponent],
  templateUrl: './category-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CategoryModalComponent {
  readonly open = input(false);
  readonly category = input<CategoryDto | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly deleteRequested = output<CategoryDto>();

  protected readonly typeOptions: SegmentedOption[] = [
    { value: 'Expense', label: 'Витрата' },
    { value: 'Income', label: 'Дохід' },
  ];
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(NAME_LIMIT)] }),
    type: new FormControl<TransactionType>('Expense', { nonNullable: true }),
    icon: new FormControl(CATEGORY_ICONS[0].value, { nonNullable: true }),
    color: new FormControl(CATEGORY_COLORS[0].value, { nonNullable: true }),
  });
  protected readonly sending = signal(false);
  protected readonly editing = computed(() => this.category() !== null);
  protected readonly title = computed(() => (this.editing() ? 'Редагування категорії' : 'Нова категорія'));

  private readonly api = inject(CategoriesApiService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const category = this.category();
      this.form.reset(
        category
          ? { name: category.name, type: category.type, icon: category.icon, color: category.color }
          : { name: '', type: 'Expense', icon: CATEGORY_ICONS[0].value, color: CATEGORY_COLORS[0].value },
      );
      this.submitted.set(false);
      this.sending.set(false);
    });
  }

  protected nameError(): string | undefined {
    const control = this.form.controls.name;
    const server = serverError(control);
    if (server) {
      return server;
    }
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    return control.errors['maxlength'] ? `Не більше ${NAME_LIMIT} символів` : 'Поле обов’язкове';
  }

  protected requestDelete(): void {
    const category = this.category();
    if (category) {
      this.deleteRequested.emit(category);
    }
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.controls.name.setValue(this.form.controls.name.value.trim(), { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('[formControlName="name"]')?.focus();
      return;
    }
    const input = this.form.getRawValue();
    const category = this.category();
    this.sending.set(true);
    const request = category ? this.api.update(category.id, input) : this.api.create(input);
    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(category ? 'Зміни збережено' : 'Категорію додано');
        this.saved.emit();
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
