/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import * as i0 from "@angular/core";
export class YouTubePlayerPlaceholder {
    /** Gets the background image showing the placeholder. */
    _getBackgroundImage() {
        let url;
        if (this.quality === 'low') {
            url = `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`;
        }
        else if (this.quality === 'high') {
            url = `https://i.ytimg.com/vi/${this.videoId}/maxresdefault.jpg`;
        }
        else {
            url = `https://i.ytimg.com/vi_webp/${this.videoId}/sddefault.webp`;
        }
        return `url(${url})`;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0", ngImport: i0, type: YouTubePlayerPlaceholder, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.2.0", type: YouTubePlayerPlaceholder, isStandalone: true, selector: "youtube-player-placeholder", inputs: { videoId: "videoId", width: "width", height: "height", isLoading: "isLoading", buttonLabel: "buttonLabel", quality: "quality" }, host: { properties: { "class.youtube-player-placeholder-loading": "isLoading", "style.background-image": "_getBackgroundImage()", "style.width.px": "width", "style.height.px": "height" }, classAttribute: "youtube-player-placeholder" }, ngImport: i0, template: `
    <button type="button" class="youtube-player-placeholder-button" [attr.aria-label]="buttonLabel">
      <svg
        height="100%"
        version="1.1"
        viewBox="0 0 68 48"
        focusable="false"
        aria-hidden="true">
        <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
        <path d="M 45,24 27,14 27,34" fill="#fff"></path>
      </svg>
    </button>
  `, isInline: true, styles: [".youtube-player-placeholder{display:flex;align-items:center;justify-content:center;width:100%;overflow:hidden;cursor:pointer;background-color:#000;background-position:center center;background-size:cover;transition:box-shadow 300ms ease;box-shadow:inset 0 120px 90px -90px rgba(0,0,0,.8)}.youtube-player-placeholder-button{transition:opacity 300ms ease;-moz-appearance:none;-webkit-appearance:none;background:none;border:none;padding:0;display:flex}.youtube-player-placeholder-button svg{width:68px;height:48px}.youtube-player-placeholder-loading{box-shadow:none}.youtube-player-placeholder-loading .youtube-player-placeholder-button{opacity:0}"], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0", ngImport: i0, type: YouTubePlayerPlaceholder, decorators: [{
            type: Component,
            args: [{ selector: 'youtube-player-placeholder', changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None, template: `
    <button type="button" class="youtube-player-placeholder-button" [attr.aria-label]="buttonLabel">
      <svg
        height="100%"
        version="1.1"
        viewBox="0 0 68 48"
        focusable="false"
        aria-hidden="true">
        <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
        <path d="M 45,24 27,14 27,34" fill="#fff"></path>
      </svg>
    </button>
  `, standalone: true, host: {
                        'class': 'youtube-player-placeholder',
                        '[class.youtube-player-placeholder-loading]': 'isLoading',
                        '[style.background-image]': '_getBackgroundImage()',
                        '[style.width.px]': 'width',
                        '[style.height.px]': 'height',
                    }, styles: [".youtube-player-placeholder{display:flex;align-items:center;justify-content:center;width:100%;overflow:hidden;cursor:pointer;background-color:#000;background-position:center center;background-size:cover;transition:box-shadow 300ms ease;box-shadow:inset 0 120px 90px -90px rgba(0,0,0,.8)}.youtube-player-placeholder-button{transition:opacity 300ms ease;-moz-appearance:none;-webkit-appearance:none;background:none;border:none;padding:0;display:flex}.youtube-player-placeholder-button svg{width:68px;height:48px}.youtube-player-placeholder-loading{box-shadow:none}.youtube-player-placeholder-loading .youtube-player-placeholder-button{opacity:0}"] }]
        }], propDecorators: { videoId: [{
                type: Input
            }], width: [{
                type: Input
            }], height: [{
                type: Input
            }], isLoading: [{
                type: Input
            }], buttonLabel: [{
                type: Input
            }], quality: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXItcGxhY2Vob2xkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXItcGxhY2Vob2xkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFDLHVCQUF1QixFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUMsTUFBTSxlQUFlLENBQUM7O0FBZ0MzRixNQUFNLE9BQU8sd0JBQXdCO0lBbUJuQyx5REFBeUQ7SUFDL0MsbUJBQW1CO1FBQzNCLElBQUksR0FBVyxDQUFDO1FBRWhCLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMzQixHQUFHLEdBQUcsMEJBQTBCLElBQUksQ0FBQyxPQUFPLGdCQUFnQixDQUFDO1FBQy9ELENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbkMsR0FBRyxHQUFHLDBCQUEwQixJQUFJLENBQUMsT0FBTyxvQkFBb0IsQ0FBQztRQUNuRSxDQUFDO2FBQU0sQ0FBQztZQUNOLEdBQUcsR0FBRywrQkFBK0IsSUFBSSxDQUFDLE9BQU8saUJBQWlCLENBQUM7UUFDckUsQ0FBQztRQUVELE9BQU8sT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUN2QixDQUFDOzhHQWhDVSx3QkFBd0I7a0dBQXhCLHdCQUF3Qiw0Y0F2QnpCOzs7Ozs7Ozs7Ozs7R0FZVDs7MkZBV1Usd0JBQXdCO2tCQTNCcEMsU0FBUzsrQkFDRSw0QkFBNEIsbUJBQ3JCLHVCQUF1QixDQUFDLE1BQU0saUJBQ2hDLGlCQUFpQixDQUFDLElBQUksWUFDM0I7Ozs7Ozs7Ozs7OztHQVlULGNBQ1csSUFBSSxRQUVWO3dCQUNKLE9BQU8sRUFBRSw0QkFBNEI7d0JBQ3JDLDRDQUE0QyxFQUFFLFdBQVc7d0JBQ3pELDBCQUEwQixFQUFFLHVCQUF1Qjt3QkFDbkQsa0JBQWtCLEVBQUUsT0FBTzt3QkFDM0IsbUJBQW1CLEVBQUUsUUFBUTtxQkFDOUI7OEJBSVEsT0FBTztzQkFBZixLQUFLO2dCQUdHLEtBQUs7c0JBQWIsS0FBSztnQkFHRyxNQUFNO3NCQUFkLEtBQUs7Z0JBR0csU0FBUztzQkFBakIsS0FBSztnQkFHRyxXQUFXO3NCQUFuQixLQUFLO2dCQUdHLE9BQU87c0JBQWYsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NoYW5nZURldGVjdGlvblN0cmF0ZWd5LCBDb21wb25lbnQsIElucHV0LCBWaWV3RW5jYXBzdWxhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKiAgUXVhbGl0eSBvZiB0aGUgcGxhY2Vob2xkZXIgaW1hZ2UuICAqL1xuZXhwb3J0IHR5cGUgUGxhY2Vob2xkZXJJbWFnZVF1YWxpdHkgPSAnaGlnaCcgfCAnc3RhbmRhcmQnIHwgJ2xvdyc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3lvdXR1YmUtcGxheWVyLXBsYWNlaG9sZGVyJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIHRlbXBsYXRlOiBgXG4gICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ5b3V0dWJlLXBsYXllci1wbGFjZWhvbGRlci1idXR0b25cIiBbYXR0ci5hcmlhLWxhYmVsXT1cImJ1dHRvbkxhYmVsXCI+XG4gICAgICA8c3ZnXG4gICAgICAgIGhlaWdodD1cIjEwMCVcIlxuICAgICAgICB2ZXJzaW9uPVwiMS4xXCJcbiAgICAgICAgdmlld0JveD1cIjAgMCA2OCA0OFwiXG4gICAgICAgIGZvY3VzYWJsZT1cImZhbHNlXCJcbiAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgIDxwYXRoIGQ9XCJNNjYuNTIsNy43NGMtMC43OC0yLjkzLTIuNDktNS40MS01LjQyLTYuMTlDNTUuNzksLjEzLDM0LDAsMzQsMFMxMi4yMSwuMTMsNi45LDEuNTUgQzMuOTcsMi4zMywyLjI3LDQuODEsMS40OCw3Ljc0QzAuMDYsMTMuMDUsMCwyNCwwLDI0czAuMDYsMTAuOTUsMS40OCwxNi4yNmMwLjc4LDIuOTMsMi40OSw1LjQxLDUuNDIsNi4xOSBDMTIuMjEsNDcuODcsMzQsNDgsMzQsNDhzMjEuNzktMC4xMywyNy4xLTEuNTVjMi45My0wLjc4LDQuNjQtMy4yNiw1LjQyLTYuMTlDNjcuOTQsMzQuOTUsNjgsMjQsNjgsMjRTNjcuOTQsMTMuMDUsNjYuNTIsNy43NHpcIiBmaWxsPVwiI2YwMFwiPjwvcGF0aD5cbiAgICAgICAgPHBhdGggZD1cIk0gNDUsMjQgMjcsMTQgMjcsMzRcIiBmaWxsPVwiI2ZmZlwiPjwvcGF0aD5cbiAgICAgIDwvc3ZnPlxuICAgIDwvYnV0dG9uPlxuICBgLFxuICBzdGFuZGFsb25lOiB0cnVlLFxuICBzdHlsZVVybDogJ3lvdXR1YmUtcGxheWVyLXBsYWNlaG9sZGVyLmNzcycsXG4gIGhvc3Q6IHtcbiAgICAnY2xhc3MnOiAneW91dHViZS1wbGF5ZXItcGxhY2Vob2xkZXInLFxuICAgICdbY2xhc3MueW91dHViZS1wbGF5ZXItcGxhY2Vob2xkZXItbG9hZGluZ10nOiAnaXNMb2FkaW5nJyxcbiAgICAnW3N0eWxlLmJhY2tncm91bmQtaW1hZ2VdJzogJ19nZXRCYWNrZ3JvdW5kSW1hZ2UoKScsXG4gICAgJ1tzdHlsZS53aWR0aC5weF0nOiAnd2lkdGgnLFxuICAgICdbc3R5bGUuaGVpZ2h0LnB4XSc6ICdoZWlnaHQnLFxuICB9LFxufSlcbmV4cG9ydCBjbGFzcyBZb3VUdWJlUGxheWVyUGxhY2Vob2xkZXIge1xuICAvKiogSUQgb2YgdGhlIHZpZGVvIGZvciB3aGljaCB0byBzaG93IHRoZSBwbGFjZWhvbGRlci4gKi9cbiAgQElucHV0KCkgdmlkZW9JZDogc3RyaW5nO1xuXG4gIC8qKiBXaWR0aCBvZiB0aGUgdmlkZW8gZm9yIHdoaWNoIHRvIHNob3cgdGhlIHBsYWNlaG9sZGVyLiAqL1xuICBASW5wdXQoKSB3aWR0aDogbnVtYmVyO1xuXG4gIC8qKiBIZWlnaHQgb2YgdGhlIHZpZGVvIGZvciB3aGljaCB0byBzaG93IHRoZSBwbGFjZWhvbGRlci4gKi9cbiAgQElucHV0KCkgaGVpZ2h0OiBudW1iZXI7XG5cbiAgLyoqIFdoZXRoZXIgdGhlIHZpZGVvIGlzIGN1cnJlbnRseSBiZWluZyBsb2FkZWQuICovXG4gIEBJbnB1dCgpIGlzTG9hZGluZzogYm9vbGVhbjtcblxuICAvKiogQWNjZXNzaWJsZSBsYWJlbCBmb3IgdGhlIHBsYXkgYnV0dG9uLiAqL1xuICBASW5wdXQoKSBidXR0b25MYWJlbDogc3RyaW5nO1xuXG4gIC8qKiBRdWFsaXR5IG9mIHRoZSBwbGFjZWhvbGRlciBpbWFnZS4gKi9cbiAgQElucHV0KCkgcXVhbGl0eTogUGxhY2Vob2xkZXJJbWFnZVF1YWxpdHk7XG5cbiAgLyoqIEdldHMgdGhlIGJhY2tncm91bmQgaW1hZ2Ugc2hvd2luZyB0aGUgcGxhY2Vob2xkZXIuICovXG4gIHByb3RlY3RlZCBfZ2V0QmFja2dyb3VuZEltYWdlKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IHVybDogc3RyaW5nO1xuXG4gICAgaWYgKHRoaXMucXVhbGl0eSA9PT0gJ2xvdycpIHtcbiAgICAgIHVybCA9IGBodHRwczovL2kueXRpbWcuY29tL3ZpLyR7dGhpcy52aWRlb0lkfS9ocWRlZmF1bHQuanBnYDtcbiAgICB9IGVsc2UgaWYgKHRoaXMucXVhbGl0eSA9PT0gJ2hpZ2gnKSB7XG4gICAgICB1cmwgPSBgaHR0cHM6Ly9pLnl0aW1nLmNvbS92aS8ke3RoaXMudmlkZW9JZH0vbWF4cmVzZGVmYXVsdC5qcGdgO1xuICAgIH0gZWxzZSB7XG4gICAgICB1cmwgPSBgaHR0cHM6Ly9pLnl0aW1nLmNvbS92aV93ZWJwLyR7dGhpcy52aWRlb0lkfS9zZGRlZmF1bHQud2VicGA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGB1cmwoJHt1cmx9KWA7XG4gIH1cbn1cbiJdfQ==