/// <reference types="youtube" />
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1265
/// <reference types="youtube" />
import { ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, Output, ViewChild, ViewEncapsulation, Inject, PLATFORM_ID, booleanAttribute, numberAttribute, InjectionToken, inject, CSP_NONCE, ChangeDetectorRef, } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of as observableOf, Subject, BehaviorSubject, fromEventPattern } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { YouTubePlayerPlaceholder } from './youtube-player-placeholder';
import * as i0 from "@angular/core";
/** Injection token used to configure the `YouTubePlayer`. */
export const YOUTUBE_PLAYER_CONFIG = new InjectionToken('YOUTUBE_PLAYER_CONFIG');
export const DEFAULT_PLAYER_WIDTH = 640;
export const DEFAULT_PLAYER_HEIGHT = 390;
/** Coercion function for time values. */
function coerceTime(value) {
    return value == null ? value : numberAttribute(value, 0);
}
/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export class YouTubePlayer {
    /** Height of video player */
    get height() {
        return this._height;
    }
    set height(height) {
        this._height = height == null || isNaN(height) ? DEFAULT_PLAYER_HEIGHT : height;
    }
    /** Width of video player */
    get width() {
        return this._width;
    }
    set width(width) {
        this._width = width == null || isNaN(width) ? DEFAULT_PLAYER_WIDTH : width;
    }
    constructor(_ngZone, platformId) {
        this._ngZone = _ngZone;
        this._destroyed = new Subject();
        this._playerChanges = new BehaviorSubject(undefined);
        this._nonce = inject(CSP_NONCE, { optional: true });
        this._changeDetectorRef = inject(ChangeDetectorRef);
        this._isLoading = false;
        this._hasPlaceholder = true;
        this._height = DEFAULT_PLAYER_HEIGHT;
        this._width = DEFAULT_PLAYER_WIDTH;
        /** Whether cookies inside the player have been disabled. */
        this.disableCookies = false;
        /**
         * By default the player shows a placeholder image instead of loading the YouTube API which
         * improves the initial page load performance. This input allows for the behavior to be disabled.
         */
        this.disablePlaceholder = false;
        /**
         * Whether the iframe will attempt to load regardless of the status of the api on the
         * page. Set this to true if you don't want the `onYouTubeIframeAPIReady` field to be
         * set on the global window.
         */
        this.showBeforeIframeApiLoads = false;
        /** Outputs are direct proxies from the player itself. */
        this.ready = this._getLazyEmitter('onReady');
        this.stateChange = this._getLazyEmitter('onStateChange');
        this.error = this._getLazyEmitter('onError');
        this.apiChange = this._getLazyEmitter('onApiChange');
        this.playbackQualityChange = this._getLazyEmitter('onPlaybackQualityChange');
        this.playbackRateChange = this._getLazyEmitter('onPlaybackRateChange');
        const config = inject(YOUTUBE_PLAYER_CONFIG, { optional: true });
        this.loadApi = config?.loadApi ?? true;
        this.disablePlaceholder = !!config?.disablePlaceholder;
        this.placeholderButtonLabel = config?.placeholderButtonLabel || 'Play video';
        this.placeholderImageQuality = config?.placeholderImageQuality || 'standard';
        this._isBrowser = isPlatformBrowser(platformId);
    }
    ngAfterViewInit() {
        this._conditionallyLoad();
    }
    ngOnChanges(changes) {
        if (this._shouldRecreatePlayer(changes)) {
            this._conditionallyLoad();
        }
        else if (this._player) {
            if (changes['width'] || changes['height']) {
                this._setSize();
            }
            if (changes['suggestedQuality']) {
                this._setQuality();
            }
            if (changes['startSeconds'] || changes['endSeconds'] || changes['suggestedQuality']) {
                this._cuePlayer();
            }
        }
    }
    ngOnDestroy() {
        this._pendingPlayer?.destroy();
        if (this._player) {
            this._player.destroy();
            window.onYouTubeIframeAPIReady = this._existingApiReadyCallback;
        }
        this._playerChanges.complete();
        this._destroyed.next();
        this._destroyed.complete();
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#playVideo */
    playVideo() {
        if (this._player) {
            this._player.playVideo();
        }
        else {
            this._getPendingState().playbackState = YT.PlayerState.PLAYING;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#pauseVideo */
    pauseVideo() {
        if (this._player) {
            this._player.pauseVideo();
        }
        else {
            this._getPendingState().playbackState = YT.PlayerState.PAUSED;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#stopVideo */
    stopVideo() {
        if (this._player) {
            this._player.stopVideo();
        }
        else {
            // It seems like YouTube sets the player to CUED when it's stopped.
            this._getPendingState().playbackState = YT.PlayerState.CUED;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#seekTo */
    seekTo(seconds, allowSeekAhead) {
        if (this._player) {
            this._player.seekTo(seconds, allowSeekAhead);
        }
        else {
            this._getPendingState().seek = { seconds, allowSeekAhead };
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#mute */
    mute() {
        if (this._player) {
            this._player.mute();
        }
        else {
            this._getPendingState().muted = true;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#unMute */
    unMute() {
        if (this._player) {
            this._player.unMute();
        }
        else {
            this._getPendingState().muted = false;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#isMuted */
    isMuted() {
        if (this._player) {
            return this._player.isMuted();
        }
        if (this._pendingPlayerState) {
            return !!this._pendingPlayerState.muted;
        }
        return false;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#setVolume */
    setVolume(volume) {
        if (this._player) {
            this._player.setVolume(volume);
        }
        else {
            this._getPendingState().volume = volume;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getVolume */
    getVolume() {
        if (this._player) {
            return this._player.getVolume();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.volume != null) {
            return this._pendingPlayerState.volume;
        }
        return 0;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#setPlaybackRate */
    setPlaybackRate(playbackRate) {
        if (this._player) {
            return this._player.setPlaybackRate(playbackRate);
        }
        else {
            this._getPendingState().playbackRate = playbackRate;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlaybackRate */
    getPlaybackRate() {
        if (this._player) {
            return this._player.getPlaybackRate();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.playbackRate != null) {
            return this._pendingPlayerState.playbackRate;
        }
        return 0;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getAvailablePlaybackRates */
    getAvailablePlaybackRates() {
        return this._player ? this._player.getAvailablePlaybackRates() : [];
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoLoadedFraction */
    getVideoLoadedFraction() {
        return this._player ? this._player.getVideoLoadedFraction() : 0;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlayerState */
    getPlayerState() {
        if (!this._isBrowser || !window.YT) {
            return undefined;
        }
        if (this._player) {
            return this._player.getPlayerState();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.playbackState != null) {
            return this._pendingPlayerState.playbackState;
        }
        return YT.PlayerState.UNSTARTED;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getCurrentTime */
    getCurrentTime() {
        if (this._player) {
            return this._player.getCurrentTime();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.seek) {
            return this._pendingPlayerState.seek.seconds;
        }
        return 0;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlaybackQuality */
    getPlaybackQuality() {
        return this._player ? this._player.getPlaybackQuality() : 'default';
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getAvailableQualityLevels */
    getAvailableQualityLevels() {
        return this._player ? this._player.getAvailableQualityLevels() : [];
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getDuration */
    getDuration() {
        return this._player ? this._player.getDuration() : 0;
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoUrl */
    getVideoUrl() {
        return this._player ? this._player.getVideoUrl() : '';
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoEmbedCode */
    getVideoEmbedCode() {
        return this._player ? this._player.getVideoEmbedCode() : '';
    }
    /**
     * Loads the YouTube API and sets up the player.
     * @param playVideo Whether to automatically play the video once the player is loaded.
     */
    _load(playVideo) {
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        if (!window.YT || !window.YT.Player) {
            if (this.loadApi) {
                this._isLoading = true;
                loadApi(this._nonce);
            }
            else if (this.showBeforeIframeApiLoads && (typeof ngDevMode === 'undefined' || ngDevMode)) {
                throw new Error('Namespace YT not found, cannot construct embedded youtube player. ' +
                    'Please install the YouTube Player API Reference for iframe Embeds: ' +
                    'https://developers.google.com/youtube/iframe_api_reference');
            }
            this._existingApiReadyCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                this._existingApiReadyCallback?.();
                this._ngZone.run(() => this._createPlayer(playVideo));
            };
        }
        else {
            this._createPlayer(playVideo);
        }
    }
    /** Loads the player depending on the internal state of the component. */
    _conditionallyLoad() {
        // If the placeholder isn't shown anymore, we have to trigger a load.
        if (!this._shouldShowPlaceholder()) {
            this._load(false);
        }
        else if (this.playerVars?.autoplay === 1) {
            // If it's an autoplaying video, we have to hide the placeholder and start playing.
            this._load(true);
        }
    }
    /** Whether to show the placeholder element. */
    _shouldShowPlaceholder() {
        if (this.disablePlaceholder) {
            return false;
        }
        // Since we don't load the API on the server, we show the placeholder permanently.
        if (!this._isBrowser) {
            return true;
        }
        return this._hasPlaceholder && !!this.videoId && !this._player;
    }
    /** Gets an object that should be used to store the temporary API state. */
    _getPendingState() {
        if (!this._pendingPlayerState) {
            this._pendingPlayerState = {};
        }
        return this._pendingPlayerState;
    }
    /**
     * Determines whether a change in the component state
     * requires the YouTube player to be recreated.
     */
    _shouldRecreatePlayer(changes) {
        const change = changes['videoId'] ||
            changes['playerVars'] ||
            changes['disableCookies'] ||
            changes['disablePlaceholder'];
        return !!change && !change.isFirstChange();
    }
    /**
     * Creates a new YouTube player and destroys the existing one.
     * @param playVideo Whether to play the video once it loads.
     */
    _createPlayer(playVideo) {
        this._player?.destroy();
        this._pendingPlayer?.destroy();
        // A player can't be created if the API isn't loaded,
        // or there isn't a video or playlist to be played.
        if (typeof YT === 'undefined' || (!this.videoId && !this.playerVars?.list)) {
            return;
        }
        // Important! We need to create the Player object outside of the `NgZone`, because it kicks
        // off a 250ms setInterval which will continually trigger change detection if we don't.
        const player = this._ngZone.runOutsideAngular(() => new YT.Player(this.youtubeContainer.nativeElement, {
            videoId: this.videoId,
            host: this.disableCookies ? 'https://www.youtube-nocookie.com' : undefined,
            width: this.width,
            height: this.height,
            // Calling `playVideo` on load doesn't appear to actually play
            // the video so we need to trigger it through `playerVars` instead.
            playerVars: playVideo ? { ...(this.playerVars || {}), autoplay: 1 } : this.playerVars,
        }));
        const whenReady = () => {
            // Only assign the player once it's ready, otherwise YouTube doesn't expose some APIs.
            this._ngZone.run(() => {
                this._isLoading = false;
                this._hasPlaceholder = false;
                this._player = player;
                this._pendingPlayer = undefined;
                player.removeEventListener('onReady', whenReady);
                this._playerChanges.next(player);
                this._setSize();
                this._setQuality();
                if (this._pendingPlayerState) {
                    this._applyPendingPlayerState(player, this._pendingPlayerState);
                    this._pendingPlayerState = undefined;
                }
                // Only cue the player when it either hasn't started yet or it's cued,
                // otherwise cuing it can interrupt a player with autoplay enabled.
                const state = player.getPlayerState();
                if (state === YT.PlayerState.UNSTARTED || state === YT.PlayerState.CUED || state == null) {
                    this._cuePlayer();
                }
                this._changeDetectorRef.markForCheck();
            });
        };
        this._pendingPlayer = player;
        player.addEventListener('onReady', whenReady);
    }
    /** Applies any state that changed before the player was initialized. */
    _applyPendingPlayerState(player, pendingState) {
        const { playbackState, playbackRate, volume, muted, seek } = pendingState;
        switch (playbackState) {
            case YT.PlayerState.PLAYING:
                player.playVideo();
                break;
            case YT.PlayerState.PAUSED:
                player.pauseVideo();
                break;
            case YT.PlayerState.CUED:
                player.stopVideo();
                break;
        }
        if (playbackRate != null) {
            player.setPlaybackRate(playbackRate);
        }
        if (volume != null) {
            player.setVolume(volume);
        }
        if (muted != null) {
            muted ? player.mute() : player.unMute();
        }
        if (seek != null) {
            player.seekTo(seek.seconds, seek.allowSeekAhead);
        }
    }
    /** Cues the player based on the current component state. */
    _cuePlayer() {
        if (this._player && this.videoId) {
            this._player.cueVideoById({
                videoId: this.videoId,
                startSeconds: this.startSeconds,
                endSeconds: this.endSeconds,
                suggestedQuality: this.suggestedQuality,
            });
        }
    }
    /** Sets the player's size based on the current input values. */
    _setSize() {
        this._player?.setSize(this.width, this.height);
    }
    /** Sets the player's quality based on the current input values. */
    _setQuality() {
        if (this._player && this.suggestedQuality) {
            this._player.setPlaybackQuality(this.suggestedQuality);
        }
    }
    /** Gets an observable that adds an event listener to the player when a user subscribes to it. */
    _getLazyEmitter(name) {
        // Start with the stream of players. This way the events will be transferred
        // over to the new player if it gets swapped out under-the-hood.
        return this._playerChanges.pipe(
        // Switch to the bound event. `switchMap` ensures that the old event is removed when the
        // player is changed. If there's no player, return an observable that never emits.
        switchMap(player => {
            return player
                ? fromEventPattern((listener) => {
                    player.addEventListener(name, listener);
                }, (listener) => {
                    // The API seems to throw when we try to unbind from a destroyed player and it doesn't
                    // expose whether the player has been destroyed so we have to wrap it in a try/catch to
                    // prevent the entire stream from erroring out.
                    try {
                        player?.removeEventListener?.(name, listener);
                    }
                    catch { }
                })
                : observableOf();
        }), 
        // By default we run all the API interactions outside the zone
        // so we have to bring the events back in manually when they emit.
        source => new Observable(observer => source.subscribe({
            next: value => this._ngZone.run(() => observer.next(value)),
            error: error => observer.error(error),
            complete: () => observer.complete(),
        })), 
        // Ensures that everything is cleared out on destroy.
        takeUntil(this._destroyed));
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.2.0", ngImport: i0, type: YouTubePlayer, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "17.2.0", type: YouTubePlayer, isStandalone: true, selector: "youtube-player", inputs: { videoId: "videoId", height: ["height", "height", numberAttribute], width: ["width", "width", numberAttribute], startSeconds: ["startSeconds", "startSeconds", coerceTime], endSeconds: ["endSeconds", "endSeconds", coerceTime], suggestedQuality: "suggestedQuality", playerVars: "playerVars", disableCookies: ["disableCookies", "disableCookies", booleanAttribute], loadApi: ["loadApi", "loadApi", booleanAttribute], disablePlaceholder: ["disablePlaceholder", "disablePlaceholder", booleanAttribute], showBeforeIframeApiLoads: ["showBeforeIframeApiLoads", "showBeforeIframeApiLoads", booleanAttribute], placeholderButtonLabel: "placeholderButtonLabel", placeholderImageQuality: "placeholderImageQuality" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: `
    @if (_shouldShowPlaceholder()) {
      <youtube-player-placeholder
        [videoId]="videoId!"
        [width]="width"
        [height]="height"
        [isLoading]="_isLoading"
        [buttonLabel]="placeholderButtonLabel"
        [quality]="placeholderImageQuality"
        (click)="_load(true)"/>
    }
    <div [style.display]="_shouldShowPlaceholder() ? 'none' : ''">
      <div #youtubeContainer></div>
    </div>
  `, isInline: true, dependencies: [{ kind: "component", type: YouTubePlayerPlaceholder, selector: "youtube-player-placeholder", inputs: ["videoId", "width", "height", "isLoading", "buttonLabel", "quality"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.2.0", ngImport: i0, type: YouTubePlayer, decorators: [{
            type: Component,
            args: [{
                    selector: 'youtube-player',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None,
                    standalone: true,
                    imports: [YouTubePlayerPlaceholder],
                    template: `
    @if (_shouldShowPlaceholder()) {
      <youtube-player-placeholder
        [videoId]="videoId!"
        [width]="width"
        [height]="height"
        [isLoading]="_isLoading"
        [buttonLabel]="placeholderButtonLabel"
        [quality]="placeholderImageQuality"
        (click)="_load(true)"/>
    }
    <div [style.display]="_shouldShowPlaceholder() ? 'none' : ''">
      <div #youtubeContainer></div>
    </div>
  `,
                }]
        }], ctorParameters: () => [{ type: i0.NgZone }, { type: Object, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }], propDecorators: { videoId: [{
                type: Input
            }], height: [{
                type: Input,
                args: [{ transform: numberAttribute }]
            }], width: [{
                type: Input,
                args: [{ transform: numberAttribute }]
            }], startSeconds: [{
                type: Input,
                args: [{ transform: coerceTime }]
            }], endSeconds: [{
                type: Input,
                args: [{ transform: coerceTime }]
            }], suggestedQuality: [{
                type: Input
            }], playerVars: [{
                type: Input
            }], disableCookies: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], loadApi: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], disablePlaceholder: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], showBeforeIframeApiLoads: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], placeholderButtonLabel: [{
                type: Input
            }], placeholderImageQuality: [{
                type: Input
            }], ready: [{
                type: Output
            }], stateChange: [{
                type: Output
            }], error: [{
                type: Output
            }], apiChange: [{
                type: Output
            }], playbackQualityChange: [{
                type: Output
            }], playbackRateChange: [{
                type: Output
            }], youtubeContainer: [{
                type: ViewChild,
                args: ['youtubeContainer', { static: true }]
            }] } });
let apiLoaded = false;
/** Loads the YouTube API from a specified URL only once. */
function loadApi(nonce) {
    if (apiLoaded) {
        return;
    }
    // We can use `document` directly here, because this logic doesn't run outside the browser.
    const url = 'https://www.youtube.com/iframe_api';
    const script = document.createElement('script');
    const callback = (event) => {
        script.removeEventListener('load', callback);
        script.removeEventListener('error', callback);
        if (event.type === 'error') {
            apiLoaded = false;
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                console.error(`Failed to load YouTube API from ${url}`);
            }
        }
    };
    script.addEventListener('load', callback);
    script.addEventListener('error', callback);
    script.src = url;
    script.async = true;
    if (nonce) {
        script.nonce = nonce;
    }
    // Set this immediately to true so we don't start loading another script
    // while this one is pending. If loading fails, we'll flip it back to false.
    apiLoaded = true;
    document.body.appendChild(script);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU0EsaUNBQWlDO0FBVGpDOzs7Ozs7R0FNRztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBRU4sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsTUFBTSxFQUNOLFdBQVcsRUFHWCxnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLGNBQWMsRUFDZCxNQUFNLEVBQ04sU0FBUyxFQUNULGlCQUFpQixHQUVsQixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNsRCxPQUFPLEVBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxZQUFZLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNoRyxPQUFPLEVBQUMsU0FBUyxFQUFFLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3BELE9BQU8sRUFBMEIsd0JBQXdCLEVBQUMsTUFBTSw4QkFBOEIsQ0FBQzs7QUFTL0YsNkRBQTZEO0FBQzdELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksY0FBYyxDQUNyRCx1QkFBdUIsQ0FDeEIsQ0FBQztBQXdCRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7QUFDeEMsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDO0FBY3pDLHlDQUF5QztBQUN6QyxTQUFTLFVBQVUsQ0FBQyxLQUF5QjtJQUMzQyxPQUFPLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFD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QUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLE1BQWMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQzFCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBRXBCLElBQUksS0FBSyxFQUFFLENBQUM7UUFDVixNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0lBRUQsd0VBQXdFO0lBQ3hFLDRFQUE0RTtJQUM1RSxTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gV29ya2Fyb3VuZCBmb3I6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvMTI2NVxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ5b3V0dWJlXCIgLz5cblxuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25EZXN0cm95LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIEluamVjdCxcbiAgUExBVEZPUk1fSUQsXG4gIE9uQ2hhbmdlcyxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgYm9vbGVhbkF0dHJpYnV0ZSxcbiAgbnVtYmVyQXR0cmlidXRlLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgaW5qZWN0LFxuICBDU1BfTk9OQ0UsXG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBBZnRlclZpZXdJbml0LFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7aXNQbGF0Zm9ybUJyb3dzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQge09ic2VydmFibGUsIG9mIGFzIG9ic2VydmFibGVPZiwgU3ViamVjdCwgQmVoYXZpb3JTdWJqZWN0LCBmcm9tRXZlbnRQYXR0ZXJufSBmcm9tICdyeGpzJztcbmltcG9ydCB7dGFrZVVudGlsLCBzd2l0Y2hNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7UGxhY2Vob2xkZXJJbWFnZVF1YWxpdHksIFlvdVR1YmVQbGF5ZXJQbGFjZWhvbGRlcn0gZnJvbSAnLi95b3V0dWJlLXBsYXllci1wbGFjZWhvbGRlcic7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgWVQ6IHR5cGVvZiBZVCB8IHVuZGVmaW5lZDtcbiAgICBvbllvdVR1YmVJZnJhbWVBUElSZWFkeTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKiBJbmplY3Rpb24gdG9rZW4gdXNlZCB0byBjb25maWd1cmUgdGhlIGBZb3VUdWJlUGxheWVyYC4gKi9cbmV4cG9ydCBjb25zdCBZT1VUVUJFX1BMQVlFUl9DT05GSUcgPSBuZXcgSW5qZWN0aW9uVG9rZW48WW91VHViZVBsYXllckNvbmZpZz4oXG4gICdZT1VUVUJFX1BMQVlFUl9DT05GSUcnLFxuKTtcblxuLyoqIE9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIGNvbmZpZ3VyZSB0aGUgYFlvdVR1YmVQbGF5ZXJgLiAqL1xuZXhwb3J0IGludGVyZmFjZSBZb3VUdWJlUGxheWVyQ29uZmlnIHtcbiAgLyoqIFdoZXRoZXIgdG8gbG9hZCB0aGUgWW91VHViZSBpZnJhbWUgQVBJIGF1dG9tYXRpY2FsbHkuIERlZmF1bHRzIHRvIGB0cnVlYC4gKi9cbiAgbG9hZEFwaT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEJ5IGRlZmF1bHQgdGhlIHBsYXllciBzaG93cyBhIHBsYWNlaG9sZGVyIGltYWdlIGluc3RlYWQgb2YgbG9hZGluZyB0aGUgWW91VHViZSBBUEkgd2hpY2hcbiAgICogaW1wcm92ZXMgdGhlIGluaXRpYWwgcGFnZSBsb2FkIHBlcmZvcm1hbmNlLiBVc2UgdGhpcyBvcHRpb24gdG8gZGlzYWJsZSB0aGUgcGxhY2Vob2xkZXIgbG9hZGluZ1xuICAgKiBiZWhhdmlvciBnbG9iYWxseS4gRGVmYXVsdHMgdG8gYGZhbHNlYC5cbiAgICovXG4gIGRpc2FibGVQbGFjZWhvbGRlcj86IGJvb2xlYW47XG5cbiAgLyoqIEFjY2Vzc2libGUgbGFiZWwgZm9yIHRoZSBwbGF5IGJ1dHRvbiBpbnNpZGUgb2YgdGhlIHBsYWNlaG9sZGVyLiAqL1xuICBwbGFjZWhvbGRlckJ1dHRvbkxhYmVsPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBRdWFsaXR5IG9mIHRoZSBkaXNwbGF5ZWQgcGxhY2Vob2xkZXIgaW1hZ2UuIERlZmF1bHRzIHRvIGBzdGFuZGFyZGAsXG4gICAqIGJlY2F1c2Ugbm90IGFsbCB2aWRlbyBoYXZlIGEgaGlnaC1xdWFsaXR5IHBsYWNlaG9sZGVyLlxuICAgKi9cbiAgcGxhY2Vob2xkZXJJbWFnZVF1YWxpdHk/OiBQbGFjZWhvbGRlckltYWdlUXVhbGl0eTtcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX1dJRFRIID0gNjQwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX0hFSUdIVCA9IDM5MDtcblxuLyoqXG4gKiBPYmplY3QgdXNlZCB0byBzdG9yZSB0aGUgc3RhdGUgb2YgdGhlIHBsYXllciBpZiB0aGVcbiAqIHVzZXIgdHJpZXMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgQVBJIGJlZm9yZSBpdCBoYXMgYmVlbiBsb2FkZWQuXG4gKi9cbmludGVyZmFjZSBQZW5kaW5nUGxheWVyU3RhdGUge1xuICBwbGF5YmFja1N0YXRlPzogWVQuUGxheWVyU3RhdGUuUExBWUlORyB8IFlULlBsYXllclN0YXRlLlBBVVNFRCB8IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gIHBsYXliYWNrUmF0ZT86IG51bWJlcjtcbiAgdm9sdW1lPzogbnVtYmVyO1xuICBtdXRlZD86IGJvb2xlYW47XG4gIHNlZWs/OiB7c2Vjb25kczogbnVtYmVyOyBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbn07XG59XG5cbi8qKiBDb2VyY2lvbiBmdW5jdGlvbiBmb3IgdGltZSB2YWx1ZXMuICovXG5mdW5jdGlvbiBjb2VyY2VUaW1lKHZhbHVlOiBudW1iZXIgfCB1bmRlZmluZWQpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICByZXR1cm4gdmFsdWUgPT0gbnVsbCA/IHZhbHVlIDogbnVtYmVyQXR0cmlidXRlKHZhbHVlLCAwKTtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNvbXBvbmVudCB0aGF0IHJlbmRlcnMgYSBZb3VUdWJlIHBsYXllciB2aWEgdGhlIFlvdVR1YmUgcGxheWVyXG4gKiBpZnJhbWUgQVBJLlxuICogQHNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3lvdXR1YmUtcGxheWVyJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG4gIGltcG9ydHM6IFtZb3VUdWJlUGxheWVyUGxhY2Vob2xkZXJdLFxuICB0ZW1wbGF0ZTogYFxuICAgIEBpZiAoX3Nob3VsZFNob3dQbGFjZWhvbGRlcigpKSB7XG4gICAgICA8eW91dHViZS1wbGF5ZXItcGxhY2Vob2xkZXJcbiAgICAgICAgW3ZpZGVvSWRdPVwidmlkZW9JZCFcIlxuICAgICAgICBbd2lkdGhdPVwid2lkdGhcIlxuICAgICAgICBbaGVpZ2h0XT1cImhlaWdodFwiXG4gICAgICAgIFtpc0xvYWRpbmddPVwiX2lzTG9hZGluZ1wiXG4gICAgICAgIFtidXR0b25MYWJlbF09XCJwbGFjZWhvbGRlckJ1dHRvbkxhYmVsXCJcbiAgICAgICAgW3F1YWxpdHldPVwicGxhY2Vob2xkZXJJbWFnZVF1YWxpdHlcIlxuICAgICAgICAoY2xpY2spPVwiX2xvYWQodHJ1ZSlcIi8+XG4gICAgfVxuICAgIDxkaXYgW3N0eWxlLmRpc3BsYXldPVwiX3Nob3VsZFNob3dQbGFjZWhvbGRlcigpID8gJ25vbmUnIDogJydcIj5cbiAgICAgIDxkaXYgI3lvdXR1YmVDb250YWluZXI+PC9kaXY+XG4gICAgPC9kaXY+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIFlvdVR1YmVQbGF5ZXIgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkNoYW5nZXMsIE9uRGVzdHJveSB7XG4gIC8qKiBXaGV0aGVyIHdlJ3JlIGN1cnJlbnRseSByZW5kZXJpbmcgaW5zaWRlIGEgYnJvd3Nlci4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfaXNCcm93c2VyOiBib29sZWFuO1xuICBwcml2YXRlIF9wbGF5ZXI6IFlULlBsYXllciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGVuZGluZ1BsYXllcjogWVQuUGxheWVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGVuZGluZ1BsYXllclN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3llZCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3BsYXllckNoYW5nZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlBsYXllciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgcHJpdmF0ZSByZWFkb25seSBfbm9uY2UgPSBpbmplY3QoQ1NQX05PTkNFLCB7b3B0aW9uYWw6IHRydWV9KTtcbiAgcHJpdmF0ZSByZWFkb25seSBfY2hhbmdlRGV0ZWN0b3JSZWYgPSBpbmplY3QoQ2hhbmdlRGV0ZWN0b3JSZWYpO1xuICBwcm90ZWN0ZWQgX2lzTG9hZGluZyA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgX2hhc1BsYWNlaG9sZGVyID0gdHJ1ZTtcblxuICAvKiogWW91VHViZSBWaWRlbyBJRCB0byB2aWV3ICovXG4gIEBJbnB1dCgpXG4gIHZpZGVvSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKiogSGVpZ2h0IG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogbnVtYmVyQXR0cmlidXRlfSlcbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gIH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodCA9PSBudWxsIHx8IGlzTmFOKGhlaWdodCkgPyBERUZBVUxUX1BMQVlFUl9IRUlHSFQgOiBoZWlnaHQ7XG4gIH1cbiAgcHJpdmF0ZSBfaGVpZ2h0ID0gREVGQVVMVF9QTEFZRVJfSEVJR0hUO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KHt0cmFuc2Zvcm06IG51bWJlckF0dHJpYnV0ZX0pXG4gIGdldCB3aWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl93aWR0aDtcbiAgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGggPT0gbnVsbCB8fCBpc05hTih3aWR0aCkgPyBERUZBVUxUX1BMQVlFUl9XSURUSCA6IHdpZHRoO1xuICB9XG4gIHByaXZhdGUgX3dpZHRoID0gREVGQVVMVF9QTEFZRVJfV0lEVEg7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0YXJ0IHBsYXlpbmcgKi9cbiAgQElucHV0KHt0cmFuc2Zvcm06IGNvZXJjZVRpbWV9KVxuICBzdGFydFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RvcCBwbGF5aW5nICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBjb2VyY2VUaW1lfSlcbiAgZW5kU2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBUaGUgc3VnZ2VzdGVkIHF1YWxpdHkgb2YgdGhlIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBzdWdnZXN0ZWRRdWFsaXR5OiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEV4dHJhIHBhcmFtZXRlcnMgdXNlZCB0byBjb25maWd1cmUgdGhlIHBsYXllci4gU2VlOlxuICAgKiBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL3BsYXllcl9wYXJhbWV0ZXJzLmh0bWw/cGxheWVyVmVyc2lvbj1IVE1MNSNQYXJhbWV0ZXJzXG4gICAqL1xuICBASW5wdXQoKVxuICBwbGF5ZXJWYXJzOiBZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBXaGV0aGVyIGNvb2tpZXMgaW5zaWRlIHRoZSBwbGF5ZXIgaGF2ZSBiZWVuIGRpc2FibGVkLiAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pXG4gIGRpc2FibGVDb29raWVzOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqIFdoZXRoZXIgdG8gYXV0b21hdGljYWxseSBsb2FkIHRoZSBZb3VUdWJlIGlmcmFtZSBBUEkuIERlZmF1bHRzIHRvIGB0cnVlYC4gKi9cbiAgQElucHV0KHt0cmFuc2Zvcm06IGJvb2xlYW5BdHRyaWJ1dGV9KVxuICBsb2FkQXBpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBCeSBkZWZhdWx0IHRoZSBwbGF5ZXIgc2hvd3MgYSBwbGFjZWhvbGRlciBpbWFnZSBpbnN0ZWFkIG9mIGxvYWRpbmcgdGhlIFlvdVR1YmUgQVBJIHdoaWNoXG4gICAqIGltcHJvdmVzIHRoZSBpbml0aWFsIHBhZ2UgbG9hZCBwZXJmb3JtYW5jZS4gVGhpcyBpbnB1dCBhbGxvd3MgZm9yIHRoZSBiZWhhdmlvciB0byBiZSBkaXNhYmxlZC5cbiAgICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBib29sZWFuQXR0cmlidXRlfSlcbiAgZGlzYWJsZVBsYWNlaG9sZGVyOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGlmcmFtZSB3aWxsIGF0dGVtcHQgdG8gbG9hZCByZWdhcmRsZXNzIG9mIHRoZSBzdGF0dXMgb2YgdGhlIGFwaSBvbiB0aGVcbiAgICogcGFnZS4gU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3UgZG9uJ3Qgd2FudCB0aGUgYG9uWW91VHViZUlmcmFtZUFQSVJlYWR5YCBmaWVsZCB0byBiZVxuICAgKiBzZXQgb24gdGhlIGdsb2JhbCB3aW5kb3cuXG4gICAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pIHNob3dCZWZvcmVJZnJhbWVBcGlMb2FkczogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKiBBY2Nlc3NpYmxlIGxhYmVsIGZvciB0aGUgcGxheSBidXR0b24gaW5zaWRlIG9mIHRoZSBwbGFjZWhvbGRlci4gKi9cbiAgQElucHV0KCkgcGxhY2Vob2xkZXJCdXR0b25MYWJlbDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBRdWFsaXR5IG9mIHRoZSBkaXNwbGF5ZWQgcGxhY2Vob2xkZXIgaW1hZ2UuIERlZmF1bHRzIHRvIGBzdGFuZGFyZGAsXG4gICAqIGJlY2F1c2Ugbm90IGFsbCB2aWRlbyBoYXZlIGEgaGlnaC1xdWFsaXR5IHBsYWNlaG9sZGVyLlxuICAgKi9cbiAgQElucHV0KCkgcGxhY2Vob2xkZXJJbWFnZVF1YWxpdHk6IFBsYWNlaG9sZGVySW1hZ2VRdWFsaXR5O1xuXG4gIC8qKiBPdXRwdXRzIGFyZSBkaXJlY3QgcHJveGllcyBmcm9tIHRoZSBwbGF5ZXIgaXRzZWxmLiAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgcmVhZHk6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uUmVhZHknKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgc3RhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25TdGF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50Pignb25TdGF0ZUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBlcnJvcjogT2JzZXJ2YWJsZTxZVC5PbkVycm9yRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PbkVycm9yRXZlbnQ+KCdvbkVycm9yJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGFwaUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25BcGlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tRdWFsaXR5Q2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tSYXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1JhdGVDaGFuZ2UnKTtcblxuICAvKiogVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBpZnJhbWUuICovXG4gIEBWaWV3Q2hpbGQoJ3lvdXR1YmVDb250YWluZXInLCB7c3RhdGljOiB0cnVlfSlcbiAgeW91dHViZUNvbnRhaW5lcjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfbmdab25lOiBOZ1pvbmUsXG4gICAgQEluamVjdChQTEFURk9STV9JRCkgcGxhdGZvcm1JZDogT2JqZWN0LFxuICApIHtcbiAgICBjb25zdCBjb25maWcgPSBpbmplY3QoWU9VVFVCRV9QTEFZRVJfQ09ORklHLCB7b3B0aW9uYWw6IHRydWV9KTtcbiAgICB0aGlzLmxvYWRBcGkgPSBjb25maWc/LmxvYWRBcGkgPz8gdHJ1ZTtcbiAgICB0aGlzLmRpc2FibGVQbGFjZWhvbGRlciA9ICEhY29uZmlnPy5kaXNhYmxlUGxhY2Vob2xkZXI7XG4gICAgdGhpcy5wbGFjZWhvbGRlckJ1dHRvbkxhYmVsID0gY29uZmlnPy5wbGFjZWhvbGRlckJ1dHRvbkxhYmVsIHx8ICdQbGF5IHZpZGVvJztcbiAgICB0aGlzLnBsYWNlaG9sZGVySW1hZ2VRdWFsaXR5ID0gY29uZmlnPy5wbGFjZWhvbGRlckltYWdlUXVhbGl0eSB8fCAnc3RhbmRhcmQnO1xuICAgIHRoaXMuX2lzQnJvd3NlciA9IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpO1xuICB9XG5cbiAgbmdBZnRlclZpZXdJbml0KCkge1xuICAgIHRoaXMuX2NvbmRpdGlvbmFsbHlMb2FkKCk7XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3Nob3VsZFJlY3JlYXRlUGxheWVyKGNoYW5nZXMpKSB7XG4gICAgICB0aGlzLl9jb25kaXRpb25hbGx5TG9hZCgpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICBpZiAoY2hhbmdlc1snd2lkdGgnXSB8fCBjaGFuZ2VzWydoZWlnaHQnXSkge1xuICAgICAgICB0aGlzLl9zZXRTaXplKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFuZ2VzWydzdWdnZXN0ZWRRdWFsaXR5J10pIHtcbiAgICAgICAgdGhpcy5fc2V0UXVhbGl0eSgpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hhbmdlc1snc3RhcnRTZWNvbmRzJ10gfHwgY2hhbmdlc1snZW5kU2Vjb25kcyddIHx8IGNoYW5nZXNbJ3N1Z2dlc3RlZFF1YWxpdHknXSkge1xuICAgICAgICB0aGlzLl9jdWVQbGF5ZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLl9wZW5kaW5nUGxheWVyPy5kZXN0cm95KCk7XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrO1xuICAgIH1cblxuICAgIHRoaXMuX3BsYXllckNoYW5nZXMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5jb21wbGV0ZSgpO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BsYXlWaWRlbyAqL1xuICBwbGF5VmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBsYXlWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUExBWUlORztcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGF1c2VWaWRlbyAqL1xuICBwYXVzZVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3N0b3BWaWRlbyAqL1xuICBzdG9wVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnN0b3BWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJdCBzZWVtcyBsaWtlIFlvdVR1YmUgc2V0cyB0aGUgcGxheWVyIHRvIENVRUQgd2hlbiBpdCdzIHN0b3BwZWQuXG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2Vla1RvICovXG4gIHNlZWtUbyhzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNlZWtUbyhzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnNlZWsgPSB7c2Vjb25kcywgYWxsb3dTZWVrQWhlYWR9O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNtdXRlICovXG4gIG11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLm11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSN1bk11dGUgKi9cbiAgdW5NdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci51bk11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjaXNNdXRlZCAqL1xuICBpc011dGVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuaXNNdXRlZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5tdXRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0Vm9sdW1lICovXG4gIHNldFZvbHVtZSh2b2x1bWU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkudm9sdW1lID0gdm9sdW1lO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWb2x1bWUgKi9cbiAgZ2V0Vm9sdW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRWb2x1bWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0UGxheWJhY2tSYXRlICovXG4gIHNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrUmF0ZSA9IHBsYXliYWNrUmF0ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tSYXRlICovXG4gIGdldFBsYXliYWNrUmF0ZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tSYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMgKi9cbiAgZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0xvYWRlZEZyYWN0aW9uICovXG4gIGdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWVyU3RhdGUgKi9cbiAgZ2V0UGxheWVyU3RhdGUoKTogWVQuUGxheWVyU3RhdGUgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5faXNCcm93c2VyIHx8ICF3aW5kb3cuWVQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlO1xuICAgIH1cblxuICAgIHJldHVybiBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQ7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Q3VycmVudFRpbWUgKi9cbiAgZ2V0Q3VycmVudFRpbWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldEN1cnJlbnRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlaykge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrLnNlY29uZHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tRdWFsaXR5ICovXG4gIGdldFBsYXliYWNrUXVhbGl0eSgpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tRdWFsaXR5KCkgOiAnZGVmYXVsdCc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscyAqL1xuICBnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldER1cmF0aW9uICovXG4gIGdldER1cmF0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXREdXJhdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb1VybCAqL1xuICBnZXRWaWRlb1VybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9VcmwoKSA6ICcnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvRW1iZWRDb2RlICovXG4gIGdldFZpZGVvRW1iZWRDb2RlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0VtYmVkQ29kZSgpIDogJyc7XG4gIH1cblxuICAvKipcbiAgICogTG9hZHMgdGhlIFlvdVR1YmUgQVBJIGFuZCBzZXRzIHVwIHRoZSBwbGF5ZXIuXG4gICAqIEBwYXJhbSBwbGF5VmlkZW8gV2hldGhlciB0byBhdXRvbWF0aWNhbGx5IHBsYXkgdGhlIHZpZGVvIG9uY2UgdGhlIHBsYXllciBpcyBsb2FkZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgX2xvYWQocGxheVZpZGVvOiBib29sZWFuKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgd2UncmUgbm90IGluIGEgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICBpZiAoIXRoaXMuX2lzQnJvd3Nlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghd2luZG93LllUIHx8ICF3aW5kb3cuWVQuUGxheWVyKSB7XG4gICAgICBpZiAodGhpcy5sb2FkQXBpKSB7XG4gICAgICAgIHRoaXMuX2lzTG9hZGluZyA9IHRydWU7XG4gICAgICAgIGxvYWRBcGkodGhpcy5fbm9uY2UpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnNob3dCZWZvcmVJZnJhbWVBcGlMb2FkcyAmJiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ05hbWVzcGFjZSBZVCBub3QgZm91bmQsIGNhbm5vdCBjb25zdHJ1Y3QgZW1iZWRkZWQgeW91dHViZSBwbGF5ZXIuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSBpbnN0YWxsIHRoZSBZb3VUdWJlIFBsYXllciBBUEkgUmVmZXJlbmNlIGZvciBpZnJhbWUgRW1iZWRzOiAnICtcbiAgICAgICAgICAgICdodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlJyxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrID0gd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5O1xuXG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaz8uKCk7XG4gICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gdGhpcy5fY3JlYXRlUGxheWVyKHBsYXlWaWRlbykpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fY3JlYXRlUGxheWVyKHBsYXlWaWRlbyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIExvYWRzIHRoZSBwbGF5ZXIgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcm5hbCBzdGF0ZSBvZiB0aGUgY29tcG9uZW50LiAqL1xuICBwcml2YXRlIF9jb25kaXRpb25hbGx5TG9hZCgpIHtcbiAgICAvLyBJZiB0aGUgcGxhY2Vob2xkZXIgaXNuJ3Qgc2hvd24gYW55bW9yZSwgd2UgaGF2ZSB0byB0cmlnZ2VyIGEgbG9hZC5cbiAgICBpZiAoIXRoaXMuX3Nob3VsZFNob3dQbGFjZWhvbGRlcigpKSB7XG4gICAgICB0aGlzLl9sb2FkKGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucGxheWVyVmFycz8uYXV0b3BsYXkgPT09IDEpIHtcbiAgICAgIC8vIElmIGl0J3MgYW4gYXV0b3BsYXlpbmcgdmlkZW8sIHdlIGhhdmUgdG8gaGlkZSB0aGUgcGxhY2Vob2xkZXIgYW5kIHN0YXJ0IHBsYXlpbmcuXG4gICAgICB0aGlzLl9sb2FkKHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRvIHNob3cgdGhlIHBsYWNlaG9sZGVyIGVsZW1lbnQuICovXG4gIHByb3RlY3RlZCBfc2hvdWxkU2hvd1BsYWNlaG9sZGVyKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmRpc2FibGVQbGFjZWhvbGRlcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFNpbmNlIHdlIGRvbid0IGxvYWQgdGhlIEFQSSBvbiB0aGUgc2VydmVyLCB3ZSBzaG93IHRoZSBwbGFjZWhvbGRlciBwZXJtYW5lbnRseS5cbiAgICBpZiAoIXRoaXMuX2lzQnJvd3Nlcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2hhc1BsYWNlaG9sZGVyICYmICEhdGhpcy52aWRlb0lkICYmICF0aGlzLl9wbGF5ZXI7XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYmplY3QgdGhhdCBzaG91bGQgYmUgdXNlZCB0byBzdG9yZSB0aGUgdGVtcG9yYXJ5IEFQSSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfZ2V0UGVuZGluZ1N0YXRlKCk6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gICAgaWYgKCF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGU7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgY2hhbmdlIGluIHRoZSBjb21wb25lbnQgc3RhdGVcbiAgICogcmVxdWlyZXMgdGhlIFlvdVR1YmUgcGxheWVyIHRvIGJlIHJlY3JlYXRlZC5cbiAgICovXG4gIHByaXZhdGUgX3Nob3VsZFJlY3JlYXRlUGxheWVyKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiBib29sZWFuIHtcbiAgICBjb25zdCBjaGFuZ2UgPVxuICAgICAgY2hhbmdlc1sndmlkZW9JZCddIHx8XG4gICAgICBjaGFuZ2VzWydwbGF5ZXJWYXJzJ10gfHxcbiAgICAgIGNoYW5nZXNbJ2Rpc2FibGVDb29raWVzJ10gfHxcbiAgICAgIGNoYW5nZXNbJ2Rpc2FibGVQbGFjZWhvbGRlciddO1xuICAgIHJldHVybiAhIWNoYW5nZSAmJiAhY2hhbmdlLmlzRmlyc3RDaGFuZ2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IFlvdVR1YmUgcGxheWVyIGFuZCBkZXN0cm95cyB0aGUgZXhpc3Rpbmcgb25lLlxuICAgKiBAcGFyYW0gcGxheVZpZGVvIFdoZXRoZXIgdG8gcGxheSB0aGUgdmlkZW8gb25jZSBpdCBsb2Fkcy5cbiAgICovXG4gIHByaXZhdGUgX2NyZWF0ZVBsYXllcihwbGF5VmlkZW86IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9wbGF5ZXI/LmRlc3Ryb3koKTtcbiAgICB0aGlzLl9wZW5kaW5nUGxheWVyPy5kZXN0cm95KCk7XG5cbiAgICAvLyBBIHBsYXllciBjYW4ndCBiZSBjcmVhdGVkIGlmIHRoZSBBUEkgaXNuJ3QgbG9hZGVkLFxuICAgIC8vIG9yIHRoZXJlIGlzbid0IGEgdmlkZW8gb3IgcGxheWxpc3QgdG8gYmUgcGxheWVkLlxuICAgIGlmICh0eXBlb2YgWVQgPT09ICd1bmRlZmluZWQnIHx8ICghdGhpcy52aWRlb0lkICYmICF0aGlzLnBsYXllclZhcnM/Lmxpc3QpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSW1wb3J0YW50ISBXZSBuZWVkIHRvIGNyZWF0ZSB0aGUgUGxheWVyIG9iamVjdCBvdXRzaWRlIG9mIHRoZSBgTmdab25lYCwgYmVjYXVzZSBpdCBraWNrc1xuICAgIC8vIG9mZiBhIDI1MG1zIHNldEludGVydmFsIHdoaWNoIHdpbGwgY29udGludWFsbHkgdHJpZ2dlciBjaGFuZ2UgZGV0ZWN0aW9uIGlmIHdlIGRvbid0LlxuICAgIGNvbnN0IHBsYXllciA9IHRoaXMuX25nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcihcbiAgICAgICgpID0+XG4gICAgICAgIG5ldyBZVC5QbGF5ZXIodGhpcy55b3V0dWJlQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQsIHtcbiAgICAgICAgICB2aWRlb0lkOiB0aGlzLnZpZGVvSWQsXG4gICAgICAgICAgaG9zdDogdGhpcy5kaXNhYmxlQ29va2llcyA/ICdodHRwczovL3d3dy55b3V0dWJlLW5vY29va2llLmNvbScgOiB1bmRlZmluZWQsXG4gICAgICAgICAgd2lkdGg6IHRoaXMud2lkdGgsXG4gICAgICAgICAgaGVpZ2h0OiB0aGlzLmhlaWdodCxcbiAgICAgICAgICAvLyBDYWxsaW5nIGBwbGF5VmlkZW9gIG9uIGxvYWQgZG9lc24ndCBhcHBlYXIgdG8gYWN0dWFsbHkgcGxheVxuICAgICAgICAgIC8vIHRoZSB2aWRlbyBzbyB3ZSBuZWVkIHRvIHRyaWdnZXIgaXQgdGhyb3VnaCBgcGxheWVyVmFyc2AgaW5zdGVhZC5cbiAgICAgICAgICBwbGF5ZXJWYXJzOiBwbGF5VmlkZW8gPyB7Li4uKHRoaXMucGxheWVyVmFycyB8fCB7fSksIGF1dG9wbGF5OiAxfSA6IHRoaXMucGxheWVyVmFycyxcbiAgICAgICAgfSksXG4gICAgKTtcblxuICAgIGNvbnN0IHdoZW5SZWFkeSA9ICgpID0+IHtcbiAgICAgIC8vIE9ubHkgYXNzaWduIHRoZSBwbGF5ZXIgb25jZSBpdCdzIHJlYWR5LCBvdGhlcndpc2UgWW91VHViZSBkb2Vzbid0IGV4cG9zZSBzb21lIEFQSXMuXG4gICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5faXNMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2hhc1BsYWNlaG9sZGVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3BsYXllciA9IHBsYXllcjtcbiAgICAgICAgdGhpcy5fcGVuZGluZ1BsYXllciA9IHVuZGVmaW5lZDtcbiAgICAgICAgcGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCB3aGVuUmVhZHkpO1xuICAgICAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLm5leHQocGxheWVyKTtcbiAgICAgICAgdGhpcy5fc2V0U2l6ZSgpO1xuICAgICAgICB0aGlzLl9zZXRRdWFsaXR5KCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgICAgIHRoaXMuX2FwcGx5UGVuZGluZ1BsYXllclN0YXRlKHBsYXllciwgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKTtcbiAgICAgICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGN1ZSB0aGUgcGxheWVyIHdoZW4gaXQgZWl0aGVyIGhhc24ndCBzdGFydGVkIHlldCBvciBpdCdzIGN1ZWQsXG4gICAgICAgIC8vIG90aGVyd2lzZSBjdWluZyBpdCBjYW4gaW50ZXJydXB0IGEgcGxheWVyIHdpdGggYXV0b3BsYXkgZW5hYmxlZC5cbiAgICAgICAgY29uc3Qgc3RhdGUgPSBwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgICAgICAgaWYgKHN0YXRlID09PSBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQgfHwgc3RhdGUgPT09IFlULlBsYXllclN0YXRlLkNVRUQgfHwgc3RhdGUgPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuX2N1ZVBsYXllcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fY2hhbmdlRGV0ZWN0b3JSZWYubWFya0ZvckNoZWNrKCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5fcGVuZGluZ1BsYXllciA9IHBsYXllcjtcbiAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIHdoZW5SZWFkeSk7XG4gIH1cblxuICAvKiogQXBwbGllcyBhbnkgc3RhdGUgdGhhdCBjaGFuZ2VkIGJlZm9yZSB0aGUgcGxheWVyIHdhcyBpbml0aWFsaXplZC4gKi9cbiAgcHJpdmF0ZSBfYXBwbHlQZW5kaW5nUGxheWVyU3RhdGUocGxheWVyOiBZVC5QbGF5ZXIsIHBlbmRpbmdTdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlKTogdm9pZCB7XG4gICAgY29uc3Qge3BsYXliYWNrU3RhdGUsIHBsYXliYWNrUmF0ZSwgdm9sdW1lLCBtdXRlZCwgc2Vla30gPSBwZW5kaW5nU3RhdGU7XG5cbiAgICBzd2l0Y2ggKHBsYXliYWNrU3RhdGUpIHtcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUExBWUlORzpcbiAgICAgICAgcGxheWVyLnBsYXlWaWRlbygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUEFVU0VEOlxuICAgICAgICBwbGF5ZXIucGF1c2VWaWRlbygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuQ1VFRDpcbiAgICAgICAgcGxheWVyLnN0b3BWaWRlbygpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9XG5cbiAgICBpZiAodm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9XG5cbiAgICBpZiAobXV0ZWQgIT0gbnVsbCkge1xuICAgICAgbXV0ZWQgPyBwbGF5ZXIubXV0ZSgpIDogcGxheWVyLnVuTXV0ZSgpO1xuICAgIH1cblxuICAgIGlmIChzZWVrICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZWVrVG8oc2Vlay5zZWNvbmRzLCBzZWVrLmFsbG93U2Vla0FoZWFkKTtcbiAgICB9XG4gIH1cblxuICAvKiogQ3VlcyB0aGUgcGxheWVyIGJhc2VkIG9uIHRoZSBjdXJyZW50IGNvbXBvbmVudCBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfY3VlUGxheWVyKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIgJiYgdGhpcy52aWRlb0lkKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuY3VlVmlkZW9CeUlkKHtcbiAgICAgICAgdmlkZW9JZDogdGhpcy52aWRlb0lkLFxuICAgICAgICBzdGFydFNlY29uZHM6IHRoaXMuc3RhcnRTZWNvbmRzLFxuICAgICAgICBlbmRTZWNvbmRzOiB0aGlzLmVuZFNlY29uZHMsXG4gICAgICAgIHN1Z2dlc3RlZFF1YWxpdHk6IHRoaXMuc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZXRzIHRoZSBwbGF5ZXIncyBzaXplIGJhc2VkIG9uIHRoZSBjdXJyZW50IGlucHV0IHZhbHVlcy4gKi9cbiAgcHJpdmF0ZSBfc2V0U2l6ZSgpIHtcbiAgICB0aGlzLl9wbGF5ZXI/LnNldFNpemUodGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICB9XG5cbiAgLyoqIFNldHMgdGhlIHBsYXllcidzIHF1YWxpdHkgYmFzZWQgb24gdGhlIGN1cnJlbnQgaW5wdXQgdmFsdWVzLiAqL1xuICBwcml2YXRlIF9zZXRRdWFsaXR5KCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIgJiYgdGhpcy5zdWdnZXN0ZWRRdWFsaXR5KSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KHRoaXMuc3VnZ2VzdGVkUXVhbGl0eSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JzZXJ2YWJsZSB0aGF0IGFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgdG8gdGhlIHBsYXllciB3aGVuIGEgdXNlciBzdWJzY3JpYmVzIHRvIGl0LiAqL1xuICBwcml2YXRlIF9nZXRMYXp5RW1pdHRlcjxUIGV4dGVuZHMgWVQuUGxheWVyRXZlbnQ+KG5hbWU6IGtleW9mIFlULkV2ZW50cyk6IE9ic2VydmFibGU8VD4ge1xuICAgIC8vIFN0YXJ0IHdpdGggdGhlIHN0cmVhbSBvZiBwbGF5ZXJzLiBUaGlzIHdheSB0aGUgZXZlbnRzIHdpbGwgYmUgdHJhbnNmZXJyZWRcbiAgICAvLyBvdmVyIHRvIHRoZSBuZXcgcGxheWVyIGlmIGl0IGdldHMgc3dhcHBlZCBvdXQgdW5kZXItdGhlLWhvb2QuXG4gICAgcmV0dXJuIHRoaXMuX3BsYXllckNoYW5nZXMucGlwZShcbiAgICAgIC8vIFN3aXRjaCB0byB0aGUgYm91bmQgZXZlbnQuIGBzd2l0Y2hNYXBgIGVuc3VyZXMgdGhhdCB0aGUgb2xkIGV2ZW50IGlzIHJlbW92ZWQgd2hlbiB0aGVcbiAgICAgIC8vIHBsYXllciBpcyBjaGFuZ2VkLiBJZiB0aGVyZSdzIG5vIHBsYXllciwgcmV0dXJuIGFuIG9ic2VydmFibGUgdGhhdCBuZXZlciBlbWl0cy5cbiAgICAgIHN3aXRjaE1hcChwbGF5ZXIgPT4ge1xuICAgICAgICByZXR1cm4gcGxheWVyXG4gICAgICAgICAgPyBmcm9tRXZlbnRQYXR0ZXJuPFQ+KFxuICAgICAgICAgICAgICAobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUaGUgQVBJIHNlZW1zIHRvIHRocm93IHdoZW4gd2UgdHJ5IHRvIHVuYmluZCBmcm9tIGEgZGVzdHJveWVkIHBsYXllciBhbmQgaXQgZG9lc24ndFxuICAgICAgICAgICAgICAgIC8vIGV4cG9zZSB3aGV0aGVyIHRoZSBwbGF5ZXIgaGFzIGJlZW4gZGVzdHJveWVkIHNvIHdlIGhhdmUgdG8gd3JhcCBpdCBpbiBhIHRyeS9jYXRjaCB0b1xuICAgICAgICAgICAgICAgIC8vIHByZXZlbnQgdGhlIGVudGlyZSBzdHJlYW0gZnJvbSBlcnJvcmluZyBvdXQuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIHBsYXllcj8ucmVtb3ZlRXZlbnRMaXN0ZW5lcj8uKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApXG4gICAgICAgICAgOiBvYnNlcnZhYmxlT2Y8VD4oKTtcbiAgICAgIH0pLFxuICAgICAgLy8gQnkgZGVmYXVsdCB3ZSBydW4gYWxsIHRoZSBBUEkgaW50ZXJhY3Rpb25zIG91dHNpZGUgdGhlIHpvbmVcbiAgICAgIC8vIHNvIHdlIGhhdmUgdG8gYnJpbmcgdGhlIGV2ZW50cyBiYWNrIGluIG1hbnVhbGx5IHdoZW4gdGhleSBlbWl0LlxuICAgICAgc291cmNlID0+XG4gICAgICAgIG5ldyBPYnNlcnZhYmxlPFQ+KG9ic2VydmVyID0+XG4gICAgICAgICAgc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgICAgICBuZXh0OiB2YWx1ZSA9PiB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IG9ic2VydmVyLm5leHQodmFsdWUpKSxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvciA9PiBvYnNlcnZlci5lcnJvcihlcnJvciksXG4gICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4gb2JzZXJ2ZXIuY29tcGxldGUoKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgKSxcbiAgICAgIC8vIEVuc3VyZXMgdGhhdCBldmVyeXRoaW5nIGlzIGNsZWFyZWQgb3V0IG9uIGRlc3Ryb3kuXG4gICAgICB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSxcbiAgICApO1xuICB9XG59XG5cbmxldCBhcGlMb2FkZWQgPSBmYWxzZTtcblxuLyoqIExvYWRzIHRoZSBZb3VUdWJlIEFQSSBmcm9tIGEgc3BlY2lmaWVkIFVSTCBvbmx5IG9uY2UuICovXG5mdW5jdGlvbiBsb2FkQXBpKG5vbmNlOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gIGlmIChhcGlMb2FkZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBXZSBjYW4gdXNlIGBkb2N1bWVudGAgZGlyZWN0bHkgaGVyZSwgYmVjYXVzZSB0aGlzIGxvZ2ljIGRvZXNuJ3QgcnVuIG91dHNpZGUgdGhlIGJyb3dzZXIuXG4gIGNvbnN0IHVybCA9ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS9pZnJhbWVfYXBpJztcbiAgY29uc3Qgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gIGNvbnN0IGNhbGxiYWNrID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgIHNjcmlwdC5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkJywgY2FsbGJhY2spO1xuICAgIHNjcmlwdC5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIGNhbGxiYWNrKTtcblxuICAgIGlmIChldmVudC50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICBhcGlMb2FkZWQgPSBmYWxzZTtcblxuICAgICAgaWYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gbG9hZCBZb3VUdWJlIEFQSSBmcm9tICR7dXJsfWApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgc2NyaXB0LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBjYWxsYmFjayk7XG4gIHNjcmlwdC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGNhbGxiYWNrKTtcbiAgKHNjcmlwdCBhcyBhbnkpLnNyYyA9IHVybDtcbiAgc2NyaXB0LmFzeW5jID0gdHJ1ZTtcblxuICBpZiAobm9uY2UpIHtcbiAgICBzY3JpcHQubm9uY2UgPSBub25jZTtcbiAgfVxuXG4gIC8vIFNldCB0aGlzIGltbWVkaWF0ZWx5IHRvIHRydWUgc28gd2UgZG9uJ3Qgc3RhcnQgbG9hZGluZyBhbm90aGVyIHNjcmlwdFxuICAvLyB3aGlsZSB0aGlzIG9uZSBpcyBwZW5kaW5nLiBJZiBsb2FkaW5nIGZhaWxzLCB3ZSdsbCBmbGlwIGl0IGJhY2sgdG8gZmFsc2UuXG4gIGFwaUxvYWRlZCA9IHRydWU7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbn1cbiJdfQ==