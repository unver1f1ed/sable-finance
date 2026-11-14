import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { AdminPlansApiService } from '../../../core/api/admin-plans-api.service';
import { isApiError } from '../../../core/models/api-error';
import { AdminFeatureDto, AdminPlanDto } from '../../../core/models/admin';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { AmountFieldComponent } from '../../../shared/ui/amount-field/amount-field.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { FieldComponent } from '../../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';
import { formatPrice } from '../../../shared/util/format';
import { pluralize } from '../../../shared/util/plural';
import { PublicContentService } from '../../public/data/public-content.service';
import { canMove, discountPercent, featureValueFor, moveId, yearlyNotAboveMonthly } from './admin-plans-logic';
import { FeatureModalComponent } from './feature-modal.component';

type PlanField = 'name' | 'description' | 'priceMonthly' | 'priceYearlyPerMonth';

@Component({
  selector: 'sb-admin-plans-page',
  imports: [
    ReactiveFormsModule,
    AmountFieldComponent,
    BadgeComponent,
    ButtonDirective,
    ConfirmDialogComponent,
    ErrorStateComponent,
    FeatureModalComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
    SkeletonComponent,
    ToggleComponent,
  ],
  templateUrl: './admin-plans-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminPlansPageComponent {
  protected readonly plans = signal<AdminPlanDto[]>([]);
  protected readonly features = signal<AdminFeatureDto[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly selectedCode = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly featureModal = signal<{ feature: AdminFeatureDto | null } | null>(null);
  protected readonly deleting = signal<AdminFeatureDto | null>(null);
  protected readonly deleteBusy = signal(false);
  protected readonly descriptionMax = 120;

  protected readonly form = new FormGroup(
    {
      isPublished: new FormControl(true, { nonNullable: true }),
      name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
      description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
      priceMonthly: new FormControl<number | null>(0, { validators: [Validators.required, Validators.min(0)] }),
      priceYearlyPerMonth: new FormControl<number | null>(0, { validators: [Validators.required, Validators.min(0)] }),
      isPopular: new FormControl(false, { nonNullable: true }),
    },
    { validators: [yearlyNotAboveMonthly] },
  );

  private readonly api = inject(AdminPlansApiService);
  private readonly content = inject(PublicContentService);
  private readonly toast = inject(ToastService);
  private readonly submitted = signal(false);
  private readonly values = toSignal(this.form.valueChanges.pipe(startWith(null)), { initialValue: null });

  protected readonly selected = computed(() => this.plans().find((plan) => plan.code === this.selectedCode()) ?? null);
  protected readonly isStart = computed(() => this.selected()?.code === 'start');
  protected readonly discount = computed(() => {
    this.values();
    const raw = this.form.getRawValue();
    return discountPercent(raw.priceMonthly, raw.priceYearlyPerMonth);
  });
  protected readonly descriptionLength = computed(() => {
    this.values();
    return this.form.controls.description.value.length;
  });
  protected readonly featureIds = computed(() => this.features().map((feature) => feature.id));

  constructor() {
    this.load();
    effect(() => {
      const plan = this.selected();
      untracked(() => {
        if (plan) {
          this.fillForm(plan);
        }
      });
    });
  }

  private fillForm(plan: AdminPlanDto): void {
    this.form.reset({
      isPublished: plan.isPublished,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearlyPerMonth: plan.priceYearlyPerMonth,
      isPopular: plan.isPopular,
    });
    this.form.enable({ emitEvent: false });
    if (plan.code === 'start') {
      this.form.controls.isPublished.disable({ emitEvent: false });
    }
    this.submitted.set(false);
  }

  protected load(): void {
    this.api.plans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        if (!this.selectedCode() || !plans.some((plan) => plan.code === this.selectedCode())) {
          this.selectedCode.set(plans[0]?.code ?? null);
        } else {
          this.selectedCode.set(this.selectedCode());
        }
        this.loadFeatures();
      },
      error: () => this.state.set('error'),
    });
  }

  protected loadFeatures(): void {
    this.api.features().subscribe({
      next: (features) => {
        this.features.set(features);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected retry(): void {
    this.state.set('loading');
    this.load();
  }

  protected select(plan: AdminPlanDto): void {
    this.selectedCode.set(plan.code);
  }

  protected error(name: PlanField): string | undefined {
    const control = this.form.controls[name];
    if (!control.errors || !(control.touched || this.submitted())) {
      if (name === 'priceYearlyPerMonth' && this.form.errors?.['yearlyAboveMonthly'] && (control.touched || this.submitted())) {
        return 'Ціна при оплаті за рік не може перевищувати місячну';
      }
      return undefined;
    }
    if (control.errors['maxlength']) {
      return `Не більше ${name === 'name' ? 40 : 120} символів`;
    }
    return name === 'name' ? 'Вкажіть назву тарифу' : 'Вкажіть ціну від 0';
  }

  protected save(): void {
    this.submitted.set(true);
    const plan = this.selected();
    if (!plan) {
      return;
    }
    this.form.controls.name.setValue(this.form.controls.name.value.trim(), { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .updatePlan(plan.id, {
        name: raw.name,
        description: raw.description,
        priceMonthly: raw.priceMonthly ?? 0,
        priceYearlyPerMonth: raw.priceYearlyPerMonth ?? 0,
        isPopular: raw.isPopular,
        isPublished: plan.code === 'start' ? true : raw.isPublished,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Тариф збережено');
          this.content.invalidate('plans');
          this.api.plans().subscribe({
            next: (plans) => {
              this.plans.set(plans);
              this.selectedCode.set(plan.code);
            },
          });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
          if (error instanceof HttpErrorResponse && error.status === 409 && isApiError(body)) {
            this.toast.error(body.detail);
          }
        },
      });
  }

  protected resetForm(): void {
    const plan = this.selected();
    if (plan) {
      this.fillForm(plan);
    }
  }

  protected usersText(plan: AdminPlanDto): string {
    return `${plan.userCount} ${pluralize(plan.userCount, 'користувач', 'користувачі', 'користувачів')}`;
  }

  protected price(plan: AdminPlanDto): string {
    return plan.priceMonthly === 0 ? 'Безкоштовно' : `${formatPrice(plan.priceMonthly)} / міс`;
  }

  protected valueOf(feature: AdminFeatureDto, code: string) {
    return featureValueFor(feature.values, code);
  }

  protected can(feature: AdminFeatureDto, direction: -1 | 1): boolean {
    return canMove(this.featureIds(), feature.id, direction);
  }

  protected move(feature: AdminFeatureDto, direction: -1 | 1): void {
    const before = this.features();
    const ids = moveId(this.featureIds(), feature.id, direction);
    const byId = new Map(before.map((item) => [item.id, item]));
    this.features.set(ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as AdminFeatureDto] : [])));
    this.api.reorderFeatures(ids).subscribe({
      next: () => this.content.invalidate('plans'),
      error: () => {
        this.features.set(before);
        this.toast.error('Не вдалося змінити порядок. Спробуйте ще раз.');
      },
    });
  }

  protected onFeatureSaved(): void {
    this.featureModal.set(null);
    this.content.invalidate('plans');
    this.loadFeatures();
  }

  protected confirmDelete(): void {
    const feature = this.deleting();
    if (!feature) {
      return;
    }
    this.deleteBusy.set(true);
    this.api.deleteFeature(feature.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.toast.success('Характеристику видалено');
        this.content.invalidate('plans');
        this.loadFeatures();
      },
      error: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
      },
    });
  }
}
