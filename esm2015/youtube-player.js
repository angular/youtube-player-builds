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
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, Output, ViewChild, ViewEncapsulation, Optional, Inject, PLATFORM_ID, } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { combineLatest, merge, Observable, of as observableOf, pipe, Subject, of, BehaviorSubject, } from 'rxjs';
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, } from 'rxjs/operators';
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
        this._videoId = new BehaviorSubject(undefined);
        this._height = new BehaviorSubject(DEFAULT_PLAYER_HEIGHT);
        this._width = new BehaviorSubject(DEFAULT_PLAYER_WIDTH);
        this._startSeconds = new BehaviorSubject(undefined);
        this._endSeconds = new BehaviorSubject(undefined);
        this._suggestedQuality = new BehaviorSubject(undefined);
        /**
         * Outputs are direct proxies from the player itself.
         */
        this.ready = new EventEmitter();
        this.stateChange = new EventEmitter();
        this.error = new EventEmitter();
        this.apiChange = new EventEmitter();
        this.playbackQualityChange = new EventEmitter();
        this.playbackRateChange = new EventEmitter();
        this._youtubeContainer = new Subject();
        this._destroyed = new Subject();
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
        const playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this.createEventsBoundInZone(), this._ngZone).pipe(waitUntilReady((/**
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
     * @return {?}
     */
    createEventsBoundInZone() {
        /** @type {?} */
        const output = {};
        /** @type {?} */
        const events = new Map([
            ['onReady', this.ready],
            ['onStateChange', this.stateChange],
            ['onPlaybackQualityChange', this.playbackQualityChange],
            ['onPlaybackRateChange', this.playbackRateChange],
            ['onError', this.error],
            ['onApiChange', this.apiChange]
        ]);
        events.forEach((/**
         * @param {?} emitter
         * @param {?} name
         * @return {?}
         */
        (emitter, name) => {
            // Since these events all trigger change detection, only bind them if something is subscribed.
            if (emitter.observers.length) {
                output[name] = this._runInZone((/**
                 * @param {?} event
                 * @return {?}
                 */
                event => emitter.emit(event)));
            }
        }));
        return output;
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
     * @private
     * @template T
     * @param {?} callback
     * @return {?}
     */
    _runInZone(callback) {
        return (/**
         * @param {...?} args
         * @return {?}
         */
        (...args) => this._ngZone.run((/**
         * @return {?}
         */
        () => callback(...args))));
    }
    /** Proxied methods. */
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
 * @param {?} events
 * @param {?} ngZone
 * @return {?}
 */
function createPlayerObservable(youtubeContainer, videoIdObs, iframeApiAvailableObs, widthObs, heightObs, events, ngZone) {
    /** @type {?} */
    const playerOptions = videoIdObs
        .pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map((/**
     * @param {?} __0
     * @return {?}
     */
    ([videoId, [width, height]]) => videoId ? ({ videoId, width, height, events }) : undefined)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFTQSxpQ0FBaUM7Ozs7Ozs7Ozs7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLFlBQVksRUFDWixLQUFLLEVBQ0wsTUFBTSxFQUdOLE1BQU0sRUFDTixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLFFBQVEsRUFDUixNQUFNLEVBQ04sV0FBVyxHQUNaLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRWxELE9BQU8sRUFDTCxhQUFhLEVBRWIsS0FBSyxFQUVMLFVBQVUsRUFDVixFQUFFLElBQUksWUFBWSxFQUVsQixJQUFJLEVBQ0osT0FBTyxFQUNQLEVBQUUsRUFDRixlQUFlLEdBQ2hCLE1BQU0sTUFBTSxDQUFDO0FBRWQsT0FBTyxFQUNMLGFBQWEsSUFBSSxlQUFlLEVBQ2hDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sT0FBTyxFQUNQLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEdBQ2YsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFTeEIsTUFBTSxPQUFPLG9CQUFvQixHQUFHLEdBQUc7O0FBQ3ZDLE1BQU0sT0FBTyxxQkFBcUIsR0FBRyxHQUFHOzs7O0FBSXhDLHFCQUVDOzs7SUFEQyx5QkFBNkI7Ozs7Ozs7QUFXL0IsaUNBTUM7OztJQUxDLDJDQUFxRjs7SUFDckYsMENBQXNCOztJQUN0QixvQ0FBZ0I7O0lBQ2hCLG1DQUFnQjs7SUFDaEIsa0NBQWtEOzs7Ozs7O0FBZXBELE1BQU0sT0FBTyxhQUFhOzs7OztJQXlFeEIsWUFDVSxPQUFlO0lBQ3ZC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QVMsQ0FBQyxDQUNyQjtTQUNBLFNBQVM7Ozs7SUFBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxFQUFFO1FBQzdELElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDdkIsT0FBTztTQUNSO1FBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDekIsTUFBTSxDQUFDLFlBQVksaUJBQ2pCLE9BQU87WUFDUCxnQkFBZ0IsSUFDYixVQUFVLEVBQ2IsQ0FBQztJQUNMLENBQUMsRUFBQyxDQUFDO0FBQ1AsQ0FBQzs7Ozs7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE1BQWlCOztVQUNuQyxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNyQyxPQUFPLEtBQUssdUJBQTZCLElBQUksS0FBSyxpQkFBd0IsQ0FBQztBQUM3RSxDQUFDOzs7OztBQUVELFNBQVMsYUFBYSxDQUFDLE1BQTJCO0lBQ2hELE9BQU8saUJBQWlCLElBQUksTUFBTSxDQUFDO0FBQ3JDLENBQUM7Ozs7Ozs7O0FBR0QsU0FBUyxhQUFhLENBQ3BCLFFBQXVCLEVBQ3ZCLFFBQWtDO0lBRWxDLE9BQU8sSUFBSSxDQUNULGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFDeEIsTUFBTTs7OztJQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUMsRUFDbEQsR0FBRzs7OztJQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFDLENBQ3hCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIFdvcmthcm91bmQgZm9yOiBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzEyNjVcbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwieW91dHViZVwiIC8+XG5cbmltcG9ydCB7XG4gIEFmdGVyVmlld0luaXQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIEV2ZW50RW1pdHRlcixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgT3B0aW9uYWwsXG4gIEluamVjdCxcbiAgUExBVEZPUk1fSUQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtpc1BsYXRmb3JtQnJvd3Nlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCxcbiAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLFxuICBtZXJnZSxcbiAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLFxuICBPYnNlcnZhYmxlLFxuICBvZiBhcyBvYnNlcnZhYmxlT2YsXG4gIE9wZXJhdG9yRnVuY3Rpb24sXG4gIHBpcGUsXG4gIFN1YmplY3QsXG4gIG9mLFxuICBCZWhhdmlvclN1YmplY3QsXG59IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0IGFzIGNvbWJpbmVMYXRlc3RPcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIGZpbHRlcixcbiAgZmxhdE1hcCxcbiAgbWFwLFxuICBwdWJsaXNoLFxuICBzY2FuLFxuICBza2lwV2hpbGUsXG4gIHN0YXJ0V2l0aCxcbiAgdGFrZSxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFlUOiB0eXBlb2YgWVQgfCB1bmRlZmluZWQ7XG4gICAgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfV0lEVEggPSA2NDA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfSEVJR0hUID0gMzkwO1xuXG4vLyBUaGUgbmF0aXZlIFlULlBsYXllciBkb2Vzbid0IGV4cG9zZSB0aGUgc2V0IHZpZGVvSWQsIGJ1dCB3ZSBuZWVkIGl0IGZvclxuLy8gY29udmVuaWVuY2UuXG5pbnRlcmZhY2UgUGxheWVyIGV4dGVuZHMgWVQuUGxheWVyIHtcbiAgdmlkZW9JZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cblxuLy8gVGhlIHBsYXllciBpc24ndCBmdWxseSBpbml0aWFsaXplZCB3aGVuIGl0J3MgY29uc3RydWN0ZWQuXG4vLyBUaGUgb25seSBmaWVsZCBhdmFpbGFibGUgaXMgZGVzdHJveSBhbmQgYWRkRXZlbnRMaXN0ZW5lci5cbnR5cGUgVW5pbml0aWFsaXplZFBsYXllciA9IFBpY2s8UGxheWVyLCAndmlkZW9JZCcgfCAnZGVzdHJveScgfCAnYWRkRXZlbnRMaXN0ZW5lcic+O1xuXG4vKipcbiAqIE9iamVjdCB1c2VkIHRvIHN0b3JlIHRoZSBzdGF0ZSBvZiB0aGUgcGxheWVyIGlmIHRoZVxuICogdXNlciB0cmllcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBBUEkgYmVmb3JlIGl0IGhhcyBiZWVuIGxvYWRlZC5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gIHBsYXliYWNrU3RhdGU/OiBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HIHwgWVQuUGxheWVyU3RhdGUuUEFVU0VEIHwgWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgcGxheWJhY2tSYXRlPzogbnVtYmVyO1xuICB2b2x1bWU/OiBudW1iZXI7XG4gIG11dGVkPzogYm9vbGVhbjtcbiAgc2Vlaz86IHtzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFufTtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNvbXBvbmVudCB0aGF0IHJlbmRlcnMgYSBZb3VUdWJlIHBsYXllciB2aWEgdGhlIFlvdVR1YmUgcGxheWVyXG4gKiBpZnJhbWUgQVBJLlxuICogQHNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3lvdXR1YmUtcGxheWVyJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIC8vIFRoaXMgZGl2IGlzICpyZXBsYWNlZCogYnkgdGhlIFlvdVR1YmUgcGxheWVyIGVtYmVkLlxuICB0ZW1wbGF0ZTogJzxkaXYgI3lvdXR1YmVDb250YWluZXI+PC9kaXY+Jyxcbn0pXG5leHBvcnQgY2xhc3MgWW91VHViZVBsYXllciBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgLyoqIFlvdVR1YmUgVmlkZW8gSUQgdG8gdmlldyAqL1xuICBASW5wdXQoKVxuICBnZXQgdmlkZW9JZCgpOiBzdHJpbmcgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fdmlkZW9JZC52YWx1ZTsgfVxuICBzZXQgdmlkZW9JZCh2aWRlb0lkOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl92aWRlb0lkLm5leHQodmlkZW9JZCk7XG4gIH1cbiAgcHJpdmF0ZSBfdmlkZW9JZCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBIZWlnaHQgb2YgdmlkZW8gcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX2hlaWdodC52YWx1ZTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5faGVpZ2h0Lm5leHQoaGVpZ2h0IHx8IERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG4gIH1cbiAgcHJpdmF0ZSBfaGVpZ2h0ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG5cbiAgLyoqIFdpZHRoIG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3dpZHRoLnZhbHVlOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fd2lkdGgubmV4dCh3aWR0aCB8fCBERUZBVUxUX1BMQVlFUl9XSURUSCk7XG4gIH1cbiAgcHJpdmF0ZSBfd2lkdGggPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlcj4oREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdGFydCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdGFydFNlY29uZHMoc3RhcnRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMubmV4dChzdGFydFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgX3N0YXJ0U2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdG9wIHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IGVuZFNlY29uZHMoZW5kU2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5uZXh0KGVuZFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgX2VuZFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIHN1Z2dlc3RlZCBxdWFsaXR5IG9mIHRoZSBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgc2V0IHN1Z2dlc3RlZFF1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5uZXh0KHN1Z2dlc3RlZFF1YWxpdHkpO1xuICB9XG4gIHByaXZhdGUgX3N1Z2dlc3RlZFF1YWxpdHkgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgaWZyYW1lIHdpbGwgYXR0ZW1wdCB0byBsb2FkIHJlZ2FyZGxlc3Mgb2YgdGhlIHN0YXR1cyBvZiB0aGUgYXBpIG9uIHRoZVxuICAgKiBwYWdlLiBTZXQgdGhpcyB0byB0cnVlIGlmIHlvdSBkb24ndCB3YW50IHRoZSBgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHlgIGZpZWxkIHRvIGJlXG4gICAqIHNldCBvbiB0aGUgZ2xvYmFsIHdpbmRvdy5cbiAgICovXG4gIEBJbnB1dCgpIHNob3dCZWZvcmVJZnJhbWVBcGlMb2FkczogYm9vbGVhbiB8IHVuZGVmaW5lZDtcblxuICAvKiogT3V0cHV0cyBhcmUgZGlyZWN0IHByb3hpZXMgZnJvbSB0aGUgcGxheWVyIGl0c2VsZi4gKi9cbiAgQE91dHB1dCgpIHJlYWR5ID0gbmV3IEV2ZW50RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oKTtcbiAgQE91dHB1dCgpIHN0YXRlQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+KCk7XG4gIEBPdXRwdXQoKSBlcnJvciA9IG5ldyBFdmVudEVtaXR0ZXI8WVQuT25FcnJvckV2ZW50PigpO1xuICBAT3V0cHV0KCkgYXBpQ2hhbmdlID0gbmV3IEV2ZW50RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oKTtcbiAgQE91dHB1dCgpIHBsYXliYWNrUXVhbGl0eUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4oKTtcbiAgQE91dHB1dCgpIHBsYXliYWNrUmF0ZUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4oKTtcblxuICAvKiogVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBpZnJhbWUuICovXG4gIEBWaWV3Q2hpbGQoJ3lvdXR1YmVDb250YWluZXInKVxuICB5b3V0dWJlQ29udGFpbmVyOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PjtcblxuICAvKiogV2hldGhlciB3ZSdyZSBjdXJyZW50bHkgcmVuZGVyaW5nIGluc2lkZSBhIGJyb3dzZXIuICovXG4gIHByaXZhdGUgX2lzQnJvd3NlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfeW91dHViZUNvbnRhaW5lciA9IG5ldyBTdWJqZWN0PEhUTUxFbGVtZW50PigpO1xuICBwcml2YXRlIF9kZXN0cm95ZWQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICBwcml2YXRlIF9wbGF5ZXI6IFBsYXllciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BlbmRpbmdQbGF5ZXJTdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgX25nWm9uZTogTmdab25lLFxuICAgIC8qKlxuICAgICAqIEBkZXByZWNhdGVkIGBwbGF0Zm9ybUlkYCBwYXJhbWV0ZXIgdG8gYmVjb21lIHJlcXVpcmVkLlxuICAgICAqIEBicmVha2luZy1jaGFuZ2UgMTAuMC4wXG4gICAgICovXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChQTEFURk9STV9JRCkgcGxhdGZvcm1JZD86IE9iamVjdCkge1xuXG4gICAgLy8gQGJyZWFraW5nLWNoYW5nZSAxMC4wLjAgUmVtb3ZlIG51bGwgY2hlY2sgZm9yIGBwbGF0Zm9ybUlkYC5cbiAgICB0aGlzLl9pc0Jyb3dzZXIgPVxuICAgICAgICBwbGF0Zm9ybUlkID8gaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCkgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiAhIXdpbmRvdztcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIHdlJ3JlIG5vdCBpbiBhIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+ID0gb2JzZXJ2YWJsZU9mKHRydWUpO1xuICAgIGlmICghd2luZG93LllUKSB7XG4gICAgICBpZiAodGhpcy5zaG93QmVmb3JlSWZyYW1lQXBpTG9hZHMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOYW1lc3BhY2UgWVQgbm90IGZvdW5kLCBjYW5ub3QgY29uc3RydWN0IGVtYmVkZGVkIHlvdXR1YmUgcGxheWVyLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgaW5zdGFsbCB0aGUgWW91VHViZSBQbGF5ZXIgQVBJIFJlZmVyZW5jZSBmb3IgaWZyYW1lIEVtYmVkczogJyArXG4gICAgICAgICAgICAnaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8Ym9vbGVhbj4oKTtcbiAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjayA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblxuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbmdab25lLnJ1bigoKSA9PiBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0Lm5leHQodHJ1ZSkpO1xuICAgICAgfTtcbiAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyA9IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgoZmFsc2UpKTtcbiAgICB9XG5cbiAgICAvLyBBbiBvYnNlcnZhYmxlIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHBsYXllci5cbiAgICBjb25zdCBwbGF5ZXJPYnMgPVxuICAgICAgY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgICAgICAgdGhpcy5feW91dHViZUNvbnRhaW5lcixcbiAgICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzLFxuICAgICAgICB0aGlzLl93aWR0aCxcbiAgICAgICAgdGhpcy5faGVpZ2h0LFxuICAgICAgICB0aGlzLmNyZWF0ZUV2ZW50c0JvdW5kSW5ab25lKCksXG4gICAgICAgIHRoaXMuX25nWm9uZVxuICAgICAgKS5waXBlKHdhaXRVbnRpbFJlYWR5KHBsYXllciA9PiB7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIHBsYXllciBpZiBsb2FkaW5nIHdhcyBhYm9ydGVkIHNvIHRoYXQgd2UgZG9uJ3QgZW5kIHVwIGxlYWtpbmcgbWVtb3J5LlxuICAgICAgICBpZiAoIXBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLCB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSwgcHVibGlzaCgpKTtcblxuICAgIC8vIFNldCB1cCBzaWRlIGVmZmVjdHMgdG8gYmluZCBpbnB1dHMgdG8gdGhlIHBsYXllci5cbiAgICBwbGF5ZXJPYnMuc3Vic2NyaWJlKHBsYXllciA9PiB7XG4gICAgICB0aGlzLl9wbGF5ZXIgPSBwbGF5ZXI7XG5cbiAgICAgIGlmIChwbGF5ZXIgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVQbGF5ZXIocGxheWVyLCB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICBiaW5kU2l6ZVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG5cbiAgICBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSk7XG5cbiAgICBiaW5kQ3VlVmlkZW9DYWxsKFxuICAgICAgcGxheWVyT2JzLFxuICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgIHRoaXMuX3N0YXJ0U2Vjb25kcyxcbiAgICAgIHRoaXMuX2VuZFNlY29uZHMsXG4gICAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgdGhpcy5fZGVzdHJveWVkKTtcblxuICAgIC8vIEFmdGVyIGFsbCBvZiB0aGUgc3Vic2NyaXB0aW9ucyBhcmUgc2V0IHVwLCBjb25uZWN0IHRoZSBvYnNlcnZhYmxlLlxuICAgIChwbGF5ZXJPYnMgYXMgQ29ubmVjdGFibGVPYnNlcnZhYmxlPFBsYXllcj4pLmNvbm5lY3QoKTtcbiAgfVxuXG4gIGNyZWF0ZUV2ZW50c0JvdW5kSW5ab25lKCk6IFlULkV2ZW50cyB7XG4gICAgY29uc3Qgb3V0cHV0OiBZVC5FdmVudHMgPSB7fTtcbiAgICBjb25zdCBldmVudHMgPSBuZXcgTWFwPGtleW9mIFlULkV2ZW50cywgRXZlbnRFbWl0dGVyPGFueT4+KFtcbiAgICAgIFsnb25SZWFkeScsIHRoaXMucmVhZHldLFxuICAgICAgWydvblN0YXRlQ2hhbmdlJywgdGhpcy5zdGF0ZUNoYW5nZV0sXG4gICAgICBbJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJywgdGhpcy5wbGF5YmFja1F1YWxpdHlDaGFuZ2VdLFxuICAgICAgWydvblBsYXliYWNrUmF0ZUNoYW5nZScsIHRoaXMucGxheWJhY2tSYXRlQ2hhbmdlXSxcbiAgICAgIFsnb25FcnJvcicsIHRoaXMuZXJyb3JdLFxuICAgICAgWydvbkFwaUNoYW5nZScsIHRoaXMuYXBpQ2hhbmdlXVxuICAgIF0pO1xuXG4gICAgZXZlbnRzLmZvckVhY2goKGVtaXR0ZXIsIG5hbWUpID0+IHtcbiAgICAgIC8vIFNpbmNlIHRoZXNlIGV2ZW50cyBhbGwgdHJpZ2dlciBjaGFuZ2UgZGV0ZWN0aW9uLCBvbmx5IGJpbmQgdGhlbSBpZiBzb21ldGhpbmcgaXMgc3Vic2NyaWJlZC5cbiAgICAgIGlmIChlbWl0dGVyLm9ic2VydmVycy5sZW5ndGgpIHtcbiAgICAgICAgb3V0cHV0W25hbWVdID0gdGhpcy5fcnVuSW5ab25lKGV2ZW50ID0+IGVtaXR0ZXIuZW1pdChldmVudCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLm5leHQodGhpcy55b3V0dWJlQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9IHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaztcbiAgICB9XG5cbiAgICB0aGlzLl92aWRlb0lkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5faGVpZ2h0LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fd2lkdGguY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIuY29tcGxldGUoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5jb21wbGV0ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcnVuSW5ab25lPFQgZXh0ZW5kcyAoLi4uYXJnczogYW55W10pID0+IHZvaWQ+KGNhbGxiYWNrOiBUKTpcbiAgICAgICguLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkIHtcbiAgICByZXR1cm4gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8VD4pID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xuICB9XG5cbiAgLyoqIFByb3hpZWQgbWV0aG9kcy4gKi9cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGxheVZpZGVvICovXG4gIHBsYXlWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwYXVzZVZpZGVvICovXG4gIHBhdXNlVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBhdXNlVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBBVVNFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc3RvcFZpZGVvICovXG4gIHN0b3BWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEl0IHNlZW1zIGxpa2UgWW91VHViZSBzZXRzIHRoZSBwbGF5ZXIgdG8gQ1VFRCB3aGVuIGl0J3Mgc3RvcHBlZC5cbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZWVrVG8gKi9cbiAgc2Vla1RvKHNlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2Vla1RvKHNlY29uZHMsIGFsbG93U2Vla0FoZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkuc2VlayA9IHtzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI211dGUgKi9cbiAgbXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIubXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3VuTXV0ZSAqL1xuICB1bk11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnVuTXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNpc011dGVkICovXG4gIGlzTXV0ZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5pc011dGVkKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLm11dGVkO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRWb2x1bWUgKi9cbiAgc2V0Vm9sdW1lKHZvbHVtZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS52b2x1bWUgPSB2b2x1bWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZvbHVtZSAqL1xuICBnZXRWb2x1bWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFZvbHVtZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRQbGF5YmFja1JhdGUgKi9cbiAgc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tSYXRlID0gcGxheWJhY2tSYXRlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1JhdGUgKi9cbiAgZ2V0UGxheWJhY2tSYXRlKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1JhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcyAqL1xuICBnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvTG9hZGVkRnJhY3Rpb24gKi9cbiAgZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5ZXJTdGF0ZSAqL1xuICBnZXRQbGF5ZXJTdGF0ZSgpOiBZVC5QbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIgfHwgIXdpbmRvdy5ZVCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFlULlBsYXllclN0YXRlLlVOU1RBUlRFRDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRDdXJyZW50VGltZSAqL1xuICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWsuc2Vjb25kcztcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1F1YWxpdHkgKi9cbiAgZ2V0UGxheWJhY2tRdWFsaXR5KCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1F1YWxpdHkoKSA6ICdkZWZhdWx0JztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzICovXG4gIGdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5W10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0RHVyYXRpb24gKi9cbiAgZ2V0RHVyYXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldER1cmF0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvVXJsICovXG4gIGdldFZpZGVvVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb1VybCgpIDogJyc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9FbWJlZENvZGUgKi9cbiAgZ2V0VmlkZW9FbWJlZENvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvRW1iZWRDb2RlKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSB1c2VkIHRvIHN0b3JlIHRoZSB0ZW1wb3JhcnkgQVBJIHN0YXRlLiAqL1xuICBwcml2YXRlIF9nZXRQZW5kaW5nU3RhdGUoKTogUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgICBpZiAoIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZTtcbiAgfVxuXG4gIC8qKiBJbml0aWFsaXplcyBhIHBsYXllciBmcm9tIGEgdGVtcG9yYXJ5IHN0YXRlLiAqL1xuICBwcml2YXRlIF9pbml0aWFsaXplUGxheWVyKHBsYXllcjogWVQuUGxheWVyLCBzdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlKTogdm9pZCB7XG4gICAgY29uc3Qge3BsYXliYWNrU3RhdGUsIHBsYXliYWNrUmF0ZSwgdm9sdW1lLCBtdXRlZCwgc2Vla30gPSBzdGF0ZTtcblxuICAgIHN3aXRjaCAocGxheWJhY2tTdGF0ZSkge1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HOiBwbGF5ZXIucGxheVZpZGVvKCk7IGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ6IHBsYXllci5wYXVzZVZpZGVvKCk7IGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5DVUVEOiBwbGF5ZXIuc3RvcFZpZGVvKCk7IGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH1cblxuICAgIGlmICh2b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH1cblxuICAgIGlmIChtdXRlZCAhPSBudWxsKSB7XG4gICAgICBtdXRlZCA/IHBsYXllci5tdXRlKCkgOiBwbGF5ZXIudW5NdXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlZWsgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNlZWtUbyhzZWVrLnNlY29uZHMsIHNlZWsuYWxsb3dTZWVrQWhlYWQpO1xuICAgIH1cbiAgfVxufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIHRvIHRoZSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0IGFuZCBzZXRzIGl0IG9uIHRoZSBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU2l6ZVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgd2lkdGhPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgaGVpZ2h0T2JzOiBPYnNlcnZhYmxlPG51bWJlcj5cbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB3aWR0aE9icywgaGVpZ2h0T2JzXSlcbiAgICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHdpZHRoLCBoZWlnaHRdKSA9PiBwbGF5ZXIgJiYgcGxheWVyLnNldFNpemUod2lkdGgsIGhlaWdodCkpO1xufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIGZyb20gdGhlIHN1Z2dlc3RlZCBxdWFsaXR5IGFuZCBzZXRzIGl0IG9uIHRoZSBnaXZlbiBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW1xuICAgIHBsYXllck9icyxcbiAgICBzdWdnZXN0ZWRRdWFsaXR5T2JzXG4gIF0pLnN1YnNjcmliZShcbiAgICAoW3BsYXllciwgc3VnZ2VzdGVkUXVhbGl0eV0pID0+XG4gICAgICAgIHBsYXllciAmJiBzdWdnZXN0ZWRRdWFsaXR5ICYmIHBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBsb2FkZWQgcGxheWVyIG9uY2UgaXQncyByZWFkeS4gQ2VydGFpbiBwcm9wZXJ0aWVzL21ldGhvZHNcbiAqIHdvbid0IGJlIGF2YWlsYWJsZSB1bnRpbCB0aGUgaWZyYW1lIGZpbmlzaGVzIGxvYWRpbmcuXG4gKiBAcGFyYW0gb25BYm9ydCBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgaW52b2tlZCBpZiB0aGUgcGxheWVyIGxvYWRpbmcgd2FzIGFib3J0ZWQgYmVmb3JlXG4gKiBpdCB3YXMgYWJsZSB0byBjb21wbGV0ZS4gQ2FuIGJlIHVzZWQgdG8gY2xlYW4gdXAgYW55IGxvb3NlIHJlZmVyZW5jZXMuXG4gKi9cbmZ1bmN0aW9uIHdhaXRVbnRpbFJlYWR5KG9uQWJvcnQ6IChwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIpID0+IHZvaWQpOlxuICBPcGVyYXRvckZ1bmN0aW9uPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsIFBsYXllciB8IHVuZGVmaW5lZD4ge1xuICByZXR1cm4gZmxhdE1hcChwbGF5ZXIgPT4ge1xuICAgIGlmICghcGxheWVyKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mPFBsYXllcnx1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChwbGF5ZXJJc1JlYWR5KHBsYXllcikpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2YocGxheWVyIGFzIFBsYXllcik7XG4gICAgfVxuXG4gICAgLy8gU2luY2UgcmVtb3ZlRXZlbnRMaXN0ZW5lciBpcyBub3Qgb24gUGxheWVyIHdoZW4gaXQncyBpbml0aWFsaXplZCwgd2UgY2FuJ3QgdXNlIGZyb21FdmVudC5cbiAgICAvLyBUaGUgcGxheWVyIGlzIG5vdCBpbml0aWFsaXplZCBmdWxseSB1bnRpbCB0aGUgcmVhZHkgaXMgY2FsbGVkLlxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQbGF5ZXI+KGVtaXR0ZXIgPT4ge1xuICAgICAgbGV0IGFib3J0ZWQgPSBmYWxzZTtcbiAgICAgIGxldCByZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgY29uc3Qgb25SZWFkeSA9IChldmVudDogWVQuUGxheWVyRXZlbnQpID0+IHtcbiAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmICghYWJvcnRlZCkge1xuICAgICAgICAgIGV2ZW50LnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgb25SZWFkeSk7XG4gICAgICAgICAgZW1pdHRlci5uZXh0KGV2ZW50LnRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgb25SZWFkeSk7XG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGFib3J0ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgICBvbkFib3J0KHBsYXllcik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgodW5kZWZpbmVkKSk7XG4gIH0pO1xufVxuXG4vKiogQ3JlYXRlIGFuIG9ic2VydmFibGUgZm9yIHRoZSBwbGF5ZXIgYmFzZWQgb24gdGhlIGdpdmVuIG9wdGlvbnMuICovXG5mdW5jdGlvbiBjcmVhdGVQbGF5ZXJPYnNlcnZhYmxlKFxuICB5b3V0dWJlQ29udGFpbmVyOiBPYnNlcnZhYmxlPEhUTUxFbGVtZW50PixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBldmVudHM6IFlULkV2ZW50cyxcbiAgbmdab25lOiBOZ1pvbmVcbik6IE9ic2VydmFibGU8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4ge1xuXG4gIGNvbnN0IHBsYXllck9wdGlvbnMgPVxuICAgIHZpZGVvSWRPYnNcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3dpZHRoT2JzLCBoZWlnaHRPYnNdKSksXG4gICAgICBtYXAoKFt2aWRlb0lkLCBbd2lkdGgsIGhlaWdodF1dKSA9PiB2aWRlb0lkID8gKHt2aWRlb0lkLCB3aWR0aCwgaGVpZ2h0LCBldmVudHN9KSA6IHVuZGVmaW5lZCksXG4gICAgKTtcblxuICByZXR1cm4gY29tYmluZUxhdGVzdChbeW91dHViZUNvbnRhaW5lciwgcGxheWVyT3B0aW9ucywgb2Yobmdab25lKV0pXG4gICAgICAucGlwZShcbiAgICAgICAgc2tpcFVudGlsUmVtZW1iZXJMYXRlc3QoaWZyYW1lQXBpQXZhaWxhYmxlT2JzKSxcbiAgICAgICAgc2NhbihzeW5jUGxheWVyU3RhdGUsIHVuZGVmaW5lZCksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCkpO1xufVxuXG4vKiogU2tpcHMgdGhlIGdpdmVuIG9ic2VydmFibGUgdW50aWwgdGhlIG90aGVyIG9ic2VydmFibGUgZW1pdHMgdHJ1ZSwgdGhlbiBlbWl0IHRoZSBsYXRlc3QuICovXG5mdW5jdGlvbiBza2lwVW50aWxSZW1lbWJlckxhdGVzdDxUPihub3RpZmllcjogT2JzZXJ2YWJsZTxib29sZWFuPik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIGNvbWJpbmVMYXRlc3RPcChub3RpZmllciksXG4gICAgc2tpcFdoaWxlKChbXywgZG9uZVNraXBwaW5nXSkgPT4gIWRvbmVTa2lwcGluZyksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSkpO1xufVxuXG4vKiogRGVzdHJveSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBubyBvcHRpb25zLCBvciBjcmVhdGUgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIHN5bmNQbGF5ZXJTdGF0ZShcbiAgcGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLFxuICBbY29udGFpbmVyLCB2aWRlb09wdGlvbnMsIG5nWm9uZV06IFtIVE1MRWxlbWVudCwgWVQuUGxheWVyT3B0aW9ucyB8IHVuZGVmaW5lZCwgTmdab25lXSxcbik6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQge1xuICBpZiAoIXZpZGVvT3B0aW9ucykge1xuICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBpZiAocGxheWVyKSB7XG4gICAgcmV0dXJuIHBsYXllcjtcbiAgfVxuXG4gIC8vIEltcG9ydGFudCEgV2UgbmVlZCB0byBjcmVhdGUgdGhlIFBsYXllciBvYmplY3Qgb3V0c2lkZSBvZiB0aGUgYE5nWm9uZWAsIGJlY2F1c2UgaXQga2lja3NcbiAgLy8gb2ZmIGEgMjUwbXMgc2V0SW50ZXJ2YWwgd2hpY2ggd2lsbCBjb250aW51YWxseSB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gaWYgd2UgZG9uJ3QuXG4gIGNvbnN0IG5ld1BsYXllcjogVW5pbml0aWFsaXplZFBsYXllciA9XG4gICAgICBuZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gbmV3IFlULlBsYXllcihjb250YWluZXIsIHZpZGVvT3B0aW9ucykpO1xuICAvLyBCaW5kIHZpZGVvSWQgZm9yIGZ1dHVyZSB1c2UuXG4gIG5ld1BsYXllci52aWRlb0lkID0gdmlkZW9PcHRpb25zLnZpZGVvSWQ7XG4gIHJldHVybiBuZXdQbGF5ZXI7XG59XG5cbi8qKlxuICogQ2FsbCBjdWVWaWRlb0J5SWQgaWYgdGhlIHZpZGVvSWQgY2hhbmdlcywgb3Igd2hlbiBzdGFydCBvciBlbmQgc2Vjb25kcyBjaGFuZ2UuIGN1ZVZpZGVvQnlJZCB3aWxsXG4gKiBjaGFuZ2UgdGhlIGxvYWRlZCB2aWRlbyBpZCB0byB0aGUgZ2l2ZW4gdmlkZW9JZCwgYW5kIHNldCB0aGUgc3RhcnQgYW5kIGVuZCB0aW1lcyB0byB0aGUgZ2l2ZW5cbiAqIHN0YXJ0L2VuZCBzZWNvbmRzLlxuICovXG5mdW5jdGlvbiBiaW5kQ3VlVmlkZW9DYWxsKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8UGxheWVyIHwgdW5kZWZpbmVkPixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBzdGFydFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgZW5kU2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4sXG4gIGRlc3Ryb3llZDogT2JzZXJ2YWJsZTx2b2lkPixcbikge1xuICBjb25zdCBjdWVPcHRpb25zT2JzID0gY29tYmluZUxhdGVzdChbc3RhcnRTZWNvbmRzT2JzLCBlbmRTZWNvbmRzT2JzXSlcbiAgICAucGlwZShtYXAoKFtzdGFydFNlY29uZHMsIGVuZFNlY29uZHNdKSA9PiAoe3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc30pKSk7XG5cbiAgLy8gT25seSByZXNwb25kIHRvIGNoYW5nZXMgaW4gY3VlIG9wdGlvbnMgaWYgdGhlIHBsYXllciBpcyBub3QgcnVubmluZy5cbiAgY29uc3QgZmlsdGVyZWRDdWVPcHRpb25zID0gY3VlT3B0aW9uc09ic1xuICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCBwbGF5ZXIgPT4gISFwbGF5ZXIgJiYgIWhhc1BsYXllclN0YXJ0ZWQocGxheWVyKSkpO1xuXG4gIC8vIElmIHRoZSB2aWRlbyBpZCBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZSBwbGF5ZXJcbiAgLy8gd2FzIGluaXRpYWxpemVkIHdpdGggYSBkaWZmZXJlbnQgdmlkZW8gaWQuXG4gIGNvbnN0IGNoYW5nZWRWaWRlb0lkID0gdmlkZW9JZE9ic1xuICAgICAgLnBpcGUoZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIChwbGF5ZXIsIHZpZGVvSWQpID0+ICEhcGxheWVyICYmIHBsYXllci52aWRlb0lkICE9PSB2aWRlb0lkKSk7XG5cbiAgLy8gSWYgdGhlIHBsYXllciBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZXJlIGFyZSBjdWUgb3B0aW9ucy5cbiAgY29uc3QgY2hhbmdlZFBsYXllciA9IHBsYXllck9icy5waXBlKFxuICAgIGZpbHRlck9uT3RoZXIoXG4gICAgICBjb21iaW5lTGF0ZXN0KFt2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzXSksXG4gICAgICAoW3ZpZGVvSWQsIGN1ZU9wdGlvbnNdLCBwbGF5ZXIpID0+XG4gICAgICAgICAgISFwbGF5ZXIgJiZcbiAgICAgICAgICAgICh2aWRlb0lkICE9IHBsYXllci52aWRlb0lkIHx8ICEhY3VlT3B0aW9ucy5zdGFydFNlY29uZHMgfHwgISFjdWVPcHRpb25zLmVuZFNlY29uZHMpKSk7XG5cbiAgbWVyZ2UoY2hhbmdlZFBsYXllciwgY2hhbmdlZFZpZGVvSWQsIGZpbHRlcmVkQ3VlT3B0aW9ucylcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgdmlkZW9JZE9icywgY3VlT3B0aW9uc09icywgc3VnZ2VzdGVkUXVhbGl0eU9ic10pKSxcbiAgICAgIG1hcCgoW18sIHZhbHVlc10pID0+IHZhbHVlcyksXG4gICAgICB0YWtlVW50aWwoZGVzdHJveWVkKSxcbiAgICApXG4gICAgLnN1YnNjcmliZSgoW3BsYXllciwgdmlkZW9JZCwgY3VlT3B0aW9ucywgc3VnZ2VzdGVkUXVhbGl0eV0pID0+IHtcbiAgICAgIGlmICghdmlkZW9JZCB8fCAhcGxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBsYXllci52aWRlb0lkID0gdmlkZW9JZDtcbiAgICAgIHBsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkLFxuICAgICAgICBzdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgICAuLi5jdWVPcHRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGhhc1BsYXllclN0YXJ0ZWQocGxheWVyOiBZVC5QbGF5ZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSBwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgcmV0dXJuIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQgJiYgc3RhdGUgIT09IFlULlBsYXllclN0YXRlLkNVRUQ7XG59XG5cbmZ1bmN0aW9uIHBsYXllcklzUmVhZHkocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKTogcGxheWVyIGlzIFBsYXllciB7XG4gIHJldHVybiAnZ2V0UGxheWVyU3RhdHVzJyBpbiBwbGF5ZXI7XG59XG5cbi8qKiBDb21iaW5lcyB0aGUgdHdvIG9ic2VydmFibGVzIHRlbXBvcmFyaWx5IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uLiAqL1xuZnVuY3Rpb24gZmlsdGVyT25PdGhlcjxSLCBUPihcbiAgb3RoZXJPYnM6IE9ic2VydmFibGU8VD4sXG4gIGZpbHRlckZuOiAodDogVCwgcj86IFIpID0+IGJvb2xlYW4sXG4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248Uj4ge1xuICByZXR1cm4gcGlwZShcbiAgICB3aXRoTGF0ZXN0RnJvbShvdGhlck9icyksXG4gICAgZmlsdGVyKChbdmFsdWUsIG90aGVyXSkgPT4gZmlsdGVyRm4ob3RoZXIsIHZhbHVlKSksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSksXG4gICk7XG59XG4iXX0=