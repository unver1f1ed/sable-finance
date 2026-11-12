import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'sb-avatar',
  template: '{{ initials() }}',
  host: {
    '[class]': 'classes()',
    role: 'img',
    '[attr.aria-label]': 'name()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join(''),
  );

  protected readonly classes = computed(() => `avatar avatar--${this.size()}`);
}
