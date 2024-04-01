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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.0-next.1", ngImport: i0, type: YouTubePlayer, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "18.0.0-next.1", type: YouTubePlayer, isStandalone: true, selector: "youtube-player", inputs: { videoId: "videoId", height: ["height", "height", numberAttribute], width: ["width", "width", numberAttribute], startSeconds: ["startSeconds", "startSeconds", coerceTime], endSeconds: ["endSeconds", "endSeconds", coerceTime], suggestedQuality: "suggestedQuality", playerVars: "playerVars", disableCookies: ["disableCookies", "disableCookies", booleanAttribute], loadApi: ["loadApi", "loadApi", booleanAttribute], disablePlaceholder: ["disablePlaceholder", "disablePlaceholder", booleanAttribute], showBeforeIframeApiLoads: ["showBeforeIframeApiLoads", "showBeforeIframeApiLoads", booleanAttribute], placeholderButtonLabel: "placeholderButtonLabel", placeholderImageQuality: "placeholderImageQuality" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: `
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
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.0-next.1", ngImport: i0, type: YouTubePlayer, decorators: [{
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
        script.setAttribute('nonce', nonce);
    }
    // Set this immediately to true so we don't start loading another script
    // while this one is pending. If loading fails, we'll flip it back to false.
    apiLoaded = true;
    document.body.appendChild(script);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgseUVBQXlFO0FBQ3pFLGlDQUFpQztBQUVqQyxPQUFPLEVBQ0wsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsS0FBSyxFQUNMLE1BQU0sRUFFTixNQUFNLEVBQ04sU0FBUyxFQUNULGlCQUFpQixFQUNqQixNQUFNLEVBQ04sV0FBVyxFQUdYLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsY0FBYyxFQUNkLE1BQU0sRUFDTixTQUFTLEVBQ1QsaUJBQWlCLEdBRWxCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQ2xELE9BQU8sRUFBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLFlBQVksRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2hHLE9BQU8sRUFBQyxTQUFTLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDcEQsT0FBTyxFQUEwQix3QkFBd0IsRUFBQyxNQUFNLDhCQUE4QixDQUFDOztBQVMvRiw2REFBNkQ7QUFDN0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxjQUFjLENBQ3JELHVCQUF1QixDQUN4QixDQUFDO0FBd0JGLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztBQUN4QyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUM7QUFjekMseUNBQXlDO0FBQ3pDLFNBQVMsVUFBVSxDQUFDLEtBQXlCO0lBQzNDLE9BQU8sS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxlQUFlLENB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Z0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsTUFBYyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDMUIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7SUFFcEIsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNWLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCx3RUFBd0U7SUFDeEUsNEVBQTRFO0lBQzVFLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDcEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBXb3JrYXJvdW5kIGZvcjogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy8xMjY1XG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cInlvdXR1YmVcIiAvPlxuXG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkRlc3Ryb3ksXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgSW5qZWN0LFxuICBQTEFURk9STV9JRCxcbiAgT25DaGFuZ2VzLFxuICBTaW1wbGVDaGFuZ2VzLFxuICBib29sZWFuQXR0cmlidXRlLFxuICBudW1iZXJBdHRyaWJ1dGUsXG4gIEluamVjdGlvblRva2VuLFxuICBpbmplY3QsXG4gIENTUF9OT05DRSxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIEFmdGVyVmlld0luaXQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtpc1BsYXRmb3JtQnJvd3Nlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2YgYXMgb2JzZXJ2YWJsZU9mLCBTdWJqZWN0LCBCZWhhdmlvclN1YmplY3QsIGZyb21FdmVudFBhdHRlcm59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YWtlVW50aWwsIHN3aXRjaE1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtQbGFjZWhvbGRlckltYWdlUXVhbGl0eSwgWW91VHViZVBsYXllclBsYWNlaG9sZGVyfSBmcm9tICcuL3lvdXR1YmUtcGxheWVyLXBsYWNlaG9sZGVyJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBZVDogdHlwZW9mIFlUIHwgdW5kZWZpbmVkO1xuICAgIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqIEluamVjdGlvbiB0b2tlbiB1c2VkIHRvIGNvbmZpZ3VyZSB0aGUgYFlvdVR1YmVQbGF5ZXJgLiAqL1xuZXhwb3J0IGNvbnN0IFlPVVRVQkVfUExBWUVSX0NPTkZJRyA9IG5ldyBJbmplY3Rpb25Ub2tlbjxZb3VUdWJlUGxheWVyQ29uZmlnPihcbiAgJ1lPVVRVQkVfUExBWUVSX0NPTkZJRycsXG4pO1xuXG4vKiogT2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgdG8gY29uZmlndXJlIHRoZSBgWW91VHViZVBsYXllcmAuICovXG5leHBvcnQgaW50ZXJmYWNlIFlvdVR1YmVQbGF5ZXJDb25maWcge1xuICAvKiogV2hldGhlciB0byBsb2FkIHRoZSBZb3VUdWJlIGlmcmFtZSBBUEkgYXV0b21hdGljYWxseS4gRGVmYXVsdHMgdG8gYHRydWVgLiAqL1xuICBsb2FkQXBpPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQnkgZGVmYXVsdCB0aGUgcGxheWVyIHNob3dzIGEgcGxhY2Vob2xkZXIgaW1hZ2UgaW5zdGVhZCBvZiBsb2FkaW5nIHRoZSBZb3VUdWJlIEFQSSB3aGljaFxuICAgKiBpbXByb3ZlcyB0aGUgaW5pdGlhbCBwYWdlIGxvYWQgcGVyZm9ybWFuY2UuIFVzZSB0aGlzIG9wdGlvbiB0byBkaXNhYmxlIHRoZSBwbGFjZWhvbGRlciBsb2FkaW5nXG4gICAqIGJlaGF2aW9yIGdsb2JhbGx5LiBEZWZhdWx0cyB0byBgZmFsc2VgLlxuICAgKi9cbiAgZGlzYWJsZVBsYWNlaG9sZGVyPzogYm9vbGVhbjtcblxuICAvKiogQWNjZXNzaWJsZSBsYWJlbCBmb3IgdGhlIHBsYXkgYnV0dG9uIGluc2lkZSBvZiB0aGUgcGxhY2Vob2xkZXIuICovXG4gIHBsYWNlaG9sZGVyQnV0dG9uTGFiZWw/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFF1YWxpdHkgb2YgdGhlIGRpc3BsYXllZCBwbGFjZWhvbGRlciBpbWFnZS4gRGVmYXVsdHMgdG8gYHN0YW5kYXJkYCxcbiAgICogYmVjYXVzZSBub3QgYWxsIHZpZGVvIGhhdmUgYSBoaWdoLXF1YWxpdHkgcGxhY2Vob2xkZXIuXG4gICAqL1xuICBwbGFjZWhvbGRlckltYWdlUXVhbGl0eT86IFBsYWNlaG9sZGVySW1hZ2VRdWFsaXR5O1xufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfV0lEVEggPSA2NDA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfSEVJR0hUID0gMzkwO1xuXG4vKipcbiAqIE9iamVjdCB1c2VkIHRvIHN0b3JlIHRoZSBzdGF0ZSBvZiB0aGUgcGxheWVyIGlmIHRoZVxuICogdXNlciB0cmllcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBBUEkgYmVmb3JlIGl0IGhhcyBiZWVuIGxvYWRlZC5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gIHBsYXliYWNrU3RhdGU/OiBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HIHwgWVQuUGxheWVyU3RhdGUuUEFVU0VEIHwgWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgcGxheWJhY2tSYXRlPzogbnVtYmVyO1xuICB2b2x1bWU/OiBudW1iZXI7XG4gIG11dGVkPzogYm9vbGVhbjtcbiAgc2Vlaz86IHtzZWNvbmRzOiBudW1iZXI7IGFsbG93U2Vla0FoZWFkOiBib29sZWFufTtcbn1cblxuLyoqIENvZXJjaW9uIGZ1bmN0aW9uIGZvciB0aW1lIHZhbHVlcy4gKi9cbmZ1bmN0aW9uIGNvZXJjZVRpbWUodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gdmFsdWUgOiBudW1iZXJBdHRyaWJ1dGUodmFsdWUsIDApO1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY29tcG9uZW50IHRoYXQgcmVuZGVycyBhIFlvdVR1YmUgcGxheWVyIHZpYSB0aGUgWW91VHViZSBwbGF5ZXJcbiAqIGlmcmFtZSBBUEkuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2VcbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAneW91dHViZS1wbGF5ZXInLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgaW1wb3J0czogW1lvdVR1YmVQbGF5ZXJQbGFjZWhvbGRlcl0sXG4gIHRlbXBsYXRlOiBgXG4gICAgQGlmIChfc2hvdWxkU2hvd1BsYWNlaG9sZGVyKCkpIHtcbiAgICAgIDx5b3V0dWJlLXBsYXllci1wbGFjZWhvbGRlclxuICAgICAgICBbdmlkZW9JZF09XCJ2aWRlb0lkIVwiXG4gICAgICAgIFt3aWR0aF09XCJ3aWR0aFwiXG4gICAgICAgIFtoZWlnaHRdPVwiaGVpZ2h0XCJcbiAgICAgICAgW2lzTG9hZGluZ109XCJfaXNMb2FkaW5nXCJcbiAgICAgICAgW2J1dHRvbkxhYmVsXT1cInBsYWNlaG9sZGVyQnV0dG9uTGFiZWxcIlxuICAgICAgICBbcXVhbGl0eV09XCJwbGFjZWhvbGRlckltYWdlUXVhbGl0eVwiXG4gICAgICAgIChjbGljayk9XCJfbG9hZCh0cnVlKVwiLz5cbiAgICB9XG4gICAgPGRpdiBbc3R5bGUuZGlzcGxheV09XCJfc2hvdWxkU2hvd1BsYWNlaG9sZGVyKCkgPyAnbm9uZScgOiAnJ1wiPlxuICAgICAgPGRpdiAjeW91dHViZUNvbnRhaW5lcj48L2Rpdj5cbiAgICA8L2Rpdj5cbiAgYCxcbn0pXG5leHBvcnQgY2xhc3MgWW91VHViZVBsYXllciBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uQ2hhbmdlcywgT25EZXN0cm95IHtcbiAgLyoqIFdoZXRoZXIgd2UncmUgY3VycmVudGx5IHJlbmRlcmluZyBpbnNpZGUgYSBicm93c2VyLiAqL1xuICBwcml2YXRlIHJlYWRvbmx5IF9pc0Jyb3dzZXI6IGJvb2xlYW47XG4gIHByaXZhdGUgX3BsYXllcjogWVQuUGxheWVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wZW5kaW5nUGxheWVyOiBZVC5QbGF5ZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjazogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wZW5kaW5nUGxheWVyU3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByZWFkb25seSBfZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBfcGxheWVyQ2hhbmdlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8WVQuUGxheWVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICBwcml2YXRlIHJlYWRvbmx5IF9ub25jZSA9IGluamVjdChDU1BfTk9OQ0UsIHtvcHRpb25hbDogdHJ1ZX0pO1xuICBwcml2YXRlIHJlYWRvbmx5IF9jaGFuZ2VEZXRlY3RvclJlZiA9IGluamVjdChDaGFuZ2VEZXRlY3RvclJlZik7XG4gIHByb3RlY3RlZCBfaXNMb2FkaW5nID0gZmFsc2U7XG4gIHByb3RlY3RlZCBfaGFzUGxhY2Vob2xkZXIgPSB0cnVlO1xuXG4gIC8qKiBZb3VUdWJlIFZpZGVvIElEIHRvIHZpZXcgKi9cbiAgQElucHV0KClcbiAgdmlkZW9JZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBIZWlnaHQgb2YgdmlkZW8gcGxheWVyICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBudW1iZXJBdHRyaWJ1dGV9KVxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0ID09IG51bGwgfHwgaXNOYU4oaGVpZ2h0KSA/IERFRkFVTFRfUExBWUVSX0hFSUdIVCA6IGhlaWdodDtcbiAgfVxuICBwcml2YXRlIF9oZWlnaHQgPSBERUZBVUxUX1BMQVlFUl9IRUlHSFQ7XG5cbiAgLyoqIFdpZHRoIG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogbnVtYmVyQXR0cmlidXRlfSlcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aCA9PSBudWxsIHx8IGlzTmFOKHdpZHRoKSA/IERFRkFVTFRfUExBWUVSX1dJRFRIIDogd2lkdGg7XG4gIH1cbiAgcHJpdmF0ZSBfd2lkdGggPSBERUZBVUxUX1BMQVlFUl9XSURUSDtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RhcnQgcGxheWluZyAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogY29lcmNlVGltZX0pXG4gIHN0YXJ0U2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdG9wIHBsYXlpbmcgKi9cbiAgQElucHV0KHt0cmFuc2Zvcm06IGNvZXJjZVRpbWV9KVxuICBlbmRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgLyoqIFRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBvZiB0aGUgcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIHN1Z2dlc3RlZFF1YWxpdHk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogRXh0cmEgcGFyYW1ldGVycyB1c2VkIHRvIGNvbmZpZ3VyZSB0aGUgcGxheWVyLiBTZWU6XG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvcGxheWVyX3BhcmFtZXRlcnMuaHRtbD9wbGF5ZXJWZXJzaW9uPUhUTUw1I1BhcmFtZXRlcnNcbiAgICovXG4gIEBJbnB1dCgpXG4gIHBsYXllclZhcnM6IFlULlBsYXllclZhcnMgfCB1bmRlZmluZWQ7XG5cbiAgLyoqIFdoZXRoZXIgY29va2llcyBpbnNpZGUgdGhlIHBsYXllciBoYXZlIGJlZW4gZGlzYWJsZWQuICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBib29sZWFuQXR0cmlidXRlfSlcbiAgZGlzYWJsZUNvb2tpZXM6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKiogV2hldGhlciB0byBhdXRvbWF0aWNhbGx5IGxvYWQgdGhlIFlvdVR1YmUgaWZyYW1lIEFQSS4gRGVmYXVsdHMgdG8gYHRydWVgLiAqL1xuICBASW5wdXQoe3RyYW5zZm9ybTogYm9vbGVhbkF0dHJpYnV0ZX0pXG4gIGxvYWRBcGk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEJ5IGRlZmF1bHQgdGhlIHBsYXllciBzaG93cyBhIHBsYWNlaG9sZGVyIGltYWdlIGluc3RlYWQgb2YgbG9hZGluZyB0aGUgWW91VHViZSBBUEkgd2hpY2hcbiAgICogaW1wcm92ZXMgdGhlIGluaXRpYWwgcGFnZSBsb2FkIHBlcmZvcm1hbmNlLiBUaGlzIGlucHV0IGFsbG93cyBmb3IgdGhlIGJlaGF2aW9yIHRvIGJlIGRpc2FibGVkLlxuICAgKi9cbiAgQElucHV0KHt0cmFuc2Zvcm06IGJvb2xlYW5BdHRyaWJ1dGV9KVxuICBkaXNhYmxlUGxhY2Vob2xkZXI6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgaWZyYW1lIHdpbGwgYXR0ZW1wdCB0byBsb2FkIHJlZ2FyZGxlc3Mgb2YgdGhlIHN0YXR1cyBvZiB0aGUgYXBpIG9uIHRoZVxuICAgKiBwYWdlLiBTZXQgdGhpcyB0byB0cnVlIGlmIHlvdSBkb24ndCB3YW50IHRoZSBgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHlgIGZpZWxkIHRvIGJlXG4gICAqIHNldCBvbiB0aGUgZ2xvYmFsIHdpbmRvdy5cbiAgICovXG4gIEBJbnB1dCh7dHJhbnNmb3JtOiBib29sZWFuQXR0cmlidXRlfSkgc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLyoqIEFjY2Vzc2libGUgbGFiZWwgZm9yIHRoZSBwbGF5IGJ1dHRvbiBpbnNpZGUgb2YgdGhlIHBsYWNlaG9sZGVyLiAqL1xuICBASW5wdXQoKSBwbGFjZWhvbGRlckJ1dHRvbkxhYmVsOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFF1YWxpdHkgb2YgdGhlIGRpc3BsYXllZCBwbGFjZWhvbGRlciBpbWFnZS4gRGVmYXVsdHMgdG8gYHN0YW5kYXJkYCxcbiAgICogYmVjYXVzZSBub3QgYWxsIHZpZGVvIGhhdmUgYSBoaWdoLXF1YWxpdHkgcGxhY2Vob2xkZXIuXG4gICAqL1xuICBASW5wdXQoKSBwbGFjZWhvbGRlckltYWdlUXVhbGl0eTogUGxhY2Vob2xkZXJJbWFnZVF1YWxpdHk7XG5cbiAgLyoqIE91dHB1dHMgYXJlIGRpcmVjdCBwcm94aWVzIGZyb20gdGhlIHBsYXllciBpdHNlbGYuICovXG4gIEBPdXRwdXQoKSByZWFkb25seSByZWFkeTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25SZWFkeScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBzdGF0ZUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+KCdvblN0YXRlQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGVycm9yOiBPYnNlcnZhYmxlPFlULk9uRXJyb3JFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uRXJyb3JFdmVudD4oJ29uRXJyb3InKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgYXBpQ2hhbmdlOiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvbkFwaUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBwbGF5YmFja1F1YWxpdHlDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBwbGF5YmFja1JhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUmF0ZUNoYW5nZScpO1xuXG4gIC8qKiBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgcmVwbGFjZWQgYnkgdGhlIGlmcmFtZS4gKi9cbiAgQFZpZXdDaGlsZCgneW91dHViZUNvbnRhaW5lcicsIHtzdGF0aWM6IHRydWV9KVxuICB5b3V0dWJlQ29udGFpbmVyOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSxcbiAgICBASW5qZWN0KFBMQVRGT1JNX0lEKSBwbGF0Zm9ybUlkOiBPYmplY3QsXG4gICkge1xuICAgIGNvbnN0IGNvbmZpZyA9IGluamVjdChZT1VUVUJFX1BMQVlFUl9DT05GSUcsIHtvcHRpb25hbDogdHJ1ZX0pO1xuICAgIHRoaXMubG9hZEFwaSA9IGNvbmZpZz8ubG9hZEFwaSA/PyB0cnVlO1xuICAgIHRoaXMuZGlzYWJsZVBsYWNlaG9sZGVyID0gISFjb25maWc/LmRpc2FibGVQbGFjZWhvbGRlcjtcbiAgICB0aGlzLnBsYWNlaG9sZGVyQnV0dG9uTGFiZWwgPSBjb25maWc/LnBsYWNlaG9sZGVyQnV0dG9uTGFiZWwgfHwgJ1BsYXkgdmlkZW8nO1xuICAgIHRoaXMucGxhY2Vob2xkZXJJbWFnZVF1YWxpdHkgPSBjb25maWc/LnBsYWNlaG9sZGVySW1hZ2VRdWFsaXR5IHx8ICdzdGFuZGFyZCc7XG4gICAgdGhpcy5faXNCcm93c2VyID0gaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCk7XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5fY29uZGl0aW9uYWxseUxvYWQoKTtcbiAgfVxuXG4gIG5nT25DaGFuZ2VzKGNoYW5nZXM6IFNpbXBsZUNoYW5nZXMpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fc2hvdWxkUmVjcmVhdGVQbGF5ZXIoY2hhbmdlcykpIHtcbiAgICAgIHRoaXMuX2NvbmRpdGlvbmFsbHlMb2FkKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIGlmIChjaGFuZ2VzWyd3aWR0aCddIHx8IGNoYW5nZXNbJ2hlaWdodCddKSB7XG4gICAgICAgIHRoaXMuX3NldFNpemUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZXNbJ3N1Z2dlc3RlZFF1YWxpdHknXSkge1xuICAgICAgICB0aGlzLl9zZXRRdWFsaXR5KCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFuZ2VzWydzdGFydFNlY29uZHMnXSB8fCBjaGFuZ2VzWydlbmRTZWNvbmRzJ10gfHwgY2hhbmdlc1snc3VnZ2VzdGVkUXVhbGl0eSddKSB7XG4gICAgICAgIHRoaXMuX2N1ZVBsYXllcigpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXI/LmRlc3Ryb3koKTtcblxuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5kZXN0cm95KCk7XG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s7XG4gICAgfVxuXG4gICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5uZXh0KCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLmNvbXBsZXRlKCk7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGxheVZpZGVvICovXG4gIHBsYXlWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwYXVzZVZpZGVvICovXG4gIHBhdXNlVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBhdXNlVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBBVVNFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc3RvcFZpZGVvICovXG4gIHN0b3BWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEl0IHNlZW1zIGxpa2UgWW91VHViZSBzZXRzIHRoZSBwbGF5ZXIgdG8gQ1VFRCB3aGVuIGl0J3Mgc3RvcHBlZC5cbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZWVrVG8gKi9cbiAgc2Vla1RvKHNlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2Vla1RvKHNlY29uZHMsIGFsbG93U2Vla0FoZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkuc2VlayA9IHtzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI211dGUgKi9cbiAgbXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIubXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3VuTXV0ZSAqL1xuICB1bk11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnVuTXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNpc011dGVkICovXG4gIGlzTXV0ZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5pc011dGVkKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLm11dGVkO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRWb2x1bWUgKi9cbiAgc2V0Vm9sdW1lKHZvbHVtZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS52b2x1bWUgPSB2b2x1bWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZvbHVtZSAqL1xuICBnZXRWb2x1bWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFZvbHVtZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRQbGF5YmFja1JhdGUgKi9cbiAgc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tSYXRlID0gcGxheWJhY2tSYXRlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1JhdGUgKi9cbiAgZ2V0UGxheWJhY2tSYXRlKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1JhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcyAqL1xuICBnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvTG9hZGVkRnJhY3Rpb24gKi9cbiAgZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5ZXJTdGF0ZSAqL1xuICBnZXRQbGF5ZXJTdGF0ZSgpOiBZVC5QbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIgfHwgIXdpbmRvdy5ZVCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFlULlBsYXllclN0YXRlLlVOU1RBUlRFRDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRDdXJyZW50VGltZSAqL1xuICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWsuc2Vjb25kcztcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1F1YWxpdHkgKi9cbiAgZ2V0UGxheWJhY2tRdWFsaXR5KCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1F1YWxpdHkoKSA6ICdkZWZhdWx0JztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzICovXG4gIGdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5W10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0RHVyYXRpb24gKi9cbiAgZ2V0RHVyYXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldER1cmF0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvVXJsICovXG4gIGdldFZpZGVvVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb1VybCgpIDogJyc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9FbWJlZENvZGUgKi9cbiAgZ2V0VmlkZW9FbWJlZENvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvRW1iZWRDb2RlKCkgOiAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkcyB0aGUgWW91VHViZSBBUEkgYW5kIHNldHMgdXAgdGhlIHBsYXllci5cbiAgICogQHBhcmFtIHBsYXlWaWRlbyBXaGV0aGVyIHRvIGF1dG9tYXRpY2FsbHkgcGxheSB0aGUgdmlkZW8gb25jZSB0aGUgcGxheWVyIGlzIGxvYWRlZC5cbiAgICovXG4gIHByb3RlY3RlZCBfbG9hZChwbGF5VmlkZW86IGJvb2xlYW4pIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBub3QgaW4gYSBicm93c2VyIGVudmlyb25tZW50LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF3aW5kb3cuWVQgfHwgIXdpbmRvdy5ZVC5QbGF5ZXIpIHtcbiAgICAgIGlmICh0aGlzLmxvYWRBcGkpIHtcbiAgICAgICAgdGhpcy5faXNMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgbG9hZEFwaSh0aGlzLl9ub25jZSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzICYmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTmFtZXNwYWNlIFlUIG5vdCBmb3VuZCwgY2Fubm90IGNvbnN0cnVjdCBlbWJlZGRlZCB5b3V0dWJlIHBsYXllci4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIGluc3RhbGwgdGhlIFlvdVR1YmUgUGxheWVyIEFQSSBSZWZlcmVuY2UgZm9yIGlmcmFtZSBFbWJlZHM6ICcgK1xuICAgICAgICAgICAgJ2h0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UnLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2sgPSB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk7XG5cbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrPy4oKTtcbiAgICAgICAgdGhpcy5fbmdab25lLnJ1bigoKSA9PiB0aGlzLl9jcmVhdGVQbGF5ZXIocGxheVZpZGVvKSk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jcmVhdGVQbGF5ZXIocGxheVZpZGVvKTtcbiAgICB9XG4gIH1cblxuICAvKiogTG9hZHMgdGhlIHBsYXllciBkZXBlbmRpbmcgb24gdGhlIGludGVybmFsIHN0YXRlIG9mIHRoZSBjb21wb25lbnQuICovXG4gIHByaXZhdGUgX2NvbmRpdGlvbmFsbHlMb2FkKCkge1xuICAgIC8vIElmIHRoZSBwbGFjZWhvbGRlciBpc24ndCBzaG93biBhbnltb3JlLCB3ZSBoYXZlIHRvIHRyaWdnZXIgYSBsb2FkLlxuICAgIGlmICghdGhpcy5fc2hvdWxkU2hvd1BsYWNlaG9sZGVyKCkpIHtcbiAgICAgIHRoaXMuX2xvYWQoZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5wbGF5ZXJWYXJzPy5hdXRvcGxheSA9PT0gMSkge1xuICAgICAgLy8gSWYgaXQncyBhbiBhdXRvcGxheWluZyB2aWRlbywgd2UgaGF2ZSB0byBoaWRlIHRoZSBwbGFjZWhvbGRlciBhbmQgc3RhcnQgcGxheWluZy5cbiAgICAgIHRoaXMuX2xvYWQodHJ1ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFdoZXRoZXIgdG8gc2hvdyB0aGUgcGxhY2Vob2xkZXIgZWxlbWVudC4gKi9cbiAgcHJvdGVjdGVkIF9zaG91bGRTaG93UGxhY2Vob2xkZXIoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZGlzYWJsZVBsYWNlaG9sZGVyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gU2luY2Ugd2UgZG9uJ3QgbG9hZCB0aGUgQVBJIG9uIHRoZSBzZXJ2ZXIsIHdlIHNob3cgdGhlIHBsYWNlaG9sZGVyIHBlcm1hbmVudGx5LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5faGFzUGxhY2Vob2xkZXIgJiYgISF0aGlzLnZpZGVvSWQgJiYgIXRoaXMuX3BsYXllcjtcbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSB1c2VkIHRvIHN0b3JlIHRoZSB0ZW1wb3JhcnkgQVBJIHN0YXRlLiAqL1xuICBwcml2YXRlIF9nZXRQZW5kaW5nU3RhdGUoKTogUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgICBpZiAoIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBjaGFuZ2UgaW4gdGhlIGNvbXBvbmVudCBzdGF0ZVxuICAgKiByZXF1aXJlcyB0aGUgWW91VHViZSBwbGF5ZXIgdG8gYmUgcmVjcmVhdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBfc2hvdWxkUmVjcmVhdGVQbGF5ZXIoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoYW5nZSA9XG4gICAgICBjaGFuZ2VzWyd2aWRlb0lkJ10gfHxcbiAgICAgIGNoYW5nZXNbJ3BsYXllclZhcnMnXSB8fFxuICAgICAgY2hhbmdlc1snZGlzYWJsZUNvb2tpZXMnXSB8fFxuICAgICAgY2hhbmdlc1snZGlzYWJsZVBsYWNlaG9sZGVyJ107XG4gICAgcmV0dXJuICEhY2hhbmdlICYmICFjaGFuZ2UuaXNGaXJzdENoYW5nZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgWW91VHViZSBwbGF5ZXIgYW5kIGRlc3Ryb3lzIHRoZSBleGlzdGluZyBvbmUuXG4gICAqIEBwYXJhbSBwbGF5VmlkZW8gV2hldGhlciB0byBwbGF5IHRoZSB2aWRlbyBvbmNlIGl0IGxvYWRzLlxuICAgKi9cbiAgcHJpdmF0ZSBfY3JlYXRlUGxheWVyKHBsYXlWaWRlbzogYm9vbGVhbikge1xuICAgIHRoaXMuX3BsYXllcj8uZGVzdHJveSgpO1xuICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXI/LmRlc3Ryb3koKTtcblxuICAgIC8vIEEgcGxheWVyIGNhbid0IGJlIGNyZWF0ZWQgaWYgdGhlIEFQSSBpc24ndCBsb2FkZWQsXG4gICAgLy8gb3IgdGhlcmUgaXNuJ3QgYSB2aWRlbyBvciBwbGF5bGlzdCB0byBiZSBwbGF5ZWQuXG4gICAgaWYgKHR5cGVvZiBZVCA9PT0gJ3VuZGVmaW5lZCcgfHwgKCF0aGlzLnZpZGVvSWQgJiYgIXRoaXMucGxheWVyVmFycz8ubGlzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbXBvcnRhbnQhIFdlIG5lZWQgdG8gY3JlYXRlIHRoZSBQbGF5ZXIgb2JqZWN0IG91dHNpZGUgb2YgdGhlIGBOZ1pvbmVgLCBiZWNhdXNlIGl0IGtpY2tzXG4gICAgLy8gb2ZmIGEgMjUwbXMgc2V0SW50ZXJ2YWwgd2hpY2ggd2lsbCBjb250aW51YWxseSB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gaWYgd2UgZG9uJ3QuXG4gICAgY29uc3QgcGxheWVyID0gdGhpcy5fbmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKFxuICAgICAgKCkgPT5cbiAgICAgICAgbmV3IFlULlBsYXllcih0aGlzLnlvdXR1YmVDb250YWluZXIubmF0aXZlRWxlbWVudCwge1xuICAgICAgICAgIHZpZGVvSWQ6IHRoaXMudmlkZW9JZCxcbiAgICAgICAgICBob3N0OiB0aGlzLmRpc2FibGVDb29raWVzID8gJ2h0dHBzOi8vd3d3LnlvdXR1YmUtbm9jb29raWUuY29tJyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICB3aWR0aDogdGhpcy53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IHRoaXMuaGVpZ2h0LFxuICAgICAgICAgIC8vIENhbGxpbmcgYHBsYXlWaWRlb2Agb24gbG9hZCBkb2Vzbid0IGFwcGVhciB0byBhY3R1YWxseSBwbGF5XG4gICAgICAgICAgLy8gdGhlIHZpZGVvIHNvIHdlIG5lZWQgdG8gdHJpZ2dlciBpdCB0aHJvdWdoIGBwbGF5ZXJWYXJzYCBpbnN0ZWFkLlxuICAgICAgICAgIHBsYXllclZhcnM6IHBsYXlWaWRlbyA/IHsuLi4odGhpcy5wbGF5ZXJWYXJzIHx8IHt9KSwgYXV0b3BsYXk6IDF9IDogdGhpcy5wbGF5ZXJWYXJzLFxuICAgICAgICB9KSxcbiAgICApO1xuXG4gICAgY29uc3Qgd2hlblJlYWR5ID0gKCkgPT4ge1xuICAgICAgLy8gT25seSBhc3NpZ24gdGhlIHBsYXllciBvbmNlIGl0J3MgcmVhZHksIG90aGVyd2lzZSBZb3VUdWJlIGRvZXNuJ3QgZXhwb3NlIHNvbWUgQVBJcy5cbiAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4ge1xuICAgICAgICB0aGlzLl9pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5faGFzUGxhY2Vob2xkZXIgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fcGxheWVyID0gcGxheWVyO1xuICAgICAgICB0aGlzLl9wZW5kaW5nUGxheWVyID0gdW5kZWZpbmVkO1xuICAgICAgICBwbGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIHdoZW5SZWFkeSk7XG4gICAgICAgIHRoaXMuX3BsYXllckNoYW5nZXMubmV4dChwbGF5ZXIpO1xuICAgICAgICB0aGlzLl9zZXRTaXplKCk7XG4gICAgICAgIHRoaXMuX3NldFF1YWxpdHkoKTtcblxuICAgICAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICAgICAgdGhpcy5fYXBwbHlQZW5kaW5nUGxheWVyU3RhdGUocGxheWVyLCB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpO1xuICAgICAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgY3VlIHRoZSBwbGF5ZXIgd2hlbiBpdCBlaXRoZXIgaGFzbid0IHN0YXJ0ZWQgeWV0IG9yIGl0J3MgY3VlZCxcbiAgICAgICAgLy8gb3RoZXJ3aXNlIGN1aW5nIGl0IGNhbiBpbnRlcnJ1cHQgYSBwbGF5ZXIgd2l0aCBhdXRvcGxheSBlbmFibGVkLlxuICAgICAgICBjb25zdCBzdGF0ZSA9IHBsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICAgICAgICBpZiAoc3RhdGUgPT09IFlULlBsYXllclN0YXRlLlVOU1RBUlRFRCB8fCBzdGF0ZSA9PT0gWVQuUGxheWVyU3RhdGUuQ1VFRCB8fCBzdGF0ZSA9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5fY3VlUGxheWVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jaGFuZ2VEZXRlY3RvclJlZi5tYXJrRm9yQ2hlY2soKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLl9wZW5kaW5nUGxheWVyID0gcGxheWVyO1xuICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgd2hlblJlYWR5KTtcbiAgfVxuXG4gIC8qKiBBcHBsaWVzIGFueSBzdGF0ZSB0aGF0IGNoYW5nZWQgYmVmb3JlIHRoZSBwbGF5ZXIgd2FzIGluaXRpYWxpemVkLiAqL1xuICBwcml2YXRlIF9hcHBseVBlbmRpbmdQbGF5ZXJTdGF0ZShwbGF5ZXI6IFlULlBsYXllciwgcGVuZGluZ1N0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCB7cGxheWJhY2tTdGF0ZSwgcGxheWJhY2tSYXRlLCB2b2x1bWUsIG11dGVkLCBzZWVrfSA9IHBlbmRpbmdTdGF0ZTtcblxuICAgIHN3aXRjaCAocGxheWJhY2tTdGF0ZSkge1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HOlxuICAgICAgICBwbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ6XG4gICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5DVUVEOlxuICAgICAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH1cblxuICAgIGlmICh2b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH1cblxuICAgIGlmIChtdXRlZCAhPSBudWxsKSB7XG4gICAgICBtdXRlZCA/IHBsYXllci5tdXRlKCkgOiBwbGF5ZXIudW5NdXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlZWsgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNlZWtUbyhzZWVrLnNlY29uZHMsIHNlZWsuYWxsb3dTZWVrQWhlYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBDdWVzIHRoZSBwbGF5ZXIgYmFzZWQgb24gdGhlIGN1cnJlbnQgY29tcG9uZW50IHN0YXRlLiAqL1xuICBwcml2YXRlIF9jdWVQbGF5ZXIoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllciAmJiB0aGlzLnZpZGVvSWQpIHtcbiAgICAgIHRoaXMuX3BsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkOiB0aGlzLnZpZGVvSWQsXG4gICAgICAgIHN0YXJ0U2Vjb25kczogdGhpcy5zdGFydFNlY29uZHMsXG4gICAgICAgIGVuZFNlY29uZHM6IHRoaXMuZW5kU2Vjb25kcyxcbiAgICAgICAgc3VnZ2VzdGVkUXVhbGl0eTogdGhpcy5zdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNldHMgdGhlIHBsYXllcidzIHNpemUgYmFzZWQgb24gdGhlIGN1cnJlbnQgaW5wdXQgdmFsdWVzLiAqL1xuICBwcml2YXRlIF9zZXRTaXplKCkge1xuICAgIHRoaXMuX3BsYXllcj8uc2V0U2l6ZSh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gIH1cblxuICAvKiogU2V0cyB0aGUgcGxheWVyJ3MgcXVhbGl0eSBiYXNlZCBvbiB0aGUgY3VycmVudCBpbnB1dCB2YWx1ZXMuICovXG4gIHByaXZhdGUgX3NldFF1YWxpdHkoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllciAmJiB0aGlzLnN1Z2dlc3RlZFF1YWxpdHkpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1F1YWxpdHkodGhpcy5zdWdnZXN0ZWRRdWFsaXR5KTtcbiAgICB9XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYnNlcnZhYmxlIHRoYXQgYWRkcyBhbiBldmVudCBsaXN0ZW5lciB0byB0aGUgcGxheWVyIHdoZW4gYSB1c2VyIHN1YnNjcmliZXMgdG8gaXQuICovXG4gIHByaXZhdGUgX2dldExhenlFbWl0dGVyPFQgZXh0ZW5kcyBZVC5QbGF5ZXJFdmVudD4obmFtZToga2V5b2YgWVQuRXZlbnRzKTogT2JzZXJ2YWJsZTxUPiB7XG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgc3RyZWFtIG9mIHBsYXllcnMuIFRoaXMgd2F5IHRoZSBldmVudHMgd2lsbCBiZSB0cmFuc2ZlcnJlZFxuICAgIC8vIG92ZXIgdG8gdGhlIG5ldyBwbGF5ZXIgaWYgaXQgZ2V0cyBzd2FwcGVkIG91dCB1bmRlci10aGUtaG9vZC5cbiAgICByZXR1cm4gdGhpcy5fcGxheWVyQ2hhbmdlcy5waXBlKFxuICAgICAgLy8gU3dpdGNoIHRvIHRoZSBib3VuZCBldmVudC4gYHN3aXRjaE1hcGAgZW5zdXJlcyB0aGF0IHRoZSBvbGQgZXZlbnQgaXMgcmVtb3ZlZCB3aGVuIHRoZVxuICAgICAgLy8gcGxheWVyIGlzIGNoYW5nZWQuIElmIHRoZXJlJ3Mgbm8gcGxheWVyLCByZXR1cm4gYW4gb2JzZXJ2YWJsZSB0aGF0IG5ldmVyIGVtaXRzLlxuICAgICAgc3dpdGNoTWFwKHBsYXllciA9PiB7XG4gICAgICAgIHJldHVybiBwbGF5ZXJcbiAgICAgICAgICA/IGZyb21FdmVudFBhdHRlcm48VD4oXG4gICAgICAgICAgICAgIChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBBUEkgc2VlbXMgdG8gdGhyb3cgd2hlbiB3ZSB0cnkgdG8gdW5iaW5kIGZyb20gYSBkZXN0cm95ZWQgcGxheWVyIGFuZCBpdCBkb2Vzbid0XG4gICAgICAgICAgICAgICAgLy8gZXhwb3NlIHdoZXRoZXIgdGhlIHBsYXllciBoYXMgYmVlbiBkZXN0cm95ZWQgc28gd2UgaGF2ZSB0byB3cmFwIGl0IGluIGEgdHJ5L2NhdGNoIHRvXG4gICAgICAgICAgICAgICAgLy8gcHJldmVudCB0aGUgZW50aXJlIHN0cmVhbSBmcm9tIGVycm9yaW5nIG91dC5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgcGxheWVyPy5yZW1vdmVFdmVudExpc3RlbmVyPy4obmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIClcbiAgICAgICAgICA6IG9ic2VydmFibGVPZjxUPigpO1xuICAgICAgfSksXG4gICAgICAvLyBCeSBkZWZhdWx0IHdlIHJ1biBhbGwgdGhlIEFQSSBpbnRlcmFjdGlvbnMgb3V0c2lkZSB0aGUgem9uZVxuICAgICAgLy8gc28gd2UgaGF2ZSB0byBicmluZyB0aGUgZXZlbnRzIGJhY2sgaW4gbWFudWFsbHkgd2hlbiB0aGV5IGVtaXQuXG4gICAgICBzb3VyY2UgPT5cbiAgICAgICAgbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT5cbiAgICAgICAgICBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yID0+IG9ic2VydmVyLmVycm9yKGVycm9yKSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiBvYnNlcnZlci5jb21wbGV0ZSgpLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICAgLy8gRW5zdXJlcyB0aGF0IGV2ZXJ5dGhpbmcgaXMgY2xlYXJlZCBvdXQgb24gZGVzdHJveS5cbiAgICAgIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpLFxuICAgICk7XG4gIH1cbn1cblxubGV0IGFwaUxvYWRlZCA9IGZhbHNlO1xuXG4vKiogTG9hZHMgdGhlIFlvdVR1YmUgQVBJIGZyb20gYSBzcGVjaWZpZWQgVVJMIG9ubHkgb25jZS4gKi9cbmZ1bmN0aW9uIGxvYWRBcGkobm9uY2U6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcbiAgaWYgKGFwaUxvYWRlZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFdlIGNhbiB1c2UgYGRvY3VtZW50YCBkaXJlY3RseSBoZXJlLCBiZWNhdXNlIHRoaXMgbG9naWMgZG9lc24ndCBydW4gb3V0c2lkZSB0aGUgYnJvd3Nlci5cbiAgY29uc3QgdXJsID0gJ2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL2lmcmFtZV9hcGknO1xuICBjb25zdCBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgY29uc3QgY2FsbGJhY2sgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgc2NyaXB0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBjYWxsYmFjayk7XG4gICAgc2NyaXB0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgY2FsbGJhY2spO1xuXG4gICAgaWYgKGV2ZW50LnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgIGFwaUxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICBpZiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBsb2FkIFlvdVR1YmUgQVBJIGZyb20gJHt1cmx9YCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBzY3JpcHQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGNhbGxiYWNrKTtcbiAgc2NyaXB0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgY2FsbGJhY2spO1xuICAoc2NyaXB0IGFzIGFueSkuc3JjID0gdXJsO1xuICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuXG4gIGlmIChub25jZSkge1xuICAgIHNjcmlwdC5zZXRBdHRyaWJ1dGUoJ25vbmNlJywgbm9uY2UpO1xuICB9XG5cbiAgLy8gU2V0IHRoaXMgaW1tZWRpYXRlbHkgdG8gdHJ1ZSBzbyB3ZSBkb24ndCBzdGFydCBsb2FkaW5nIGFub3RoZXIgc2NyaXB0XG4gIC8vIHdoaWxlIHRoaXMgb25lIGlzIHBlbmRpbmcuIElmIGxvYWRpbmcgZmFpbHMsIHdlJ2xsIGZsaXAgaXQgYmFjayB0byBmYWxzZS5cbiAgYXBpTG9hZGVkID0gdHJ1ZTtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xufVxuIl19