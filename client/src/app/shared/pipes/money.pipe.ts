import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '../util/format';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, sign = false): string {
    return formatMoney(value ?? 0, { sign });
  }
}
