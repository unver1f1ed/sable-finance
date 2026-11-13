import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  ViewEncapsulation,
  booleanAttribute,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { uniqueId } from '../unique-id';

@Component({
  selector: 'sb-field',
  imports: [IconComponent],
  templateUrl: './field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FieldComponent implements AfterContentInit {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly onSurface = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly variant = input<'default' | 'search' | 'pill'>('default');

  protected readonly controlId = signal(uniqueId('sb-field'));
  protected readonly messageId = uniqueId('sb-field-msg');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly control = signal<HTMLElement | null>(null);

  constructor() {
    effect(() => {
      const control = this.control();
      if (!control) {
        return;
      }
      const hasError = !!this.error();
      if (hasError) {
        this.renderer.setAttribute(control, 'aria-invalid', 'true');
      } else {
        this.renderer.removeAttribute(control, 'aria-invalid');
      }
      if (hasError || this.hint()) {
        this.renderer.setAttribute(control, 'aria-describedby', this.messageId);
      } else {
        this.renderer.removeAttribute(control, 'aria-describedby');
      }
    });
  }

  ngAfterContentInit(): void {
    const control = this.host.nativeElement.querySelector<HTMLElement>('input, select, textarea');
    if (!control) {
      return;
    }
    if (control.id) {
      this.controlId.set(control.id);
    } else {
      this.renderer.setAttribute(control, 'id', this.controlId());
    }
    this.control.set(control);
  }
}
