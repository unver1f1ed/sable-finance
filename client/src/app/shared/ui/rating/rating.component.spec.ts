import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { RatingComponent } from './rating.component';

describe('RatingComponent', () => {
  it('marks as many stars as the value and exposes the value to assistive technology', () => {
    const fixture = TestBed.createComponent(RatingComponent);
    fixture.componentRef.setInput('value', 4);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.rating__star--on').length).toBe(4);
    expect(root.querySelectorAll('.rating__star').length).toBe(5);
    expect(root.getAttribute('aria-label')).toBe('4 із 5');
    expect(root.getAttribute('role')).toBe('img');
  });
});
