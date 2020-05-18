import { Component, ChangeDetectionStrategy, ViewEncapsulation, NgZone, Inject, PLATFORM_ID, Input, Output, ViewChild, NgModule } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject, of, combineLatest, pipe, Observable, fromEventPattern, merge } from 'rxjs';
import { take, startWith, combineLatest as combineLatest$1, skipWhile, map, scan, distinctUntilChanged, flatMap, takeUntil, publish, switchMap, withLatestFrom, filter } from 'rxjs/operators';

/**
 * @fileoverview added by tsickle
 * Generated from: src/youtube-player/youtube-player.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/** @type {?} */
const DEFAULT_PLAYER_WIDTH = 640;
/** @type {?} */
const DEFAULT_PLAYER_HEIGHT = 390;
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
let YouTubePlayer = /** @class */ (() => {
    /**
     * Angular component that renders a YouTube player via the YouTube player
     * iframe API.
     * @see https://developers.google.com/youtube/iframe_api_reference
     */
    class YouTubePlayer {
        /**
         * @param {?} _ngZone
         * @param {?} platformId
         */
        constructor(_ngZone, platformId) {
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
            this._isBrowser = isPlatformBrowser(platformId);
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
            let iframeApiAvailableObs = of(true);
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
                })) : of();
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
        { type: Object, decorators: [{ type: Inject, args: [PLATFORM_ID,] }] }
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
    return YouTubePlayer;
})();
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
            return of(undefined);
        }
        if (playerIsReady(player)) {
            return of((/** @type {?} */ (player)));
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
    return pipe(combineLatest$1(notifier), skipWhile((/**
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

/**
 * @fileoverview added by tsickle
 * Generated from: src/youtube-player/youtube-module.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/** @type {?} */
const COMPONENTS = [YouTubePlayer];
let YouTubePlayerModule = /** @class */ (() => {
    class YouTubePlayerModule {
    }
    YouTubePlayerModule.decorators = [
        { type: NgModule, args: [{
                    declarations: COMPONENTS,
                    exports: COMPONENTS,
                },] }
    ];
    return YouTubePlayerModule;
})();

/**
 * @fileoverview added by tsickle
 * Generated from: src/youtube-player/public-api.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

/**
 * Generated bundle index. Do not edit.
 */

export { YouTubePlayer, YouTubePlayerModule };
//# sourceMappingURL=youtube-player.js.map
