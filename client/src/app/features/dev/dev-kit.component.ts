import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AmountFieldComponent } from '../../shared/ui/amount-field/amount-field.component';
import { BarChartComponent, BarChartDatum } from '../../shared/ui/charts/bar-chart.component';
import { DonutChartComponent, DonutSegment } from '../../shared/ui/charts/donut-chart.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { SelectComponent, SelectOption } from '../../shared/ui/select/select.component';
import { BadgeComponent, BadgeTone } from '../../shared/ui/badge/badge.component';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { CategoryIconComponent } from '../../shared/ui/category-icon/category-icon.component';
import { CheckboxComponent } from '../../shared/ui/checkbox/checkbox.component';
import { ChipDirective } from '../../shared/ui/chip/chip.directive';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/ui/error-state/error-state.component';
import { FieldComponent } from '../../shared/ui/field/field.component';
import { IconButtonDirective } from '../../shared/ui/icon-button/icon-button.directive';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import { ProgressComponent } from '../../shared/ui/progress/progress.component';
import { SegmentedComponent, SegmentedOption } from '../../shared/ui/segmented/segmented.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ToggleComponent } from '../../shared/ui/toggle/toggle.component';

interface Swatch {
  name: string;
  token: string;
  hex: string;
  note?: string;
}

interface TypeSample {
  className: string;
  name: string;
  spec: string;
  sample: string;
}

interface CategorySample {
  icon: string;
  color: string;
}

interface TableRow {
  name: string;
  category: string;
  amount: string;
  income: boolean;
}

const ICON_NAMES = [
  'plus', 'x', 'check', 'chev-down', 'chev-up', 'chev-right', 'chev-left', 'search', 'menu', 'arrow-up-right',
  'arrow-down-left', 'arrow-right', 'trash', 'pencil', 'user', 'users', 'grid', 'target', 'sliders', 'swap',
  'logout', 'calendar', 'mail', 'lock', 'eye', 'wallet', 'tag', 'message', 'help', 'download', 'filter', 'more',
  'alert', 'card', 'cart', 'home', 'zap', 'play', 'heart', 'nav', 'briefcase', 'coffee', 'phone', 'bell', 'shield',
  'trend', 'star', 'gift', 'layers', 'pie', 'file', 'ban', 'refresh', 'sort', 'info', 'pin', 'clock',
];

