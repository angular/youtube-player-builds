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
import { ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, Output, ViewChild, ViewEncapsulation, Inject, PLATFORM_ID, } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of as observableOf, Subject, BehaviorSubject, fromEventPattern } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import * as i0 from "@angular/core";
export const DEFAULT_PLAYER_WIDTH = 640;
export const DEFAULT_PLAYER_HEIGHT = 390;
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
        this._height = height || DEFAULT_PLAYER_HEIGHT;
    }
    /** Width of video player */
    get width() {
        return this._width;
    }
    set width(width) {
        this._width = width || DEFAULT_PLAYER_WIDTH;
    }
    constructor(_ngZone, platformId) {
        this._ngZone = _ngZone;
        this._destroyed = new Subject();
        this._playerChanges = new BehaviorSubject(undefined);
        this._height = DEFAULT_PLAYER_HEIGHT;
        this._width = DEFAULT_PLAYER_WIDTH;
        /** Whether cookies inside the player have been disabled. */
        this.disableCookies = false;
        /** Outputs are direct proxies from the player itself. */
        this.ready = this._getLazyEmitter('onReady');
        this.stateChange = this._getLazyEmitter('onStateChange');
        this.error = this._getLazyEmitter('onError');
        this.apiChange = this._getLazyEmitter('onApiChange');
        this.playbackQualityChange = this._getLazyEmitter('onPlaybackQualityChange');
        this.playbackRateChange = this._getLazyEmitter('onPlaybackRateChange');
        this._isBrowser = isPlatformBrowser(platformId);
    }
    ngAfterViewInit() {
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        if (!window.YT || !window.YT.Player) {
            if (this.showBeforeIframeApiLoads && (typeof ngDevMode === 'undefined' || ngDevMode)) {
                throw new Error('Namespace YT not found, cannot construct embedded youtube player. ' +
                    'Please install the YouTube Player API Reference for iframe Embeds: ' +
                    'https://developers.google.com/youtube/iframe_api_reference');
            }
            this._existingApiReadyCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                this._existingApiReadyCallback?.();
                this._ngZone.run(() => this._createPlayer());
            };
        }
        else {
            this._createPlayer();
        }
    }
    ngOnChanges(changes) {
        if (this._shouldRecreatePlayer(changes)) {
            this._createPlayer();
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
        const change = changes['videoId'] || changes['playerVars'] || changes['disableCookies'];
        return !!change && !change.isFirstChange();
    }
    /** Creates a new YouTube player and destroys the existing one. */
    _createPlayer() {
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
            playerVars: this.playerVars,
        }));
        const whenReady = () => {
            // Only assign the player once it's ready, otherwise YouTube doesn't expose some APIs.
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
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.0-rc.0", ngImport: i0, type: YouTubePlayer, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "17.0.0-rc.0", type: YouTubePlayer, selector: "youtube-player", inputs: { videoId: "videoId", height: "height", width: "width", startSeconds: "startSeconds", endSeconds: "endSeconds", suggestedQuality: "suggestedQuality", playerVars: "playerVars", disableCookies: "disableCookies", showBeforeIframeApiLoads: "showBeforeIframeApiLoads" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: '<div #youtubeContainer></div>', isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.0-rc.0", ngImport: i0, type: YouTubePlayer, decorators: [{
            type: Component,
            args: [{
                    selector: 'youtube-player',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None,
                    // This div is *replaced* by the YouTube player embed.
                    template: '<div #youtubeContainer></div>',
                }]
        }], ctorParameters: () => [{ type: i0.NgZone }, { type: Object, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }], propDecorators: { videoId: [{
                type: Input
            }], height: [{
                type: Input
            }], width: [{
                type: Input
            }], startSeconds: [{
                type: Input
            }], endSeconds: [{
                type: Input
            }], suggestedQuality: [{
                type: Input
            }], playerVars: [{
                type: Input
            }], disableCookies: [{
                type: Input
            }], showBeforeIframeApiLoads: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU0EsaUNBQWlDO0FBVGpDOzs7Ozs7R0FNRztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBRU4sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsTUFBTSxFQUNOLFdBQVcsR0FJWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUNsRCxPQUFPLEVBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxZQUFZLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNoRyxPQUFPLEVBQUMsU0FBUyxFQUFFLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDOztBQVNwRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7QUFDeEMsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDO0FBY3pDOzs7O0dBSUc7QUFRSCxNQUFNLE9BQU8sYUFBYTtJQWN4Qiw2QkFBNkI7SUFDN0IsSUFDSSxNQUFNO1FBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3RCLENBQUM7SUFDRCxJQUFJLE1BQU0sQ0FBQyxNQUEwQjtRQUNuQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sSUFBSSxxQkFBcUIsQ0FBQztJQUNqRCxDQUFDO0lBR0QsNEJBQTRCO0lBQzVCLElBQ0ksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBQ0QsSUFBSSxLQUFLLENBQUMsS0FBeUI7UUFD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YUFBYSx3Q0F5RmQsV0FBVzt1R0F6RlYsYUFBYSw0cEJBRmQsK0JBQStCOztnR0FFOUIsYUFBYTtrQkFQekIsU0FBUzttQkFBQztvQkFDVCxRQUFRLEVBQUUsZ0JBQWdCO29CQUMxQixlQUFlLEVBQUUsdUJBQXVCLENBQUMsTUFBTTtvQkFDL0MsYUFBYSxFQUFFLGlCQUFpQixDQUFDLElBQUk7b0JBQ3JDLHNEQUFzRDtvQkFDdEQsUUFBUSxFQUFFLCtCQUErQjtpQkFDMUM7OzBCQTBGSSxNQUFNOzJCQUFDLFdBQVc7eUNBN0VyQixPQUFPO3NCQUROLEtBQUs7Z0JBS0YsTUFBTTtzQkFEVCxLQUFLO2dCQVdGLEtBQUs7c0JBRFIsS0FBSztnQkFXTixZQUFZO3NCQURYLEtBQUs7Z0JBS04sVUFBVTtzQkFEVCxLQUFLO2dCQUtOLGdCQUFnQjtzQkFEZixLQUFLO2dCQVFOLFVBQVU7c0JBRFQsS0FBSztnQkFLTixjQUFjO3NCQURiLEtBQUs7Z0JBUUcsd0JBQXdCO3NCQUFoQyxLQUFLO2dCQUdhLEtBQUs7c0JBQXZCLE1BQU07Z0JBR1ksV0FBVztzQkFBN0IsTUFBTTtnQkFHWSxLQUFLO3NCQUF2QixNQUFNO2dCQUdZLFNBQVM7c0JBQTNCLE1BQU07Z0JBR1kscUJBQXFCO3NCQUF2QyxNQUFNO2dCQUdZLGtCQUFrQjtzQkFBcEMsTUFBTTtnQkFLUCxnQkFBZ0I7c0JBRGYsU0FBUzt1QkFBQyxrQkFBa0IsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gV29ya2Fyb3VuZCBmb3I6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvMTI2NVxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ5b3V0dWJlXCIgLz5cblxuaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25EZXN0cm95LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIEluamVjdCxcbiAgUExBVEZPUk1fSUQsXG4gIE9uQ2hhbmdlcyxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgQWZ0ZXJWaWV3SW5pdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2lzUGxhdGZvcm1Ccm93c2VyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBvZiBhcyBvYnNlcnZhYmxlT2YsIFN1YmplY3QsIEJlaGF2aW9yU3ViamVjdCwgZnJvbUV2ZW50UGF0dGVybn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge3Rha2VVbnRpbCwgc3dpdGNoTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgWVQ6IHR5cGVvZiBZVCB8IHVuZGVmaW5lZDtcbiAgICBvbllvdVR1YmVJZnJhbWVBUElSZWFkeTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9XSURUSCA9IDY0MDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9IRUlHSFQgPSAzOTA7XG5cbi8qKlxuICogT2JqZWN0IHVzZWQgdG8gc3RvcmUgdGhlIHN0YXRlIG9mIHRoZSBwbGF5ZXIgaWYgdGhlXG4gKiB1c2VyIHRyaWVzIHRvIGludGVyYWN0IHdpdGggdGhlIEFQSSBiZWZvcmUgaXQgaGFzIGJlZW4gbG9hZGVkLlxuICovXG5pbnRlcmZhY2UgUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgcGxheWJhY2tTdGF0ZT86IFlULlBsYXllclN0YXRlLlBMQVlJTkcgfCBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQgfCBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICBwbGF5YmFja1JhdGU/OiBudW1iZXI7XG4gIHZvbHVtZT86IG51bWJlcjtcbiAgbXV0ZWQ/OiBib29sZWFuO1xuICBzZWVrPzoge3NlY29uZHM6IG51bWJlcjsgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW59O1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY29tcG9uZW50IHRoYXQgcmVuZGVycyBhIFlvdVR1YmUgcGxheWVyIHZpYSB0aGUgWW91VHViZSBwbGF5ZXJcbiAqIGlmcmFtZSBBUEkuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2VcbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAneW91dHViZS1wbGF5ZXInLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgLy8gVGhpcyBkaXYgaXMgKnJlcGxhY2VkKiBieSB0aGUgWW91VHViZSBwbGF5ZXIgZW1iZWQuXG4gIHRlbXBsYXRlOiAnPGRpdiAjeW91dHViZUNvbnRhaW5lcj48L2Rpdj4nLFxufSlcbmV4cG9ydCBjbGFzcyBZb3VUdWJlUGxheWVyIGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25DaGFuZ2VzLCBPbkRlc3Ryb3kge1xuICAvKiogV2hldGhlciB3ZSdyZSBjdXJyZW50bHkgcmVuZGVyaW5nIGluc2lkZSBhIGJyb3dzZXIuICovXG4gIHByaXZhdGUgcmVhZG9ubHkgX2lzQnJvd3NlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfcGxheWVyOiBZVC5QbGF5ZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BlbmRpbmdQbGF5ZXI6IFlULlBsYXllciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BlbmRpbmdQbGF5ZXJTdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHJlYWRvbmx5IF9kZXN0cm95ZWQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IF9wbGF5ZXJDaGFuZ2VzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFlvdVR1YmUgVmlkZW8gSUQgdG8gdmlldyAqL1xuICBASW5wdXQoKVxuICB2aWRlb0lkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqIEhlaWdodCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQ7XG4gIH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodCA9IGhlaWdodCB8fCBERUZBVUxUX1BMQVlFUl9IRUlHSFQ7XG4gIH1cbiAgcHJpdmF0ZSBfaGVpZ2h0ID0gREVGQVVMVF9QTEFZRVJfSEVJR0hUO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aCB8fCBERUZBVUxUX1BMQVlFUl9XSURUSDtcbiAgfVxuICBwcml2YXRlIF93aWR0aCA9IERFRkFVTFRfUExBWUVSX1dJRFRIO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdGFydCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHN0YXJ0U2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdG9wIHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgZW5kU2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBUaGUgc3VnZ2VzdGVkIHF1YWxpdHkgb2YgdGhlIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBzdWdnZXN0ZWRRdWFsaXR5OiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEV4dHJhIHBhcmFtZXRlcnMgdXNlZCB0byBjb25maWd1cmUgdGhlIHBsYXllci4gU2VlOlxuICAgKiBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL3BsYXllcl9wYXJhbWV0ZXJzLmh0bWw/cGxheWVyVmVyc2lvbj1IVE1MNSNQYXJhbWV0ZXJzXG4gICAqL1xuICBASW5wdXQoKVxuICBwbGF5ZXJWYXJzOiBZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBXaGV0aGVyIGNvb2tpZXMgaW5zaWRlIHRoZSBwbGF5ZXIgaGF2ZSBiZWVuIGRpc2FibGVkLiAqL1xuICBASW5wdXQoKVxuICBkaXNhYmxlQ29va2llczogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBpZnJhbWUgd2lsbCBhdHRlbXB0IHRvIGxvYWQgcmVnYXJkbGVzcyBvZiB0aGUgc3RhdHVzIG9mIHRoZSBhcGkgb24gdGhlXG4gICAqIHBhZ2UuIFNldCB0aGlzIHRvIHRydWUgaWYgeW91IGRvbid0IHdhbnQgdGhlIGBvbllvdVR1YmVJZnJhbWVBUElSZWFkeWAgZmllbGQgdG8gYmVcbiAgICogc2V0IG9uIHRoZSBnbG9iYWwgd2luZG93LlxuICAgKi9cbiAgQElucHV0KCkgc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzOiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBPdXRwdXRzIGFyZSBkaXJlY3QgcHJveGllcyBmcm9tIHRoZSBwbGF5ZXIgaXRzZWxmLiAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgcmVhZHk6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uUmVhZHknKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgc3RhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25TdGF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50Pignb25TdGF0ZUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBlcnJvcjogT2JzZXJ2YWJsZTxZVC5PbkVycm9yRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PbkVycm9yRXZlbnQ+KCdvbkVycm9yJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGFwaUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25BcGlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tRdWFsaXR5Q2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tSYXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1JhdGVDaGFuZ2UnKTtcblxuICAvKiogVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBpZnJhbWUuICovXG4gIEBWaWV3Q2hpbGQoJ3lvdXR1YmVDb250YWluZXInLCB7c3RhdGljOiB0cnVlfSlcbiAgeW91dHViZUNvbnRhaW5lcjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfbmdab25lOiBOZ1pvbmUsXG4gICAgQEluamVjdChQTEFURk9STV9JRCkgcGxhdGZvcm1JZDogT2JqZWN0LFxuICApIHtcbiAgICB0aGlzLl9pc0Jyb3dzZXIgPSBpc1BsYXRmb3JtQnJvd3NlcihwbGF0Zm9ybUlkKTtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBub3QgaW4gYSBicm93c2VyIGVudmlyb25tZW50LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF3aW5kb3cuWVQgfHwgIXdpbmRvdy5ZVC5QbGF5ZXIpIHtcbiAgICAgIGlmICh0aGlzLnNob3dCZWZvcmVJZnJhbWVBcGlMb2FkcyAmJiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ05hbWVzcGFjZSBZVCBub3QgZm91bmQsIGNhbm5vdCBjb25zdHJ1Y3QgZW1iZWRkZWQgeW91dHViZSBwbGF5ZXIuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSBpbnN0YWxsIHRoZSBZb3VUdWJlIFBsYXllciBBUEkgUmVmZXJlbmNlIGZvciBpZnJhbWUgRW1iZWRzOiAnICtcbiAgICAgICAgICAgICdodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlJyxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrID0gd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5O1xuXG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaz8uKCk7XG4gICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gdGhpcy5fY3JlYXRlUGxheWVyKCkpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fY3JlYXRlUGxheWVyKCk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkNoYW5nZXMoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9zaG91bGRSZWNyZWF0ZVBsYXllcihjaGFuZ2VzKSkge1xuICAgICAgdGhpcy5fY3JlYXRlUGxheWVyKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIGlmIChjaGFuZ2VzWyd3aWR0aCddIHx8IGNoYW5nZXNbJ2hlaWdodCddKSB7XG4gICAgICAgIHRoaXMuX3NldFNpemUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNoYW5nZXNbJ3N1Z2dlc3RlZFF1YWxpdHknXSkge1xuICAgICAgICB0aGlzLl9zZXRRdWFsaXR5KCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGFuZ2VzWydzdGFydFNlY29uZHMnXSB8fCBjaGFuZ2VzWydlbmRTZWNvbmRzJ10gfHwgY2hhbmdlc1snc3VnZ2VzdGVkUXVhbGl0eSddKSB7XG4gICAgICAgIHRoaXMuX2N1ZVBsYXllcigpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXI/LmRlc3Ryb3koKTtcblxuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5kZXN0cm95KCk7XG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s7XG4gICAgfVxuXG4gICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5uZXh0KCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLmNvbXBsZXRlKCk7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGxheVZpZGVvICovXG4gIHBsYXlWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwYXVzZVZpZGVvICovXG4gIHBhdXNlVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBhdXNlVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBBVVNFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc3RvcFZpZGVvICovXG4gIHN0b3BWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEl0IHNlZW1zIGxpa2UgWW91VHViZSBzZXRzIHRoZSBwbGF5ZXIgdG8gQ1VFRCB3aGVuIGl0J3Mgc3RvcHBlZC5cbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZWVrVG8gKi9cbiAgc2Vla1RvKHNlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2Vla1RvKHNlY29uZHMsIGFsbG93U2Vla0FoZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkuc2VlayA9IHtzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI211dGUgKi9cbiAgbXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIubXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3VuTXV0ZSAqL1xuICB1bk11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnVuTXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNpc011dGVkICovXG4gIGlzTXV0ZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5pc011dGVkKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLm11dGVkO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRWb2x1bWUgKi9cbiAgc2V0Vm9sdW1lKHZvbHVtZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS52b2x1bWUgPSB2b2x1bWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZvbHVtZSAqL1xuICBnZXRWb2x1bWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFZvbHVtZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRQbGF5YmFja1JhdGUgKi9cbiAgc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tSYXRlID0gcGxheWJhY2tSYXRlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1JhdGUgKi9cbiAgZ2V0UGxheWJhY2tSYXRlKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1JhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcyAqL1xuICBnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvTG9hZGVkRnJhY3Rpb24gKi9cbiAgZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5ZXJTdGF0ZSAqL1xuICBnZXRQbGF5ZXJTdGF0ZSgpOiBZVC5QbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIgfHwgIXdpbmRvdy5ZVCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFlULlBsYXllclN0YXRlLlVOU1RBUlRFRDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRDdXJyZW50VGltZSAqL1xuICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWsuc2Vjb25kcztcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1F1YWxpdHkgKi9cbiAgZ2V0UGxheWJhY2tRdWFsaXR5KCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1F1YWxpdHkoKSA6ICdkZWZhdWx0JztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzICovXG4gIGdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5W10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0RHVyYXRpb24gKi9cbiAgZ2V0RHVyYXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldER1cmF0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvVXJsICovXG4gIGdldFZpZGVvVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb1VybCgpIDogJyc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9FbWJlZENvZGUgKi9cbiAgZ2V0VmlkZW9FbWJlZENvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvRW1iZWRDb2RlKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSB1c2VkIHRvIHN0b3JlIHRoZSB0ZW1wb3JhcnkgQVBJIHN0YXRlLiAqL1xuICBwcml2YXRlIF9nZXRQZW5kaW5nU3RhdGUoKTogUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgICBpZiAoIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBjaGFuZ2UgaW4gdGhlIGNvbXBvbmVudCBzdGF0ZVxuICAgKiByZXF1aXJlcyB0aGUgWW91VHViZSBwbGF5ZXIgdG8gYmUgcmVjcmVhdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBfc2hvdWxkUmVjcmVhdGVQbGF5ZXIoY2hhbmdlczogU2ltcGxlQ2hhbmdlcyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGNoYW5nZSA9IGNoYW5nZXNbJ3ZpZGVvSWQnXSB8fCBjaGFuZ2VzWydwbGF5ZXJWYXJzJ10gfHwgY2hhbmdlc1snZGlzYWJsZUNvb2tpZXMnXTtcbiAgICByZXR1cm4gISFjaGFuZ2UgJiYgIWNoYW5nZS5pc0ZpcnN0Q2hhbmdlKCk7XG4gIH1cblxuICAvKiogQ3JlYXRlcyBhIG5ldyBZb3VUdWJlIHBsYXllciBhbmQgZGVzdHJveXMgdGhlIGV4aXN0aW5nIG9uZS4gKi9cbiAgcHJpdmF0ZSBfY3JlYXRlUGxheWVyKCkge1xuICAgIHRoaXMuX3BsYXllcj8uZGVzdHJveSgpO1xuICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXI/LmRlc3Ryb3koKTtcblxuICAgIC8vIEEgcGxheWVyIGNhbid0IGJlIGNyZWF0ZWQgaWYgdGhlIEFQSSBpc24ndCBsb2FkZWQsXG4gICAgLy8gb3IgdGhlcmUgaXNuJ3QgYSB2aWRlbyBvciBwbGF5bGlzdCB0byBiZSBwbGF5ZWQuXG4gICAgaWYgKHR5cGVvZiBZVCA9PT0gJ3VuZGVmaW5lZCcgfHwgKCF0aGlzLnZpZGVvSWQgJiYgIXRoaXMucGxheWVyVmFycz8ubGlzdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbXBvcnRhbnQhIFdlIG5lZWQgdG8gY3JlYXRlIHRoZSBQbGF5ZXIgb2JqZWN0IG91dHNpZGUgb2YgdGhlIGBOZ1pvbmVgLCBiZWNhdXNlIGl0IGtpY2tzXG4gICAgLy8gb2ZmIGEgMjUwbXMgc2V0SW50ZXJ2YWwgd2hpY2ggd2lsbCBjb250aW51YWxseSB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gaWYgd2UgZG9uJ3QuXG4gICAgY29uc3QgcGxheWVyID0gdGhpcy5fbmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKFxuICAgICAgKCkgPT5cbiAgICAgICAgbmV3IFlULlBsYXllcih0aGlzLnlvdXR1YmVDb250YWluZXIubmF0aXZlRWxlbWVudCwge1xuICAgICAgICAgIHZpZGVvSWQ6IHRoaXMudmlkZW9JZCxcbiAgICAgICAgICBob3N0OiB0aGlzLmRpc2FibGVDb29raWVzID8gJ2h0dHBzOi8vd3d3LnlvdXR1YmUtbm9jb29raWUuY29tJyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICB3aWR0aDogdGhpcy53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IHRoaXMuaGVpZ2h0LFxuICAgICAgICAgIHBsYXllclZhcnM6IHRoaXMucGxheWVyVmFycyxcbiAgICAgICAgfSksXG4gICAgKTtcblxuICAgIGNvbnN0IHdoZW5SZWFkeSA9ICgpID0+IHtcbiAgICAgIC8vIE9ubHkgYXNzaWduIHRoZSBwbGF5ZXIgb25jZSBpdCdzIHJlYWR5LCBvdGhlcndpc2UgWW91VHViZSBkb2Vzbid0IGV4cG9zZSBzb21lIEFQSXMuXG4gICAgICB0aGlzLl9wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyID0gdW5kZWZpbmVkO1xuICAgICAgcGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCB3aGVuUmVhZHkpO1xuICAgICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5uZXh0KHBsYXllcik7XG4gICAgICB0aGlzLl9zZXRTaXplKCk7XG4gICAgICB0aGlzLl9zZXRRdWFsaXR5KCk7XG5cbiAgICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgICAgdGhpcy5fYXBwbHlQZW5kaW5nUGxheWVyU3RhdGUocGxheWVyLCB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgY3VlIHRoZSBwbGF5ZXIgd2hlbiBpdCBlaXRoZXIgaGFzbid0IHN0YXJ0ZWQgeWV0IG9yIGl0J3MgY3VlZCxcbiAgICAgIC8vIG90aGVyd2lzZSBjdWluZyBpdCBjYW4gaW50ZXJydXB0IGEgcGxheWVyIHdpdGggYXV0b3BsYXkgZW5hYmxlZC5cbiAgICAgIGNvbnN0IHN0YXRlID0gcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgICBpZiAoc3RhdGUgPT09IFlULlBsYXllclN0YXRlLlVOU1RBUlRFRCB8fCBzdGF0ZSA9PT0gWVQuUGxheWVyU3RhdGUuQ1VFRCB8fCBzdGF0ZSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX2N1ZVBsYXllcigpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLl9wZW5kaW5nUGxheWVyID0gcGxheWVyO1xuICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgd2hlblJlYWR5KTtcbiAgfVxuXG4gIC8qKiBBcHBsaWVzIGFueSBzdGF0ZSB0aGF0IGNoYW5nZWQgYmVmb3JlIHRoZSBwbGF5ZXIgd2FzIGluaXRpYWxpemVkLiAqL1xuICBwcml2YXRlIF9hcHBseVBlbmRpbmdQbGF5ZXJTdGF0ZShwbGF5ZXI6IFlULlBsYXllciwgcGVuZGluZ1N0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCB7cGxheWJhY2tTdGF0ZSwgcGxheWJhY2tSYXRlLCB2b2x1bWUsIG11dGVkLCBzZWVrfSA9IHBlbmRpbmdTdGF0ZTtcblxuICAgIHN3aXRjaCAocGxheWJhY2tTdGF0ZSkge1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HOlxuICAgICAgICBwbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ6XG4gICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5DVUVEOlxuICAgICAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH1cblxuICAgIGlmICh2b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH1cblxuICAgIGlmIChtdXRlZCAhPSBudWxsKSB7XG4gICAgICBtdXRlZCA/IHBsYXllci5tdXRlKCkgOiBwbGF5ZXIudW5NdXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlZWsgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNlZWtUbyhzZWVrLnNlY29uZHMsIHNlZWsuYWxsb3dTZWVrQWhlYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBDdWVzIHRoZSBwbGF5ZXIgYmFzZWQgb24gdGhlIGN1cnJlbnQgY29tcG9uZW50IHN0YXRlLiAqL1xuICBwcml2YXRlIF9jdWVQbGF5ZXIoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllciAmJiB0aGlzLnZpZGVvSWQpIHtcbiAgICAgIHRoaXMuX3BsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkOiB0aGlzLnZpZGVvSWQsXG4gICAgICAgIHN0YXJ0U2Vjb25kczogdGhpcy5zdGFydFNlY29uZHMsXG4gICAgICAgIGVuZFNlY29uZHM6IHRoaXMuZW5kU2Vjb25kcyxcbiAgICAgICAgc3VnZ2VzdGVkUXVhbGl0eTogdGhpcy5zdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNldHMgdGhlIHBsYXllcidzIHNpemUgYmFzZWQgb24gdGhlIGN1cnJlbnQgaW5wdXQgdmFsdWVzLiAqL1xuICBwcml2YXRlIF9zZXRTaXplKCkge1xuICAgIHRoaXMuX3BsYXllcj8uc2V0U2l6ZSh0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gIH1cblxuICAvKiogU2V0cyB0aGUgcGxheWVyJ3MgcXVhbGl0eSBiYXNlZCBvbiB0aGUgY3VycmVudCBpbnB1dCB2YWx1ZXMuICovXG4gIHByaXZhdGUgX3NldFF1YWxpdHkoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllciAmJiB0aGlzLnN1Z2dlc3RlZFF1YWxpdHkpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1F1YWxpdHkodGhpcy5zdWdnZXN0ZWRRdWFsaXR5KTtcbiAgICB9XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYnNlcnZhYmxlIHRoYXQgYWRkcyBhbiBldmVudCBsaXN0ZW5lciB0byB0aGUgcGxheWVyIHdoZW4gYSB1c2VyIHN1YnNjcmliZXMgdG8gaXQuICovXG4gIHByaXZhdGUgX2dldExhenlFbWl0dGVyPFQgZXh0ZW5kcyBZVC5QbGF5ZXJFdmVudD4obmFtZToga2V5b2YgWVQuRXZlbnRzKTogT2JzZXJ2YWJsZTxUPiB7XG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgc3RyZWFtIG9mIHBsYXllcnMuIFRoaXMgd2F5IHRoZSBldmVudHMgd2lsbCBiZSB0cmFuc2ZlcnJlZFxuICAgIC8vIG92ZXIgdG8gdGhlIG5ldyBwbGF5ZXIgaWYgaXQgZ2V0cyBzd2FwcGVkIG91dCB1bmRlci10aGUtaG9vZC5cbiAgICByZXR1cm4gdGhpcy5fcGxheWVyQ2hhbmdlcy5waXBlKFxuICAgICAgLy8gU3dpdGNoIHRvIHRoZSBib3VuZCBldmVudC4gYHN3aXRjaE1hcGAgZW5zdXJlcyB0aGF0IHRoZSBvbGQgZXZlbnQgaXMgcmVtb3ZlZCB3aGVuIHRoZVxuICAgICAgLy8gcGxheWVyIGlzIGNoYW5nZWQuIElmIHRoZXJlJ3Mgbm8gcGxheWVyLCByZXR1cm4gYW4gb2JzZXJ2YWJsZSB0aGF0IG5ldmVyIGVtaXRzLlxuICAgICAgc3dpdGNoTWFwKHBsYXllciA9PiB7XG4gICAgICAgIHJldHVybiBwbGF5ZXJcbiAgICAgICAgICA/IGZyb21FdmVudFBhdHRlcm48VD4oXG4gICAgICAgICAgICAgIChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBBUEkgc2VlbXMgdG8gdGhyb3cgd2hlbiB3ZSB0cnkgdG8gdW5iaW5kIGZyb20gYSBkZXN0cm95ZWQgcGxheWVyIGFuZCBpdCBkb2Vzbid0XG4gICAgICAgICAgICAgICAgLy8gZXhwb3NlIHdoZXRoZXIgdGhlIHBsYXllciBoYXMgYmVlbiBkZXN0cm95ZWQgc28gd2UgaGF2ZSB0byB3cmFwIGl0IGluIGEgdHJ5L2NhdGNoIHRvXG4gICAgICAgICAgICAgICAgLy8gcHJldmVudCB0aGUgZW50aXJlIHN0cmVhbSBmcm9tIGVycm9yaW5nIG91dC5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgcGxheWVyPy5yZW1vdmVFdmVudExpc3RlbmVyPy4obmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIClcbiAgICAgICAgICA6IG9ic2VydmFibGVPZjxUPigpO1xuICAgICAgfSksXG4gICAgICAvLyBCeSBkZWZhdWx0IHdlIHJ1biBhbGwgdGhlIEFQSSBpbnRlcmFjdGlvbnMgb3V0c2lkZSB0aGUgem9uZVxuICAgICAgLy8gc28gd2UgaGF2ZSB0byBicmluZyB0aGUgZXZlbnRzIGJhY2sgaW4gbWFudWFsbHkgd2hlbiB0aGV5IGVtaXQuXG4gICAgICBzb3VyY2UgPT5cbiAgICAgICAgbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT5cbiAgICAgICAgICBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yID0+IG9ic2VydmVyLmVycm9yKGVycm9yKSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiBvYnNlcnZlci5jb21wbGV0ZSgpLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICAgLy8gRW5zdXJlcyB0aGF0IGV2ZXJ5dGhpbmcgaXMgY2xlYXJlZCBvdXQgb24gZGVzdHJveS5cbiAgICAgIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpLFxuICAgICk7XG4gIH1cbn1cbiJdfQ==