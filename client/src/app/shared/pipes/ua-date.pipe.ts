import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '../util/format';

@Pipe({ name: 'uaDate' })
export class UaDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? formatDate(value) : '';
  }
}