@Component({
  selector: 'sb-dev-kit',
  imports: [
    ReactiveFormsModule,
    AmountFieldComponent,
    AvatarComponent,
    BadgeComponent,
    BarChartComponent,
    ConfirmDialogComponent,
    DonutChartComponent,
    SelectComponent,
    ButtonDirective,
    CategoryIconComponent,
    CheckboxComponent,
    ChipDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    FieldComponent,
    IconButtonDirective,
    IconComponent,
    ModalComponent,
    PaginationComponent,
    ProgressComponent,
    SegmentedComponent,
    SkeletonComponent,
    ToggleComponent,
  ],
  templateUrl: './dev-kit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class DevKitComponent {
  protected readonly toast = inject(ToastService);

  protected readonly swatches: Swatch[] = [
    { name: 'Фон', token: '--color-bg', hex: '#000000', note: 'сторінка' },
    { name: 'Поверхня', token: '--color-surface', hex: '#1C1C1E', note: 'картки' },
    { name: 'Поверхня 2', token: '--color-surface-2', hex: '#262628', note: 'hover' },
    { name: 'Межа', token: '--color-border', hex: '#2F2F2F' },
    { name: 'Текст', token: '--color-text', hex: '#FFFFFF' },
    { name: 'Другорядний', token: '--color-text-secondary', hex: '#A0A1A8' },
    { name: 'Службовий', token: '--color-text-tertiary', hex: '#73757B' },
    { name: 'Акцент', token: '--color-accent', hex: '#6FDBD4', note: 'дії, доходи' },
    { name: 'Акцент темний', token: '--color-accent-strong', hex: '#1FC6BB' },
    { name: 'Помилка', token: '--color-danger', hex: '#FF6B6B', note: 'витрати понад ліміт' },
    { name: 'Попередження', token: '--color-warning', hex: '#FFB454' },
    { name: 'Фіолетовий', token: '--color-purple', hex: '#A78BFA', note: 'категорії' },
    { name: 'Рожевий', token: '--color-pink', hex: '#F472B6', note: 'категорії' },
    { name: 'Синій', token: '--color-blue', hex: '#60A5FA', note: 'категорії' },
  ];

  protected readonly typeSamples: TypeSample[] = [
    { className: 'text-display', name: 'Display', spec: '84/95 · Medium', sample: 'Порівняйте тарифи' },
    { className: 'text-h1', name: 'H1', spec: '60/74 · Regular + Bold', sample: 'Шлях до <b>фінансової свободи</b>' },
    { className: 'text-h2', name: 'H2', spec: '37/46 · Regular', sample: 'Жодних прихованих платежів' },
    { className: 'text-h3', name: 'H3', spec: '29/37 · Medium', sample: 'Огляд за листопад' },
    { className: 'text-h4', name: 'H4', spec: '21/26 · Semi Bold', sample: 'Витрати за категоріями' },
    { className: 'text-h5', name: 'H5', spec: '17/24 · Semi Bold', sample: 'Заголовок картки' },
    { className: 'text-lead', name: 'Lead', spec: '17/25 · Regular', sample: 'Плануйте бюджет і досягайте цілей без таблиць.' },
    { className: 'text-body', name: 'Body', spec: '15/22 · Regular', sample: 'Основний текст інтерфейсу кабінету та форм.' },
    { className: 'text-small', name: 'Small', spec: '13/18 · Regular', sample: 'Підписи, допоміжний текст, значення в таблицях.' },
    { className: 'text-tiny', name: 'Tiny', spec: '11/15 · Regular', sample: 'Службові примітки та юридичний текст' },
    { className: 'text-eyebrow', name: 'Eyebrow', spec: '14/18 · Upper · +0.3', sample: '400 000 користувачів і більше' },
    { className: 'text-label', name: 'Label', spec: '12/16 · Upper · Medium', sample: 'Заголовок колонки' },
  ];

  protected readonly badgeTones: { tone: BadgeTone; label: string }[] = [
    { tone: 'teal', label: 'Активний' },
    { tone: 'grey', label: 'Старт' },
    { tone: 'purple', label: 'Плюс' },
    { tone: 'red', label: 'Заблоковано' },
    { tone: 'amber', label: 'Понад ліміт' },
  ];

  protected readonly categories: CategorySample[] = [
    { icon: 'cart', color: '#6FDBD4' },
    { icon: 'home', color: '#A78BFA' },
    { icon: 'nav', color: '#60A5FA' },
    { icon: 'coffee', color: '#FFB454' },
    { icon: 'heart', color: '#F472B6' },
    { icon: 'briefcase', color: '#61D96C' },
    { icon: 'phone', color: '#A0A1A8' },
  ];

  protected readonly tableRows: TableRow[] = [
    { name: 'Сільпо', category: 'Продукти', amount: '−842,50 ₴', income: false },
    { name: 'Зарплата за листопад', category: 'Зарплата', amount: '+52 000 ₴', income: true },
    { name: 'Дуже довга назва транзакції, яка не вміщується в один рядок і має бути обрізана', category: 'Кафе й ресторани', amount: '−1 250 ₴', income: false },
  ];

  protected readonly iconNames = ICON_NAMES;

  protected readonly typeOptions: SegmentedOption[] = [
    { value: 'expense', label: 'Витрата' },
    { value: 'income', label: 'Дохід' },
  ];

  protected readonly periodOptions: SegmentedOption[] = [
    { value: 'month', label: 'Щомісяця' },
    { value: 'year', label: 'Щороку · −20%' },
  ];

  protected readonly selectOptions: SelectOption[] = [
    { value: 'food', label: 'Продукти' },
    { value: 'transport', label: 'Транспорт' },
    { value: 'cafe', label: 'Кафе й ресторани' },
  ];
  protected readonly selectControl = new FormControl('transport');
  protected readonly amountControl = new FormControl<number | null>(842.5);
  protected readonly confirmOpen = signal(false);
  protected readonly barData: BarChartDatum[] = [
    { label: 'Чер', income: 41000, expense: 29500 },
    { label: 'Лип', income: 44500, expense: 36200 },
    { label: 'Сер', income: 43000, expense: 27800 },
    { label: 'Вер', income: 48000, expense: 33400 },
    { label: 'Жов', income: 48200, expense: 27600 },
    { label: 'Лис', income: 52000, expense: 31480, current: true },
  ];
  protected readonly emptyBarData: BarChartDatum[] = [{ label: 'Лис', income: 0, expense: 0, current: true }];
  protected readonly donutData: DonutSegment[] = [
    { id: 'a', label: 'Житло', value: 14000, color: 'var(--color-purple)' },
    { id: 'b', label: 'Продукти', value: 7850, color: 'var(--color-accent)', selectable: true },
    { id: 'c', label: 'Кафе й ресторани', value: 3620, color: 'var(--color-warning)' },
    { id: 'd', label: 'Транспорт', value: 2410, color: 'var(--color-blue)' },
  ];
  protected readonly segmented = new FormControl('expense');
  protected readonly segmentedBlock = new FormControl('year');
  protected readonly checkboxOn = new FormControl(true);
  protected readonly checkboxOff = new FormControl(false);
  protected readonly checkboxDisabled = new FormControl({ value: true, disabled: true });
  protected readonly toggleOn = new FormControl(true);
  protected readonly toggleOff = new FormControl(false);
  protected readonly toggleDisabled = new FormControl({ value: false, disabled: true });

  protected readonly modalOpen = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly chipActive = signal('all');

  protected setChip(value: string): void {
    this.chipActive.set(value);
  }

  protected openModal(): void {
    this.modalOpen.set(true);
  }

  protected saveModal(): void {
    this.modalOpen.set(false);
    this.toast.success('Транзакцію збережено');
  }

  protected changePageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }
}
