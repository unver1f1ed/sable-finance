import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminPlansApiService } from '../../../core/api/admin-plans-api.service';
import { FeatureValue, AdminFeatureDto, AdminPlanDto } from '../../../core/models/admin';
import { FeatureKind } from '../../../core/models/public-content';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SegmentedComponent, SegmentedOption } from '../../../shared/ui/segmented/segmented.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { FEATURE_TEXT_MAX, buildFeatureValue, featureValueFor } from './admin-plans-logic';

@Component({
  selector: 'sb-feature-modal',
  imports: [FormsModule, ReactiveFormsModule, ButtonDirective, FieldComponent, ModalComponent, SegmentedComponent],
  templateUrl: './feature-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FeatureModalComponent {
  readonly open = input(false);
  readonly feature = input<AdminFeatureDto | null>(null);
  readonly plans = input<AdminPlanDto[]>([]);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly kindOptions: SegmentedOption[] = [
    { value: 'Included', label: 'Є' },
    { value: 'NotIncluded', label: 'Немає' },
    { value: 'Text', label: 'Текст' },
  ];
  protected readonly textMax = FEATURE_TEXT_MAX;
  protected readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] });
  protected readonly kinds = signal<Record<string, FeatureKind>>({});
  protected readonly texts = signal<Record<string, string>>({});
  protected readonly sending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly editing = computed(() => this.feature() !== null);
  protected readonly title = computed(() => (this.editing() ? 'Редагування характеристики' : 'Нова характеристика'));

  private readonly api = inject(AdminPlansApiService);
  private readonly toast = inject(ToastService);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const feature = this.feature();
      const kinds: Record<string, FeatureKind> = {};
      const texts: Record<string, string> = {};
      for (const plan of this.plans()) {
        const value = feature ? featureValueFor(feature.values, plan.code) : { kind: 'Included' as FeatureKind, text: null };
        kinds[plan.code] = value.kind;
        texts[plan.code] = value.text ?? '';
      }
      this.name.reset(feature?.name ?? '');
      this.kinds.set(kinds);
      this.texts.set(texts);
      this.submitted.set(false);
      this.sending.set(false);
    });
  }

  protected nameError(): string | undefined {
    const control = this.name;
    if (!control.errors || !(control.touched || this.submitted())) {
      return undefined;
    }
    return control.errors['maxlength'] ? 'Не більше 80 символів' : 'Вкажіть назву характеристики';
  }

  protected textError(code: string): string | undefined {
    if (this.kinds()[code] !== 'Text' || !this.submitted()) {
      return undefined;
    }
    const text = (this.texts()[code] ?? '').trim();
    if (!text) {
      return 'Вкажіть текст';
    }
    return text.length > FEATURE_TEXT_MAX ? `Не більше ${FEATURE_TEXT_MAX} символів` : undefined;
  }

  protected setKind(code: string, kind: string): void {
    this.kinds.update((current) => ({ ...current, [code]: kind as FeatureKind }));
  }

  protected setText(code: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.texts.update((current) => ({ ...current, [code]: value }));
  }

  protected submit(): void {
    this.submitted.set(true);
    this.name.setValue(this.name.value.trim(), { emitEvent: false });
    this.name.markAsTouched();
    const codes = this.plans().map((plan) => plan.code);
    if (this.name.invalid || codes.some((code) => this.textError(code))) {
      return;
    }
    const values: Record<string, FeatureValue> = {};
    for (const code of codes) {
      values[code] = buildFeatureValue(this.kinds()[code], this.texts()[code] ?? '');
    }
    const feature = this.feature();
    const input = { name: this.name.value, values };
    this.sending.set(true);
    const request = feature ? this.api.updateFeature(feature.id, input) : this.api.createFeature(input);
    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(feature ? 'Зміни збережено' : 'Характеристику додано');
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.sending.set(false);
        if (error instanceof HttpErrorResponse && error.status === 400) {
          this.toast.error('Перевірте введені дані.');
        }
      },
    });
  }
}
