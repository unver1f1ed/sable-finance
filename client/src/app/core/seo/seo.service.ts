import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const SITE_ORIGIN = 'https://red-smoke-06a408310.5.azurestaticapps.net';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  init(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.update());
  }

  private update(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const description = route.data['description'] as string | undefined;
    const noindex = route.data['noindex'] === true;

    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
    } else {
      this.meta.removeTag('name="description"');
    }

    if (noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }

    this.updateShareTags(noindex, description);
  }

  private updateShareTags(noindex: boolean, description: string | undefined): void {
    const link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (noindex) {
      link?.remove();
      return;
    }
    const path = this.router.url.split(/[?#]/)[0];
    const url = `${SITE_ORIGIN}${path === '/' ? '' : path}`;
    const canonical = link ?? this.document.head.appendChild(this.document.createElement('link'));
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', url);
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Sable' });
    this.meta.updateTag({ property: 'og:title', content: this.title.getTitle() });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: `${SITE_ORIGIN}/images/hero-cards.webp` });
    if (description) {
      this.meta.updateTag({ property: 'og:description', content: description });
    }
  }
}
