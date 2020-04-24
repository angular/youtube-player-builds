/**
 * @fileoverview added by tsickle
 * Generated from: src/youtube-player/youtube-player.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
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
import { ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, Output, ViewChild, ViewEncapsulation, Optional, Inject, PLATFORM_ID, } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { combineLatest, merge, Observable, of as observableOf, pipe, Subject, of, BehaviorSubject, fromEventPattern, } from 'rxjs';
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, switchMap, } from 'rxjs/operators';
/** @type {?} */
export const DEFAULT_PLAYER_WIDTH = 640;
/** @type {?} */
export const DEFAULT_PLAYER_HEIGHT = 390;
/**
 * @record
 */
function Player() { }
if (false) {
    /** @type {?|undefined} */
    Player.prototype.videoId;
}
/**
 * Object used to store the state of the player if the
 * user tries to interact with the API before it has been loaded.
 * @record
 */
function PendingPlayerState() { }
if (false) {
    /** @type {?|undefined} */
    PendingPlayerState.prototype.playbackState;
    /** @type {?|undefined} */
    PendingPlayerState.prototype.playbackRate;
    /** @type {?|undefined} */
    PendingPlayerState.prototype.volume;
    /** @type {?|undefined} */
    PendingPlayerState.prototype.muted;
    /** @type {?|undefined} */
    PendingPlayerState.prototype.seek;
}
/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export class YouTubePlayer {
    /**
     * @param {?} _ngZone
     * @param {?=} platformId
     */
    constructor(_ngZone, 
    /**
     * @deprecated `platformId` parameter to become required.
     * @breaking-change 10.0.0
     */
    platformId) {
        this._ngZone = _ngZone;
        this._youtubeContainer = new Subject();
        this._destroyed = new Subject();
        this._playerChanges = new BehaviorSubject(undefined);
        this._videoId = new BehaviorSubject(undefined);
        this._height = new BehaviorSubject(DEFAULT_PLAYER_HEIGHT);
        this._width = new BehaviorSubject(DEFAULT_PLAYER_WIDTH);
        this._startSeconds = new BehaviorSubject(undefined);
        this._endSeconds = new BehaviorSubject(undefined);
        this._suggestedQuality = new BehaviorSubject(undefined);
        /**
         * Outputs are direct proxies from the player itself.
         */
        this.ready = this._getLazyEmitter('onReady');
        this.stateChange = this._getLazyEmitter('onStateChange');
        this.error = this._getLazyEmitter('onError');
        this.apiChange = this._getLazyEmitter('onApiChange');
        this.playbackQualityChange = this._getLazyEmitter('onPlaybackQualityChange');
        this.playbackRateChange = this._getLazyEmitter('onPlaybackRateChange');
        // @breaking-change 10.0.0 Remove null check for `platformId`.
        this._isBrowser =
            platformId ? isPlatformBrowser(platformId) : typeof window === 'object' && !!window;
    }
    /**
     * YouTube Video ID to view
     * @return {?}
     */
    get videoId() { return this._videoId.value; }
    /**
     * @param {?} videoId
     * @return {?}
     */
    set videoId(videoId) {
        this._videoId.next(videoId);
    }
    /**
     * Height of video player
     * @return {?}
     */
    get height() { return this._height.value; }
    /**
     * @param {?} height
     * @return {?}
     */
    set height(height) {
        this._height.next(height || DEFAULT_PLAYER_HEIGHT);
    }
    /**
     * Width of video player
     * @return {?}
     */
    get width() { return this._width.value; }
    /**
     * @param {?} width
     * @return {?}
     */
    set width(width) {
        this._width.next(width || DEFAULT_PLAYER_WIDTH);
    }
    /**
     * The moment when the player is supposed to start playing
     * @param {?} startSeconds
     * @return {?}
     */
    set startSeconds(startSeconds) {
        this._startSeconds.next(startSeconds);
    }
    /**
     * The moment when the player is supposed to stop playing
     * @param {?} endSeconds
     * @return {?}
     */
    set endSeconds(endSeconds) {
        this._endSeconds.next(endSeconds);
    }
    /**
     * The suggested quality of the player
     * @param {?} suggestedQuality
     * @return {?}
     */
    set suggestedQuality(suggestedQuality) {
        this._suggestedQuality.next(suggestedQuality);
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        /** @type {?} */
        let iframeApiAvailableObs = observableOf(true);
        if (!window.YT) {
            if (this.showBeforeIframeApiLoads) {
                throw new Error('Namespace YT not found, cannot construct embedded youtube player. ' +
                    'Please install the YouTube Player API Reference for iframe Embeds: ' +
                    'https://developers.google.com/youtube/iframe_api_reference');
            }
            /** @type {?} */
            const iframeApiAvailableSubject = new Subject();
            this._existingApiReadyCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = (/**
             * @return {?}
             */
            () => {
                if (this._existingApiReadyCallback) {
                    this._existingApiReadyCallback();
                }
                this._ngZone.run((/**
                 * @return {?}
                 */
                () => iframeApiAvailableSubject.next(true)));
            });
            iframeApiAvailableObs = iframeApiAvailableSubject.pipe(take(1), startWith(false));
        }
        // An observable of the currently loaded player.
        /** @type {?} */
        const playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this._ngZone).pipe(waitUntilReady((/**
         * @param {?} player
         * @return {?}
         */
        player => {
            // Destroy the player if loading was aborted so that we don't end up leaking memory.
            if (!playerIsReady(player)) {
                player.destroy();
            }
        })), takeUntil(this._destroyed), publish());
        // Set up side effects to bind inputs to the player.
        playerObs.subscribe((/**
         * @param {?} player
         * @return {?}
         */
        player => {
            this._player = player;
            this._playerChanges.next(player);
            if (player && this._pendingPlayerState) {
                this._initializePlayer(player, this._pendingPlayerState);
            }
            this._pendingPlayerState = undefined;
        }));
        bindSizeToPlayer(playerObs, this._width, this._height);
        bindSuggestedQualityToPlayer(playerObs, this._suggestedQuality);
        bindCueVideoCall(playerObs, this._videoId, this._startSeconds, this._endSeconds, this._suggestedQuality, this._destroyed);
        // After all of the subscriptions are set up, connect the observable.
        ((/** @type {?} */ (playerObs))).connect();
    }
    /**
     * @deprecated No longer being used. To be removed.
     * \@breaking-change 11.0.0
     * @return {?}
     */
    createEventsBoundInZone() {
        return {};
    }
    /**
     * @return {?}
     */
    ngAfterViewInit() {
        this._youtubeContainer.next(this.youtubeContainer.nativeElement);
    }
    /**
     * @return {?}
     */
    ngOnDestroy() {
        if (this._player) {
            this._player.destroy();
            window.onYouTubeIframeAPIReady = this._existingApiReadyCallback;
        }
        this._playerChanges.complete();
        this._videoId.complete();
        this._height.complete();
        this._width.complete();
        this._startSeconds.complete();
        this._endSeconds.complete();
        this._suggestedQuality.complete();
        this._youtubeContainer.complete();
        this._destroyed.next();
        this._destroyed.complete();
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#playVideo
     * @return {?}
     */
    playVideo() {
        if (this._player) {
            this._player.playVideo();
        }
        else {
            this._getPendingState().playbackState = 1 /* PLAYING */;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#pauseVideo
     * @return {?}
     */
    pauseVideo() {
        if (this._player) {
            this._player.pauseVideo();
        }
        else {
            this._getPendingState().playbackState = 2 /* PAUSED */;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#stopVideo
     * @return {?}
     */
    stopVideo() {
        if (this._player) {
            this._player.stopVideo();
        }
        else {
            // It seems like YouTube sets the player to CUED when it's stopped.
            this._getPendingState().playbackState = 5 /* CUED */;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#seekTo
     * @param {?} seconds
     * @param {?} allowSeekAhead
     * @return {?}
     */
    seekTo(seconds, allowSeekAhead) {
        if (this._player) {
            this._player.seekTo(seconds, allowSeekAhead);
        }
        else {
            this._getPendingState().seek = { seconds, allowSeekAhead };
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#mute
     * @return {?}
     */
    mute() {
        if (this._player) {
            this._player.mute();
        }
        else {
            this._getPendingState().muted = true;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#unMute
     * @return {?}
     */
    unMute() {
        if (this._player) {
            this._player.unMute();
        }
        else {
            this._getPendingState().muted = false;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#isMuted
     * @return {?}
     */
    isMuted() {
        if (this._player) {
            return this._player.isMuted();
        }
        if (this._pendingPlayerState) {
            return !!this._pendingPlayerState.muted;
        }
        return false;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#setVolume
     * @param {?} volume
     * @return {?}
     */
    setVolume(volume) {
        if (this._player) {
            this._player.setVolume(volume);
        }
        else {
            this._getPendingState().volume = volume;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getVolume
     * @return {?}
     */
    getVolume() {
        if (this._player) {
            return this._player.getVolume();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.volume != null) {
            return this._pendingPlayerState.volume;
        }
        return 0;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#setPlaybackRate
     * @param {?} playbackRate
     * @return {?}
     */
    setPlaybackRate(playbackRate) {
        if (this._player) {
            return this._player.setPlaybackRate(playbackRate);
        }
        else {
            this._getPendingState().playbackRate = playbackRate;
        }
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getPlaybackRate
     * @return {?}
     */
    getPlaybackRate() {
        if (this._player) {
            return this._player.getPlaybackRate();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.playbackRate != null) {
            return this._pendingPlayerState.playbackRate;
        }
        return 0;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getAvailablePlaybackRates
     * @return {?}
     */
    getAvailablePlaybackRates() {
        return this._player ? this._player.getAvailablePlaybackRates() : [];
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getVideoLoadedFraction
     * @return {?}
     */
    getVideoLoadedFraction() {
        return this._player ? this._player.getVideoLoadedFraction() : 0;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getPlayerState
     * @return {?}
     */
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
        return -1 /* UNSTARTED */;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getCurrentTime
     * @return {?}
     */
    getCurrentTime() {
        if (this._player) {
            return this._player.getCurrentTime();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.seek) {
            return this._pendingPlayerState.seek.seconds;
        }
        return 0;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getPlaybackQuality
     * @return {?}
     */
    getPlaybackQuality() {
        return this._player ? this._player.getPlaybackQuality() : 'default';
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getAvailableQualityLevels
     * @return {?}
     */
    getAvailableQualityLevels() {
        return this._player ? this._player.getAvailableQualityLevels() : [];
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getDuration
     * @return {?}
     */
    getDuration() {
        return this._player ? this._player.getDuration() : 0;
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getVideoUrl
     * @return {?}
     */
    getVideoUrl() {
        return this._player ? this._player.getVideoUrl() : '';
    }
    /**
     * See https://developers.google.com/youtube/iframe_api_reference#getVideoEmbedCode
     * @return {?}
     */
    getVideoEmbedCode() {
        return this._player ? this._player.getVideoEmbedCode() : '';
    }
    /**
     * Gets an object that should be used to store the temporary API state.
     * @private
     * @return {?}
     */
    _getPendingState() {
        if (!this._pendingPlayerState) {
            this._pendingPlayerState = {};
        }
        return this._pendingPlayerState;
    }
    /**
     * Initializes a player from a temporary state.
     * @private
     * @param {?} player
     * @param {?} state
     * @return {?}
     */
    _initializePlayer(player, state) {
        const { playbackState, playbackRate, volume, muted, seek } = state;
        switch (playbackState) {
            case 1 /* PLAYING */:
                player.playVideo();
                break;
            case 2 /* PAUSED */:
                player.pauseVideo();
                break;
            case 5 /* CUED */:
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
    /**
     * Gets an observable that adds an event listener to the player when a user subscribes to it.
     * @private
     * @template T
     * @param {?} name
     * @return {?}
     */
    _getLazyEmitter(name) {
        // Start with the stream of players. This way the events will be transferred
        // over to the new player if it gets swapped out under-the-hood.
        return this._playerChanges.pipe(
        // Switch to the bound event. `switchMap` ensures that the old event is removed when the
        // player is changed. If there's no player, return an observable that never emits.
        switchMap((/**
         * @param {?} player
         * @return {?}
         */
        player => {
            return player ? fromEventPattern((/**
             * @param {?} listener
             * @return {?}
             */
            (listener) => {
                player.addEventListener(name, listener);
            }), (/**
             * @param {?} listener
             * @return {?}
             */
            (listener) => {
                // The API seems to throw when we try to unbind from a destroyed player and it doesn't
                // expose whether the player has been destroyed so we have to wrap it in a try/catch to
                // prevent the entire stream from erroring out.
                try {
                    player.removeEventListener(name, listener);
                }
                catch (_a) { }
            })) : observableOf();
        })), (
        // By default we run all the API interactions outside the zone
        // so we have to bring the events back in manually when they emit.
        /**
         * @param {?} source
         * @return {?}
         */
        (source) => new Observable((/**
         * @param {?} observer
         * @return {?}
         */
        observer => source.subscribe({
            next: (/**
             * @param {?} value
             * @return {?}
             */
            value => this._ngZone.run((/**
             * @return {?}
             */
            () => observer.next(value)))),
            error: (/**
             * @param {?} error
             * @return {?}
             */
            error => observer.error(error)),
            complete: (/**
             * @return {?}
             */
            () => observer.complete())
        })))), 
        // Ensures that everything is cleared out on destroy.
        takeUntil(this._destroyed));
    }
}
YouTubePlayer.decorators = [
    { type: Component, args: [{
                selector: 'youtube-player',
                changeDetection: ChangeDetectionStrategy.OnPush,
                encapsulation: ViewEncapsulation.None,
                // This div is *replaced* by the YouTube player embed.
                template: '<div #youtubeContainer></div>'
            }] }
];
/** @nocollapse */
YouTubePlayer.ctorParameters = () => [
    { type: NgZone },
    { type: Object, decorators: [{ type: Optional }, { type: Inject, args: [PLATFORM_ID,] }] }
];
YouTubePlayer.propDecorators = {
    videoId: [{ type: Input }],
    height: [{ type: Input }],
    width: [{ type: Input }],
    startSeconds: [{ type: Input }],
    endSeconds: [{ type: Input }],
    suggestedQuality: [{ type: Input }],
    showBeforeIframeApiLoads: [{ type: Input }],
    ready: [{ type: Output }],
    stateChange: [{ type: Output }],
    error: [{ type: Output }],
    apiChange: [{ type: Output }],
    playbackQualityChange: [{ type: Output }],
    playbackRateChange: [{ type: Output }],
    youtubeContainer: [{ type: ViewChild, args: ['youtubeContainer',] }]
};
if (false) {
    /**
     * Whether we're currently rendering inside a browser.
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._isBrowser;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._youtubeContainer;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._destroyed;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._player;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._existingApiReadyCallback;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._pendingPlayerState;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._playerChanges;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._videoId;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._height;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._width;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._startSeconds;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._endSeconds;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._suggestedQuality;
    /**
     * Whether the iframe will attempt to load regardless of the status of the api on the
     * page. Set this to true if you don't want the `onYouTubeIframeAPIReady` field to be
     * set on the global window.
     * @type {?}
     */
    YouTubePlayer.prototype.showBeforeIframeApiLoads;
    /**
     * Outputs are direct proxies from the player itself.
     * @type {?}
     */
    YouTubePlayer.prototype.ready;
    /** @type {?} */
    YouTubePlayer.prototype.stateChange;
    /** @type {?} */
    YouTubePlayer.prototype.error;
    /** @type {?} */
    YouTubePlayer.prototype.apiChange;
    /** @type {?} */
    YouTubePlayer.prototype.playbackQualityChange;
    /** @type {?} */
    YouTubePlayer.prototype.playbackRateChange;
    /**
     * The element that will be replaced by the iframe.
     * @type {?}
     */
    YouTubePlayer.prototype.youtubeContainer;
    /**
     * @type {?}
     * @private
     */
    YouTubePlayer.prototype._ngZone;
}
/**
 * Listens to changes to the given width and height and sets it on the player.
 * @param {?} playerObs
 * @param {?} widthObs
 * @param {?} heightObs
 * @return {?}
 */
function bindSizeToPlayer(playerObs, widthObs, heightObs) {
    return combineLatest([playerObs, widthObs, heightObs])
        .subscribe((/**
     * @param {?} __0
     * @return {?}
     */
    ([player, width, height]) => player && player.setSize(width, height)));
}
/**
 * Listens to changes from the suggested quality and sets it on the given player.
 * @param {?} playerObs
 * @param {?} suggestedQualityObs
 * @return {?}
 */
function bindSuggestedQualityToPlayer(playerObs, suggestedQualityObs) {
    return combineLatest([
        playerObs,
        suggestedQualityObs
    ]).subscribe((/**
     * @param {?} __0
     * @return {?}
     */
    ([player, suggestedQuality]) => player && suggestedQuality && player.setPlaybackQuality(suggestedQuality)));
}
/**
 * Returns an observable that emits the loaded player once it's ready. Certain properties/methods
 * won't be available until the iframe finishes loading.
 * @param {?} onAbort Callback function that will be invoked if the player loading was aborted before
 * it was able to complete. Can be used to clean up any loose references.
 * @return {?}
 */
function waitUntilReady(onAbort) {
    return flatMap((/**
     * @param {?} player
     * @return {?}
     */
    player => {
        if (!player) {
            return observableOf(undefined);
        }
        if (playerIsReady(player)) {
            return observableOf((/** @type {?} */ (player)));
        }
        // Since removeEventListener is not on Player when it's initialized, we can't use fromEvent.
        // The player is not initialized fully until the ready is called.
        return new Observable((/**
         * @param {?} emitter
         * @return {?}
         */
        emitter => {
            /** @type {?} */
            let aborted = false;
            /** @type {?} */
            let resolved = false;
            /** @type {?} */
            const onReady = (/**
             * @param {?} event
             * @return {?}
             */
            (event) => {
                resolved = true;
                if (!aborted) {
                    event.target.removeEventListener('onReady', onReady);
                    emitter.next(event.target);
                }
            });
            player.addEventListener('onReady', onReady);
            return (/**
             * @return {?}
             */
            () => {
                aborted = true;
                if (!resolved) {
                    onAbort(player);
                }
            });
        })).pipe(take(1), startWith(undefined));
    }));
}
/**
 * Create an observable for the player based on the given options.
 * @param {?} youtubeContainer
 * @param {?} videoIdObs
 * @param {?} iframeApiAvailableObs
 * @param {?} widthObs
 * @param {?} heightObs
 * @param {?} ngZone
 * @return {?}
 */
function createPlayerObservable(youtubeContainer, videoIdObs, iframeApiAvailableObs, widthObs, heightObs, ngZone) {
    /** @type {?} */
    const playerOptions = videoIdObs
        .pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map((/**
     * @param {?} __0
     * @return {?}
     */
    ([videoId, [width, height]]) => videoId ? ({ videoId, width, height }) : undefined)));
    return combineLatest([youtubeContainer, playerOptions, of(ngZone)])
        .pipe(skipUntilRememberLatest(iframeApiAvailableObs), scan(syncPlayerState, undefined), distinctUntilChanged());
}
/**
 * Skips the given observable until the other observable emits true, then emit the latest.
 * @template T
 * @param {?} notifier
 * @return {?}
 */
function skipUntilRememberLatest(notifier) {
    return pipe(combineLatestOp(notifier), skipWhile((/**
     * @param {?} __0
     * @return {?}
     */
    ([_, doneSkipping]) => !doneSkipping)), map((/**
     * @param {?} __0
     * @return {?}
     */
    ([value]) => value)));
}
/**
 * Destroy the player if there are no options, or create the player if there are options.
 * @param {?} player
 * @param {?} __1
 * @return {?}
 */
function syncPlayerState(player, [container, videoOptions, ngZone]) {
    if (!videoOptions) {
        if (player) {
            player.destroy();
        }
        return;
    }
    if (player) {
        return player;
    }
    // Important! We need to create the Player object outside of the `NgZone`, because it kicks
    // off a 250ms setInterval which will continually trigger change detection if we don't.
    /** @type {?} */
    const newPlayer = ngZone.runOutsideAngular((/**
     * @return {?}
     */
    () => new YT.Player(container, videoOptions)));
    // Bind videoId for future use.
    newPlayer.videoId = videoOptions.videoId;
    return newPlayer;
}
/**
 * Call cueVideoById if the videoId changes, or when start or end seconds change. cueVideoById will
 * change the loaded video id to the given videoId, and set the start and end times to the given
 * start/end seconds.
 * @param {?} playerObs
 * @param {?} videoIdObs
 * @param {?} startSecondsObs
 * @param {?} endSecondsObs
 * @param {?} suggestedQualityObs
 * @param {?} destroyed
 * @return {?}
 */
function bindCueVideoCall(playerObs, videoIdObs, startSecondsObs, endSecondsObs, suggestedQualityObs, destroyed) {
    /** @type {?} */
    const cueOptionsObs = combineLatest([startSecondsObs, endSecondsObs])
        .pipe(map((/**
     * @param {?} __0
     * @return {?}
     */
    ([startSeconds, endSeconds]) => ({ startSeconds, endSeconds }))));
    // Only respond to changes in cue options if the player is not running.
    /** @type {?} */
    const filteredCueOptions = cueOptionsObs
        .pipe(filterOnOther(playerObs, (/**
     * @param {?} player
     * @return {?}
     */
    player => !!player && !hasPlayerStarted(player))));
    // If the video id changed, there's no reason to run 'cue' unless the player
    // was initialized with a different video id.
    /** @type {?} */
    const changedVideoId = videoIdObs
        .pipe(filterOnOther(playerObs, (/**
     * @param {?} player
     * @param {?} videoId
     * @return {?}
     */
    (player, videoId) => !!player && player.videoId !== videoId)));
    // If the player changed, there's no reason to run 'cue' unless there are cue options.
    /** @type {?} */
    const changedPlayer = playerObs.pipe(filterOnOther(combineLatest([videoIdObs, cueOptionsObs]), (/**
     * @param {?} __0
     * @param {?} player
     * @return {?}
     */
    ([videoId, cueOptions], player) => !!player &&
        (videoId != player.videoId || !!cueOptions.startSeconds || !!cueOptions.endSeconds))));
    merge(changedPlayer, changedVideoId, filteredCueOptions)
        .pipe(withLatestFrom(combineLatest([playerObs, videoIdObs, cueOptionsObs, suggestedQualityObs])), map((/**
     * @param {?} __0
     * @return {?}
     */
    ([_, values]) => values)), takeUntil(destroyed))
        .subscribe((/**
     * @param {?} __0
     * @return {?}
     */
    ([player, videoId, cueOptions, suggestedQuality]) => {
        if (!videoId || !player) {
            return;
        }
        player.videoId = videoId;
        player.cueVideoById(Object.assign({ videoId,
            suggestedQuality }, cueOptions));
    }));
}
/**
 * @param {?} player
 * @return {?}
 */
function hasPlayerStarted(player) {
    /** @type {?} */
    const state = player.getPlayerState();
    return state !== -1 /* UNSTARTED */ && state !== 5 /* CUED */;
}
/**
 * @param {?} player
 * @return {?}
 */
function playerIsReady(player) {
    return 'getPlayerStatus' in player;
}
/**
 * Combines the two observables temporarily for the filter function.
 * @template R, T
 * @param {?} otherObs
 * @param {?} filterFn
 * @return {?}
 */
function filterOnOther(otherObs, filterFn) {
    return pipe(withLatestFrom(otherObs), filter((/**
     * @param {?} __0
     * @return {?}
     */
    ([value, other]) => filterFn(other, value))), map((/**
     * @param {?} __0
     * @return {?}
     */
    ([value]) => value)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFTQSxpQ0FBaUM7Ozs7Ozs7Ozs7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsUUFBUSxFQUNSLE1BQU0sRUFDTixXQUFXLEdBQ1osTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFbEQsT0FBTyxFQUNMLGFBQWEsRUFFYixLQUFLLEVBRUwsVUFBVSxFQUNWLEVBQUUsSUFBSSxZQUFZLEVBRWxCLElBQUksRUFDSixPQUFPLEVBQ1AsRUFBRSxFQUNGLGVBQWUsRUFDZixnQkFBZ0IsR0FDakIsTUFBTSxNQUFNLENBQUM7QUFFZCxPQUFPLEVBQ0wsYUFBYSxJQUFJLGVBQWUsRUFDaEMsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixPQUFPLEVBQ1AsR0FBRyxFQUNILE9BQU8sRUFDUCxJQUFJLEVBQ0osU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osU0FBUyxFQUNULGNBQWMsRUFDZCxTQUFTLEdBQ1YsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFTeEIsTUFBTSxPQUFPLG9CQUFvQixHQUFHLEdBQUc7O0FBQ3ZDLE1BQU0sT0FBTyxxQkFBcUIsR0FBRyxHQUFHOzs7O0FBSXhDLHFCQUVDOzs7SUFEQyx5QkFBNkI7Ozs7Ozs7QUFXL0IsaUNBTUM7OztJQUxDLDJDQUFxRjs7SUFDckYsMENBQXNCOztJQUN0QixvQ0FBZ0I7O0lBQ2hCLG1DQUFnQjs7SUFDaEIsa0NBQWtEOzs7Ozs7O0FBZXBELE1BQU0sT0FBTyxhQUFhOzs7OztJQXFGeEIsWUFD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Ozs7OztBQUdELFNBQVMsYUFBYSxDQUNwQixRQUF1QixFQUN2QixRQUFrQztJQUVsQyxPQUFPLElBQUksQ0FDVCxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQ3hCLE1BQU07Ozs7SUFBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFDLEVBQ2xELEdBQUc7Ozs7SUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBQyxDQUN4QixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBXb3JrYXJvdW5kIGZvcjogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy8xMjY1XG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cInlvdXR1YmVcIiAvPlxuXG5pbXBvcnQge1xuICBBZnRlclZpZXdJbml0LFxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3V0cHV0LFxuICBWaWV3Q2hpbGQsXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxuICBPcHRpb25hbCxcbiAgSW5qZWN0LFxuICBQTEFURk9STV9JRCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2lzUGxhdGZvcm1Ccm93c2VyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0LFxuICBDb25uZWN0YWJsZU9ic2VydmFibGUsXG4gIG1lcmdlLFxuICBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb24sXG4gIE9ic2VydmFibGUsXG4gIG9mIGFzIG9ic2VydmFibGVPZixcbiAgT3BlcmF0b3JGdW5jdGlvbixcbiAgcGlwZSxcbiAgU3ViamVjdCxcbiAgb2YsXG4gIEJlaGF2aW9yU3ViamVjdCxcbiAgZnJvbUV2ZW50UGF0dGVybixcbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QgYXMgY29tYmluZUxhdGVzdE9wLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgZmlsdGVyLFxuICBmbGF0TWFwLFxuICBtYXAsXG4gIHB1Ymxpc2gsXG4gIHNjYW4sXG4gIHNraXBXaGlsZSxcbiAgc3RhcnRXaXRoLFxuICB0YWtlLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBzd2l0Y2hNYXAsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBZVDogdHlwZW9mIFlUIHwgdW5kZWZpbmVkO1xuICAgIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX1dJRFRIID0gNjQwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX0hFSUdIVCA9IDM5MDtcblxuLy8gVGhlIG5hdGl2ZSBZVC5QbGF5ZXIgZG9lc24ndCBleHBvc2UgdGhlIHNldCB2aWRlb0lkLCBidXQgd2UgbmVlZCBpdCBmb3Jcbi8vIGNvbnZlbmllbmNlLlxuaW50ZXJmYWNlIFBsYXllciBleHRlbmRzIFlULlBsYXllciB7XG4gIHZpZGVvSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFRoZSBwbGF5ZXIgaXNuJ3QgZnVsbHkgaW5pdGlhbGl6ZWQgd2hlbiBpdCdzIGNvbnN0cnVjdGVkLlxuLy8gVGhlIG9ubHkgZmllbGQgYXZhaWxhYmxlIGlzIGRlc3Ryb3kgYW5kIGFkZEV2ZW50TGlzdGVuZXIuXG50eXBlIFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPSBQaWNrPFBsYXllciwgJ3ZpZGVvSWQnIHwgJ2Rlc3Ryb3knIHwgJ2FkZEV2ZW50TGlzdGVuZXInPjtcblxuLyoqXG4gKiBPYmplY3QgdXNlZCB0byBzdG9yZSB0aGUgc3RhdGUgb2YgdGhlIHBsYXllciBpZiB0aGVcbiAqIHVzZXIgdHJpZXMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgQVBJIGJlZm9yZSBpdCBoYXMgYmVlbiBsb2FkZWQuXG4gKi9cbmludGVyZmFjZSBQZW5kaW5nUGxheWVyU3RhdGUge1xuICBwbGF5YmFja1N0YXRlPzogWVQuUGxheWVyU3RhdGUuUExBWUlORyB8IFlULlBsYXllclN0YXRlLlBBVVNFRCB8IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gIHBsYXliYWNrUmF0ZT86IG51bWJlcjtcbiAgdm9sdW1lPzogbnVtYmVyO1xuICBtdXRlZD86IGJvb2xlYW47XG4gIHNlZWs/OiB7c2Vjb25kczogbnVtYmVyLCBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbn07XG59XG5cbi8qKlxuICogQW5ndWxhciBjb21wb25lbnQgdGhhdCByZW5kZXJzIGEgWW91VHViZSBwbGF5ZXIgdmlhIHRoZSBZb3VUdWJlIHBsYXllclxuICogaWZyYW1lIEFQSS5cbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZVxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICd5b3V0dWJlLXBsYXllcicsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAvLyBUaGlzIGRpdiBpcyAqcmVwbGFjZWQqIGJ5IHRoZSBZb3VUdWJlIHBsYXllciBlbWJlZC5cbiAgdGVtcGxhdGU6ICc8ZGl2ICN5b3V0dWJlQ29udGFpbmVyPjwvZGl2PicsXG59KVxuZXhwb3J0IGNsYXNzIFlvdVR1YmVQbGF5ZXIgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIC8qKiBXaGV0aGVyIHdlJ3JlIGN1cnJlbnRseSByZW5kZXJpbmcgaW5zaWRlIGEgYnJvd3Nlci4gKi9cbiAgcHJpdmF0ZSBfaXNCcm93c2VyOiBib29sZWFuO1xuICBwcml2YXRlIF95b3V0dWJlQ29udGFpbmVyID0gbmV3IFN1YmplY3Q8SFRNTEVsZW1lbnQ+KCk7XG4gIHByaXZhdGUgX2Rlc3Ryb3llZCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gIHByaXZhdGUgX3BsYXllcjogUGxheWVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGVuZGluZ1BsYXllclN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BsYXllckNoYW5nZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFBsYXllciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogWW91VHViZSBWaWRlbyBJRCB0byB2aWV3ICovXG4gIEBJbnB1dCgpXG4gIGdldCB2aWRlb0lkKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl92aWRlb0lkLnZhbHVlOyB9XG4gIHNldCB2aWRlb0lkKHZpZGVvSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3ZpZGVvSWQubmV4dCh2aWRlb0lkKTtcbiAgfVxuICBwcml2YXRlIF92aWRlb0lkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmcgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIEhlaWdodCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5faGVpZ2h0LnZhbHVlOyB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9oZWlnaHQubmV4dChoZWlnaHQgfHwgREVGQVVMVF9QTEFZRVJfSEVJR0hUKTtcbiAgfVxuICBwcml2YXRlIF9oZWlnaHQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlcj4oREVGQVVMVF9QTEFZRVJfSEVJR0hUKTtcblxuICAvKiogV2lkdGggb2YgdmlkZW8gcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIGdldCB3aWR0aCgpOiBudW1iZXIgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fd2lkdGgudmFsdWU7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl93aWR0aC5uZXh0KHdpZHRoIHx8IERFRkFVTFRfUExBWUVSX1dJRFRIKTtcbiAgfVxuICBwcml2YXRlIF93aWR0aCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9XSURUSCk7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0YXJ0IHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IHN0YXJ0U2Vjb25kcyhzdGFydFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N0YXJ0U2Vjb25kcy5uZXh0KHN0YXJ0U2Vjb25kcyk7XG4gIH1cbiAgcHJpdmF0ZSBfc3RhcnRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0b3AgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgZW5kU2Vjb25kcyhlbmRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLm5leHQoZW5kU2Vjb25kcyk7XG4gIH1cbiAgcHJpdmF0ZSBfZW5kU2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgc3VnZ2VzdGVkIHF1YWxpdHkgb2YgdGhlIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBzZXQgc3VnZ2VzdGVkUXVhbGl0eShzdWdnZXN0ZWRRdWFsaXR5OiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5Lm5leHQoc3VnZ2VzdGVkUXVhbGl0eSk7XG4gIH1cbiAgcHJpdmF0ZSBfc3VnZ2VzdGVkUXVhbGl0eSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBpZnJhbWUgd2lsbCBhdHRlbXB0IHRvIGxvYWQgcmVnYXJkbGVzcyBvZiB0aGUgc3RhdHVzIG9mIHRoZSBhcGkgb24gdGhlXG4gICAqIHBhZ2UuIFNldCB0aGlzIHRvIHRydWUgaWYgeW91IGRvbid0IHdhbnQgdGhlIGBvbllvdVR1YmVJZnJhbWVBUElSZWFkeWAgZmllbGQgdG8gYmVcbiAgICogc2V0IG9uIHRoZSBnbG9iYWwgd2luZG93LlxuICAgKi9cbiAgQElucHV0KCkgc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzOiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBPdXRwdXRzIGFyZSBkaXJlY3QgcHJveGllcyBmcm9tIHRoZSBwbGF5ZXIgaXRzZWxmLiAqL1xuICBAT3V0cHV0KCkgcmVhZHk6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25SZWFkeScpO1xuXG4gIEBPdXRwdXQoKSBzdGF0ZUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4oJ29uU3RhdGVDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgZXJyb3I6IE9ic2VydmFibGU8WVQuT25FcnJvckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PbkVycm9yRXZlbnQ+KCdvbkVycm9yJyk7XG5cbiAgQE91dHB1dCgpIGFwaUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvbkFwaUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSBwbGF5YmFja1F1YWxpdHlDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4oJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHBsYXliYWNrUmF0ZUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1JhdGVDaGFuZ2UnKTtcblxuICAvKiogVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBpZnJhbWUuICovXG4gIEBWaWV3Q2hpbGQoJ3lvdXR1YmVDb250YWluZXInKVxuICB5b3V0dWJlQ29udGFpbmVyOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBgcGxhdGZvcm1JZGAgcGFyYW1ldGVyIHRvIGJlY29tZSByZXF1aXJlZC5cbiAgICAgKiBAYnJlYWtpbmctY2hhbmdlIDEwLjAuMFxuICAgICAqL1xuICAgIEBPcHRpb25hbCgpIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ/OiBPYmplY3QpIHtcblxuICAgIC8vIEBicmVha2luZy1jaGFuZ2UgMTAuMC4wIFJlbW92ZSBudWxsIGNoZWNrIGZvciBgcGxhdGZvcm1JZGAuXG4gICAgdGhpcy5faXNCcm93c2VyID1cbiAgICAgICAgcGxhdGZvcm1JZCA/IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgISF3aW5kb3c7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBub3QgaW4gYSBicm93c2VyIGVudmlyb25tZW50LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGlmcmFtZUFwaUF2YWlsYWJsZU9iczogT2JzZXJ2YWJsZTxib29sZWFuPiA9IG9ic2VydmFibGVPZih0cnVlKTtcbiAgICBpZiAoIXdpbmRvdy5ZVCkge1xuICAgICAgaWYgKHRoaXMuc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTmFtZXNwYWNlIFlUIG5vdCBmb3VuZCwgY2Fubm90IGNvbnN0cnVjdCBlbWJlZGRlZCB5b3V0dWJlIHBsYXllci4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIGluc3RhbGwgdGhlIFlvdVR1YmUgUGxheWVyIEFQSSBSZWZlcmVuY2UgZm9yIGlmcmFtZSBFbWJlZHM6ICcgK1xuICAgICAgICAgICAgJ2h0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdCA9IG5ldyBTdWJqZWN0PGJvb2xlYW4+KCk7XG4gICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2sgPSB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk7XG5cbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdC5uZXh0KHRydWUpKTtcbiAgICAgIH07XG4gICAgICBpZnJhbWVBcGlBdmFpbGFibGVPYnMgPSBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0LnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKGZhbHNlKSk7XG4gICAgfVxuXG4gICAgLy8gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBwbGF5ZXIuXG4gICAgY29uc3QgcGxheWVyT2JzID1cbiAgICAgIGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gICAgICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIsXG4gICAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyxcbiAgICAgICAgdGhpcy5fd2lkdGgsXG4gICAgICAgIHRoaXMuX2hlaWdodCxcbiAgICAgICAgdGhpcy5fbmdab25lXG4gICAgICApLnBpcGUod2FpdFVudGlsUmVhZHkocGxheWVyID0+IHtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgcGxheWVyIGlmIGxvYWRpbmcgd2FzIGFib3J0ZWQgc28gdGhhdCB3ZSBkb24ndCBlbmQgdXAgbGVha2luZyBtZW1vcnkuXG4gICAgICAgIGlmICghcGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfSksIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpLCBwdWJsaXNoKCkpO1xuXG4gICAgLy8gU2V0IHVwIHNpZGUgZWZmZWN0cyB0byBiaW5kIGlucHV0cyB0byB0aGUgcGxheWVyLlxuICAgIHBsYXllck9icy5zdWJzY3JpYmUocGxheWVyID0+IHtcbiAgICAgIHRoaXMuX3BsYXllciA9IHBsYXllcjtcbiAgICAgIHRoaXMuX3BsYXllckNoYW5nZXMubmV4dChwbGF5ZXIpO1xuXG4gICAgICBpZiAocGxheWVyICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplUGxheWVyKHBsYXllciwgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0gdW5kZWZpbmVkO1xuICAgIH0pO1xuXG4gICAgYmluZFNpemVUb1BsYXllcihwbGF5ZXJPYnMsIHRoaXMuX3dpZHRoLCB0aGlzLl9oZWlnaHQpO1xuXG4gICAgYmluZFN1Z2dlc3RlZFF1YWxpdHlUb1BsYXllcihwbGF5ZXJPYnMsIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkpO1xuXG4gICAgYmluZEN1ZVZpZGVvQ2FsbChcbiAgICAgIHBsYXllck9icyxcbiAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICB0aGlzLl9zdGFydFNlY29uZHMsXG4gICAgICB0aGlzLl9lbmRTZWNvbmRzLFxuICAgICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgIHRoaXMuX2Rlc3Ryb3llZCk7XG5cbiAgICAvLyBBZnRlciBhbGwgb2YgdGhlIHN1YnNjcmlwdGlvbnMgYXJlIHNldCB1cCwgY29ubmVjdCB0aGUgb2JzZXJ2YWJsZS5cbiAgICAocGxheWVyT2JzIGFzIENvbm5lY3RhYmxlT2JzZXJ2YWJsZTxQbGF5ZXI+KS5jb25uZWN0KCk7XG4gIH1cblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgTm8gbG9uZ2VyIGJlaW5nIHVzZWQuIFRvIGJlIHJlbW92ZWQuXG4gICAqIEBicmVha2luZy1jaGFuZ2UgMTEuMC4wXG4gICAqL1xuICBjcmVhdGVFdmVudHNCb3VuZEluWm9uZSgpOiBZVC5FdmVudHMge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLm5leHQodGhpcy55b3V0dWJlQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9IHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaztcbiAgICB9XG5cbiAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fdmlkZW9JZC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2hlaWdodC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3dpZHRoLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkuY29tcGxldGUoKTtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLm5leHQoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQuY29tcGxldGUoKTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwbGF5VmlkZW8gKi9cbiAgcGxheVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wbGF5VmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBMQVlJTkc7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BhdXNlVmlkZW8gKi9cbiAgcGF1c2VWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGF1c2VWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUEFVU0VEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzdG9wVmlkZW8gKi9cbiAgc3RvcFZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zdG9wVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSXQgc2VlbXMgbGlrZSBZb3VUdWJlIHNldHMgdGhlIHBsYXllciB0byBDVUVEIHdoZW4gaXQncyBzdG9wcGVkLlxuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NlZWtUbyAqL1xuICBzZWVrVG8oc2Vjb25kczogbnVtYmVyLCBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZWVrVG8oc2Vjb25kcywgYWxsb3dTZWVrQWhlYWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5zZWVrID0ge3NlY29uZHMsIGFsbG93U2Vla0FoZWFkfTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjbXV0ZSAqL1xuICBtdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5tdXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLm11dGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjdW5NdXRlICovXG4gIHVuTXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIudW5NdXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLm11dGVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2lzTXV0ZWQgKi9cbiAgaXNNdXRlZCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmlzTXV0ZWQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUubXV0ZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NldFZvbHVtZSAqL1xuICBzZXRWb2x1bWUodm9sdW1lOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2V0Vm9sdW1lKHZvbHVtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnZvbHVtZSA9IHZvbHVtZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Vm9sdW1lICovXG4gIGdldFZvbHVtZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Vm9sdW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUudm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUudm9sdW1lO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NldFBsYXliYWNrUmF0ZSAqL1xuICBzZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1JhdGUgPSBwbGF5YmFja1JhdGU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXliYWNrUmF0ZSAqL1xuICBnZXRQbGF5YmFja1JhdGUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXliYWNrUmF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrUmF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrUmF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzICovXG4gIGdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKTogbnVtYmVyW10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbiAqL1xuICBnZXRWaWRlb0xvYWRlZEZyYWN0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0xvYWRlZEZyYWN0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXllclN0YXRlICovXG4gIGdldFBsYXllclN0YXRlKCk6IFlULlBsYXllclN0YXRlIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuX2lzQnJvd3NlciB8fCAhd2luZG93LllUKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEN1cnJlbnRUaW1lICovXG4gIGdldEN1cnJlbnRUaW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRDdXJyZW50VGltZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWspIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlay5zZWNvbmRzO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXliYWNrUXVhbGl0eSAqL1xuICBnZXRQbGF5YmFja1F1YWxpdHkoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFBsYXliYWNrUXVhbGl0eSgpIDogJ2RlZmF1bHQnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMgKi9cbiAgZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHlbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXREdXJhdGlvbiAqL1xuICBnZXREdXJhdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0RHVyYXRpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9VcmwgKi9cbiAgZ2V0VmlkZW9VcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvVXJsKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0VtYmVkQ29kZSAqL1xuICBnZXRWaWRlb0VtYmVkQ29kZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9FbWJlZENvZGUoKSA6ICcnO1xuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JqZWN0IHRoYXQgc2hvdWxkIGJlIHVzZWQgdG8gc3RvcmUgdGhlIHRlbXBvcmFyeSBBUEkgc3RhdGUuICovXG4gIHByaXZhdGUgX2dldFBlbmRpbmdTdGF0ZSgpOiBQZW5kaW5nUGxheWVyU3RhdGUge1xuICAgIGlmICghdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlO1xuICB9XG5cbiAgLyoqIEluaXRpYWxpemVzIGEgcGxheWVyIGZyb20gYSB0ZW1wb3Jhcnkgc3RhdGUuICovXG4gIHByaXZhdGUgX2luaXRpYWxpemVQbGF5ZXIocGxheWVyOiBZVC5QbGF5ZXIsIHN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCB7cGxheWJhY2tTdGF0ZSwgcGxheWJhY2tSYXRlLCB2b2x1bWUsIG11dGVkLCBzZWVrfSA9IHN0YXRlO1xuXG4gICAgc3dpdGNoIChwbGF5YmFja1N0YXRlKSB7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLlBMQVlJTkc6IHBsYXllci5wbGF5VmlkZW8oKTsgYnJlYWs7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLlBBVVNFRDogcGxheWVyLnBhdXNlVmlkZW8oKTsgYnJlYWs7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLkNVRUQ6IHBsYXllci5zdG9wVmlkZW8oKTsgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHBsYXliYWNrUmF0ZSAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfVxuXG4gICAgaWYgKHZvbHVtZSAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2V0Vm9sdW1lKHZvbHVtZSk7XG4gICAgfVxuXG4gICAgaWYgKG11dGVkICE9IG51bGwpIHtcbiAgICAgIG11dGVkID8gcGxheWVyLm11dGUoKSA6IHBsYXllci51bk11dGUoKTtcbiAgICB9XG5cbiAgICBpZiAoc2VlayAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2Vla1RvKHNlZWsuc2Vjb25kcywgc2Vlay5hbGxvd1NlZWtBaGVhZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JzZXJ2YWJsZSB0aGF0IGFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgdG8gdGhlIHBsYXllciB3aGVuIGEgdXNlciBzdWJzY3JpYmVzIHRvIGl0LiAqL1xuICBwcml2YXRlIF9nZXRMYXp5RW1pdHRlcjxUIGV4dGVuZHMgWVQuUGxheWVyRXZlbnQ+KG5hbWU6IGtleW9mIFlULkV2ZW50cyk6IE9ic2VydmFibGU8VD4ge1xuICAgIC8vIFN0YXJ0IHdpdGggdGhlIHN0cmVhbSBvZiBwbGF5ZXJzLiBUaGlzIHdheSB0aGUgZXZlbnRzIHdpbGwgYmUgdHJhbnNmZXJyZWRcbiAgICAvLyBvdmVyIHRvIHRoZSBuZXcgcGxheWVyIGlmIGl0IGdldHMgc3dhcHBlZCBvdXQgdW5kZXItdGhlLWhvb2QuXG4gICAgcmV0dXJuIHRoaXMuX3BsYXllckNoYW5nZXMucGlwZShcbiAgICAgIC8vIFN3aXRjaCB0byB0aGUgYm91bmQgZXZlbnQuIGBzd2l0Y2hNYXBgIGVuc3VyZXMgdGhhdCB0aGUgb2xkIGV2ZW50IGlzIHJlbW92ZWQgd2hlbiB0aGVcbiAgICAgIC8vIHBsYXllciBpcyBjaGFuZ2VkLiBJZiB0aGVyZSdzIG5vIHBsYXllciwgcmV0dXJuIGFuIG9ic2VydmFibGUgdGhhdCBuZXZlciBlbWl0cy5cbiAgICAgIHN3aXRjaE1hcChwbGF5ZXIgPT4ge1xuICAgICAgICByZXR1cm4gcGxheWVyID8gZnJvbUV2ZW50UGF0dGVybjxUPigobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgfSwgKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICAvLyBUaGUgQVBJIHNlZW1zIHRvIHRocm93IHdoZW4gd2UgdHJ5IHRvIHVuYmluZCBmcm9tIGEgZGVzdHJveWVkIHBsYXllciBhbmQgaXQgZG9lc24ndFxuICAgICAgICAgIC8vIGV4cG9zZSB3aGV0aGVyIHRoZSBwbGF5ZXIgaGFzIGJlZW4gZGVzdHJveWVkIHNvIHdlIGhhdmUgdG8gd3JhcCBpdCBpbiBhIHRyeS9jYXRjaCB0b1xuICAgICAgICAgIC8vIHByZXZlbnQgdGhlIGVudGlyZSBzdHJlYW0gZnJvbSBlcnJvcmluZyBvdXQuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIH0pIDogb2JzZXJ2YWJsZU9mPFQ+KCk7XG4gICAgICB9KSxcbiAgICAgIC8vIEJ5IGRlZmF1bHQgd2UgcnVuIGFsbCB0aGUgQVBJIGludGVyYWN0aW9ucyBvdXRzaWRlIHRoZSB6b25lXG4gICAgICAvLyBzbyB3ZSBoYXZlIHRvIGJyaW5nIHRoZSBldmVudHMgYmFjayBpbiBtYW51YWxseSB3aGVuIHRoZXkgZW1pdC5cbiAgICAgIChzb3VyY2U6IE9ic2VydmFibGU8VD4pID0+IG5ldyBPYnNlcnZhYmxlPFQ+KG9ic2VydmVyID0+IHNvdXJjZS5zdWJzY3JpYmUoe1xuICAgICAgICBuZXh0OiB2YWx1ZSA9PiB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IG9ic2VydmVyLm5leHQodmFsdWUpKSxcbiAgICAgICAgZXJyb3I6IGVycm9yID0+IG9ic2VydmVyLmVycm9yKGVycm9yKSxcbiAgICAgICAgY29tcGxldGU6ICgpID0+IG9ic2VydmVyLmNvbXBsZXRlKClcbiAgICAgIH0pKSxcbiAgICAgIC8vIEVuc3VyZXMgdGhhdCBldmVyeXRoaW5nIGlzIGNsZWFyZWQgb3V0IG9uIGRlc3Ryb3kuXG4gICAgICB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKVxuICAgICk7XG4gIH1cbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyB0byB0aGUgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCBhbmQgc2V0cyBpdCBvbiB0aGUgcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFNpemVUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgd2lkdGhPYnMsIGhlaWdodE9ic10pXG4gICAgICAuc3Vic2NyaWJlKChbcGxheWVyLCB3aWR0aCwgaGVpZ2h0XSkgPT4gcGxheWVyICYmIHBsYXllci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpKTtcbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyBmcm9tIHRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBhbmQgc2V0cyBpdCBvbiB0aGUgZ2l2ZW4gcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFN1Z2dlc3RlZFF1YWxpdHlUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHN1Z2dlc3RlZFF1YWxpdHlPYnM6IE9ic2VydmFibGU8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPlxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtcbiAgICBwbGF5ZXJPYnMsXG4gICAgc3VnZ2VzdGVkUXVhbGl0eU9ic1xuICBdKS5zdWJzY3JpYmUoXG4gICAgKFtwbGF5ZXIsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PlxuICAgICAgICBwbGF5ZXIgJiYgc3VnZ2VzdGVkUXVhbGl0eSAmJiBwbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHkpKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgbG9hZGVkIHBsYXllciBvbmNlIGl0J3MgcmVhZHkuIENlcnRhaW4gcHJvcGVydGllcy9tZXRob2RzXG4gKiB3b24ndCBiZSBhdmFpbGFibGUgdW50aWwgdGhlIGlmcmFtZSBmaW5pc2hlcyBsb2FkaW5nLlxuICogQHBhcmFtIG9uQWJvcnQgQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGludm9rZWQgaWYgdGhlIHBsYXllciBsb2FkaW5nIHdhcyBhYm9ydGVkIGJlZm9yZVxuICogaXQgd2FzIGFibGUgdG8gY29tcGxldGUuIENhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueSBsb29zZSByZWZlcmVuY2VzLlxuICovXG5mdW5jdGlvbiB3YWl0VW50aWxSZWFkeShvbkFib3J0OiAocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKSA9PiB2b2lkKTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLCBQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcbiAgcmV0dXJuIGZsYXRNYXAocGxheWVyID0+IHtcbiAgICBpZiAoIXBsYXllcikge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZjxQbGF5ZXJ8dW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mKHBsYXllciBhcyBQbGF5ZXIpO1xuICAgIH1cblxuICAgIC8vIFNpbmNlIHJlbW92ZUV2ZW50TGlzdGVuZXIgaXMgbm90IG9uIFBsYXllciB3aGVuIGl0J3MgaW5pdGlhbGl6ZWQsIHdlIGNhbid0IHVzZSBmcm9tRXZlbnQuXG4gICAgLy8gVGhlIHBsYXllciBpcyBub3QgaW5pdGlhbGl6ZWQgZnVsbHkgdW50aWwgdGhlIHJlYWR5IGlzIGNhbGxlZC5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGxheWVyPihlbWl0dGVyID0+IHtcbiAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG4gICAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IFlULlBsYXllckV2ZW50KSA9PiB7XG4gICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIWFib3J0ZWQpIHtcbiAgICAgICAgICBldmVudC50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuICAgICAgICAgIGVtaXR0ZXIubmV4dChldmVudC50YXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgb25BYm9ydChwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKHVuZGVmaW5lZCkpO1xuICB9KTtcbn1cblxuLyoqIENyZWF0ZSBhbiBvYnNlcnZhYmxlIGZvciB0aGUgcGxheWVyIGJhc2VkIG9uIHRoZSBnaXZlbiBvcHRpb25zLiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgeW91dHViZUNvbnRhaW5lcjogT2JzZXJ2YWJsZTxIVE1MRWxlbWVudD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgbmdab25lOiBOZ1pvbmVcbik6IE9ic2VydmFibGU8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4ge1xuXG4gIGNvbnN0IHBsYXllck9wdGlvbnMgPVxuICAgIHZpZGVvSWRPYnNcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3dpZHRoT2JzLCBoZWlnaHRPYnNdKSksXG4gICAgICBtYXAoKFt2aWRlb0lkLCBbd2lkdGgsIGhlaWdodF1dKSA9PiB2aWRlb0lkID8gKHt2aWRlb0lkLCB3aWR0aCwgaGVpZ2h0fSkgOiB1bmRlZmluZWQpLFxuICAgICk7XG5cbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3lvdXR1YmVDb250YWluZXIsIHBsYXllck9wdGlvbnMsIG9mKG5nWm9uZSldKVxuICAgICAgLnBpcGUoXG4gICAgICAgIHNraXBVbnRpbFJlbWVtYmVyTGF0ZXN0KGlmcmFtZUFwaUF2YWlsYWJsZU9icyksXG4gICAgICAgIHNjYW4oc3luY1BsYXllclN0YXRlLCB1bmRlZmluZWQpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpKTtcbn1cblxuLyoqIFNraXBzIHRoZSBnaXZlbiBvYnNlcnZhYmxlIHVudGlsIHRoZSBvdGhlciBvYnNlcnZhYmxlIGVtaXRzIHRydWUsIHRoZW4gZW1pdCB0aGUgbGF0ZXN0LiAqL1xuZnVuY3Rpb24gc2tpcFVudGlsUmVtZW1iZXJMYXRlc3Q8VD4obm90aWZpZXI6IE9ic2VydmFibGU8Ym9vbGVhbj4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICByZXR1cm4gcGlwZShcbiAgICBjb21iaW5lTGF0ZXN0T3Aobm90aWZpZXIpLFxuICAgIHNraXBXaGlsZSgoW18sIGRvbmVTa2lwcGluZ10pID0+ICFkb25lU2tpcHBpbmcpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpKTtcbn1cblxuLyoqIERlc3Ryb3kgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgbm8gb3B0aW9ucywgb3IgY3JlYXRlIHRoZSBwbGF5ZXIgaWYgdGhlcmUgYXJlIG9wdGlvbnMuICovXG5mdW5jdGlvbiBzeW5jUGxheWVyU3RhdGUoXG4gIHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCxcbiAgW2NvbnRhaW5lciwgdmlkZW9PcHRpb25zLCBuZ1pvbmVdOiBbSFRNTEVsZW1lbnQsIFlULlBsYXllck9wdGlvbnMgfCB1bmRlZmluZWQsIE5nWm9uZV0sXG4pOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF2aWRlb09wdGlvbnMpIHtcbiAgICBpZiAocGxheWVyKSB7XG4gICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHBsYXllcikge1xuICAgIHJldHVybiBwbGF5ZXI7XG4gIH1cblxuICAvLyBJbXBvcnRhbnQhIFdlIG5lZWQgdG8gY3JlYXRlIHRoZSBQbGF5ZXIgb2JqZWN0IG91dHNpZGUgb2YgdGhlIGBOZ1pvbmVgLCBiZWNhdXNlIGl0IGtpY2tzXG4gIC8vIG9mZiBhIDI1MG1zIHNldEludGVydmFsIHdoaWNoIHdpbGwgY29udGludWFsbHkgdHJpZ2dlciBjaGFuZ2UgZGV0ZWN0aW9uIGlmIHdlIGRvbid0LlxuICBjb25zdCBuZXdQbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPVxuICAgICAgbmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IG5ldyBZVC5QbGF5ZXIoY29udGFpbmVyLCB2aWRlb09wdGlvbnMpKTtcbiAgLy8gQmluZCB2aWRlb0lkIGZvciBmdXR1cmUgdXNlLlxuICBuZXdQbGF5ZXIudmlkZW9JZCA9IHZpZGVvT3B0aW9ucy52aWRlb0lkO1xuICByZXR1cm4gbmV3UGxheWVyO1xufVxuXG4vKipcbiAqIENhbGwgY3VlVmlkZW9CeUlkIGlmIHRoZSB2aWRlb0lkIGNoYW5nZXMsIG9yIHdoZW4gc3RhcnQgb3IgZW5kIHNlY29uZHMgY2hhbmdlLiBjdWVWaWRlb0J5SWQgd2lsbFxuICogY2hhbmdlIHRoZSBsb2FkZWQgdmlkZW8gaWQgdG8gdGhlIGdpdmVuIHZpZGVvSWQsIGFuZCBzZXQgdGhlIHN0YXJ0IGFuZCBlbmQgdGltZXMgdG8gdGhlIGdpdmVuXG4gKiBzdGFydC9lbmQgc2Vjb25kcy5cbiAqL1xuZnVuY3Rpb24gYmluZEN1ZVZpZGVvQ2FsbChcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgc3RhcnRTZWNvbmRzT2JzOiBPYnNlcnZhYmxlPG51bWJlciB8IHVuZGVmaW5lZD4sXG4gIGVuZFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+LFxuICBkZXN0cm95ZWQ6IE9ic2VydmFibGU8dm9pZD4sXG4pIHtcbiAgY29uc3QgY3VlT3B0aW9uc09icyA9IGNvbWJpbmVMYXRlc3QoW3N0YXJ0U2Vjb25kc09icywgZW5kU2Vjb25kc09ic10pXG4gICAgLnBpcGUobWFwKChbc3RhcnRTZWNvbmRzLCBlbmRTZWNvbmRzXSkgPT4gKHtzdGFydFNlY29uZHMsIGVuZFNlY29uZHN9KSkpO1xuXG4gIC8vIE9ubHkgcmVzcG9uZCB0byBjaGFuZ2VzIGluIGN1ZSBvcHRpb25zIGlmIHRoZSBwbGF5ZXIgaXMgbm90IHJ1bm5pbmcuXG4gIGNvbnN0IGZpbHRlcmVkQ3VlT3B0aW9ucyA9IGN1ZU9wdGlvbnNPYnNcbiAgICAucGlwZShmaWx0ZXJPbk90aGVyKHBsYXllck9icywgcGxheWVyID0+ICEhcGxheWVyICYmICFoYXNQbGF5ZXJTdGFydGVkKHBsYXllcikpKTtcblxuICAvLyBJZiB0aGUgdmlkZW8gaWQgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGUgcGxheWVyXG4gIC8vIHdhcyBpbml0aWFsaXplZCB3aXRoIGEgZGlmZmVyZW50IHZpZGVvIGlkLlxuICBjb25zdCBjaGFuZ2VkVmlkZW9JZCA9IHZpZGVvSWRPYnNcbiAgICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCAocGxheWVyLCB2aWRlb0lkKSA9PiAhIXBsYXllciAmJiBwbGF5ZXIudmlkZW9JZCAhPT0gdmlkZW9JZCkpO1xuXG4gIC8vIElmIHRoZSBwbGF5ZXIgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGVyZSBhcmUgY3VlIG9wdGlvbnMuXG4gIGNvbnN0IGNoYW5nZWRQbGF5ZXIgPSBwbGF5ZXJPYnMucGlwZShcbiAgICBmaWx0ZXJPbk90aGVyKFxuICAgICAgY29tYmluZUxhdGVzdChbdmlkZW9JZE9icywgY3VlT3B0aW9uc09ic10pLFxuICAgICAgKFt2aWRlb0lkLCBjdWVPcHRpb25zXSwgcGxheWVyKSA9PlxuICAgICAgICAgICEhcGxheWVyICYmXG4gICAgICAgICAgICAodmlkZW9JZCAhPSBwbGF5ZXIudmlkZW9JZCB8fCAhIWN1ZU9wdGlvbnMuc3RhcnRTZWNvbmRzIHx8ICEhY3VlT3B0aW9ucy5lbmRTZWNvbmRzKSkpO1xuXG4gIG1lcmdlKGNoYW5nZWRQbGF5ZXIsIGNoYW5nZWRWaWRlb0lkLCBmaWx0ZXJlZEN1ZU9wdGlvbnMpXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHZpZGVvSWRPYnMsIGN1ZU9wdGlvbnNPYnMsIHN1Z2dlc3RlZFF1YWxpdHlPYnNdKSksXG4gICAgICBtYXAoKFtfLCB2YWx1ZXNdKSA9PiB2YWx1ZXMpLFxuICAgICAgdGFrZVVudGlsKGRlc3Ryb3llZCksXG4gICAgKVxuICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHZpZGVvSWQsIGN1ZU9wdGlvbnMsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PiB7XG4gICAgICBpZiAoIXZpZGVvSWQgfHwgIXBsYXllcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwbGF5ZXIudmlkZW9JZCA9IHZpZGVvSWQ7XG4gICAgICBwbGF5ZXIuY3VlVmlkZW9CeUlkKHtcbiAgICAgICAgdmlkZW9JZCxcbiAgICAgICAgc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgICAgLi4uY3VlT3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNQbGF5ZXJTdGFydGVkKHBsYXllcjogWVQuUGxheWVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHN0YXRlID0gcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gIHJldHVybiBzdGF0ZSAhPT0gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEICYmIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xufVxuXG5mdW5jdGlvbiBwbGF5ZXJJc1JlYWR5KHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcik6IHBsYXllciBpcyBQbGF5ZXIge1xuICByZXR1cm4gJ2dldFBsYXllclN0YXR1cycgaW4gcGxheWVyO1xufVxuXG4vKiogQ29tYmluZXMgdGhlIHR3byBvYnNlcnZhYmxlcyB0ZW1wb3JhcmlseSBmb3IgdGhlIGZpbHRlciBmdW5jdGlvbi4gKi9cbmZ1bmN0aW9uIGZpbHRlck9uT3RoZXI8UiwgVD4oXG4gIG90aGVyT2JzOiBPYnNlcnZhYmxlPFQ+LFxuICBmaWx0ZXJGbjogKHQ6IFQsIHI/OiBSKSA9PiBib29sZWFuLFxuKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFI+IHtcbiAgcmV0dXJuIHBpcGUoXG4gICAgd2l0aExhdGVzdEZyb20ob3RoZXJPYnMpLFxuICAgIGZpbHRlcigoW3ZhbHVlLCBvdGhlcl0pID0+IGZpbHRlckZuKG90aGVyLCB2YWx1ZSkpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpLFxuICApO1xufVxuIl19