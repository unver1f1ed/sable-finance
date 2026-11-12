import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'sb-admin-faq-page',
  template: '<h1 class="text-h3">Довідка (FAQ)</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminFaqPageComponent {}
