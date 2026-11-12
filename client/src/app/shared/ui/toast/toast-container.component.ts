import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService } from './toast.service';

@Component({
  selector: 'sb-toast-container',
  imports: [IconComponent],
  templateUrl: './toast-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ToastContainerComponent {
  protected readonly service = inject(ToastService);
}
