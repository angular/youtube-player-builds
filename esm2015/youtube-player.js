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
import { combineLatest, merge, Observable, of as observableOf, pipe, Subject, of, BehaviorSubject, fromEventPattern, } from 'rxjs';
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, switchMap, tap, } from 'rxjs/operators';
export const DEFAULT_PLAYER_WIDTH = 640;
export const DEFAULT_PLAYER_HEIGHT = 390;
/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export class YouTubePlayer {
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
        /** Outputs are direct proxies from the player itself. */
        this.ready = this._getLazyEmitter('onReady');
        this.stateChange = this._getLazyEmitter('onStateChange');
        this.error = this._getLazyEmitter('onError');
        this.apiChange = this._getLazyEmitter('onApiChange');
        this.playbackQualityChange = this._getLazyEmitter('onPlaybackQualityChange');
        this.playbackRateChange = this._getLazyEmitter('onPlaybackRateChange');
        this._isBrowser = isPlatformBrowser(platformId);
    }
    /** YouTube Video ID to view */
    get videoId() { return this._videoId.value; }
    set videoId(videoId) {
        this._videoId.next(videoId);
    }
    /** Height of video player */
    get height() { return this._height.value; }
    set height(height) {
        this._height.next(height || DEFAULT_PLAYER_HEIGHT);
    }
    /** Width of video player */
    get width() { return this._width.value; }
    set width(width) {
        this._width.next(width || DEFAULT_PLAYER_WIDTH);
    }
    /** The moment when the player is supposed to start playing */
    set startSeconds(startSeconds) {
        this._startSeconds.next(startSeconds);
    }
    /** The moment when the player is supposed to stop playing */
    set endSeconds(endSeconds) {
        this._endSeconds.next(endSeconds);
    }
    /** The suggested quality of the player */
    set suggestedQuality(suggestedQuality) {
        this._suggestedQuality.next(suggestedQuality);
    }
    ngOnInit() {
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        let iframeApiAvailableObs = observableOf(true);
        if (!window.YT) {
            if (this.showBeforeIframeApiLoads) {
                throw new Error('Namespace YT not found, cannot construct embedded youtube player. ' +
                    'Please install the YouTube Player API Reference for iframe Embeds: ' +
                    'https://developers.google.com/youtube/iframe_api_reference');
            }
            const iframeApiAvailableSubject = new Subject();
            this._existingApiReadyCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (this._existingApiReadyCallback) {
                    this._existingApiReadyCallback();
                }
                this._ngZone.run(() => iframeApiAvailableSubject.next(true));
            };
            iframeApiAvailableObs = iframeApiAvailableSubject.pipe(take(1), startWith(false));
        }
        // An observable of the currently loaded player.
        const playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this._ngZone).pipe(tap(player => {
            // Emit this before the `waitUntilReady` call so that we can bind to
            // events that happen as the player is being initialized (e.g. `onReady`).
            this._playerChanges.next(player);
        }), waitUntilReady(player => {
            // Destroy the player if loading was aborted so that we don't end up leaking memory.
            if (!playerIsReady(player)) {
                player.destroy();
            }
        }), takeUntil(this._destroyed), publish());
        // Set up side effects to bind inputs to the player.
        playerObs.subscribe(player => {
            this._player = player;
            if (player && this._pendingPlayerState) {
                this._initializePlayer(player, this._pendingPlayerState);
            }
            this._pendingPlayerState = undefined;
        });
        bindSizeToPlayer(playerObs, this._width, this._height);
        bindSuggestedQualityToPlayer(playerObs, this._suggestedQuality);
        bindCueVideoCall(playerObs, this._videoId, this._startSeconds, this._endSeconds, this._suggestedQuality, this._destroyed);
        // After all of the subscriptions are set up, connect the observable.
        playerObs.connect();
    }
    /**
     * @deprecated No longer being used. To be removed.
     * @breaking-change 11.0.0
     */
    createEventsBoundInZone() {
        return {};
    }
    ngAfterViewInit() {
        this._youtubeContainer.next(this.youtubeContainer.nativeElement);
    }
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
    /** See https://developers.google.com/youtube/iframe_api_reference#playVideo */
    playVideo() {
        if (this._player) {
            this._player.playVideo();
        }
        else {
            this._getPendingState().playbackState = 1 /* PLAYING */;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#pauseVideo */
    pauseVideo() {
        if (this._player) {
            this._player.pauseVideo();
        }
        else {
            this._getPendingState().playbackState = 2 /* PAUSED */;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#stopVideo */
    stopVideo() {
        if (this._player) {
            this._player.stopVideo();
        }
        else {
            // It seems like YouTube sets the player to CUED when it's stopped.
            this._getPendingState().playbackState = 5 /* CUED */;
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
        return -1 /* UNSTARTED */;
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
    /** Initializes a player from a temporary state. */
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
    /** Gets an observable that adds an event listener to the player when a user subscribes to it. */
    _getLazyEmitter(name) {
        // Start with the stream of players. This way the events will be transferred
        // over to the new player if it gets swapped out under-the-hood.
        return this._playerChanges.pipe(
        // Switch to the bound event. `switchMap` ensures that the old event is removed when the
        // player is changed. If there's no player, return an observable that never emits.
        switchMap(player => {
            return player ? fromEventPattern((listener) => {
                player.addEventListener(name, listener);
            }, (listener) => {
                // The API seems to throw when we try to unbind from a destroyed player and it doesn't
                // expose whether the player has been destroyed so we have to wrap it in a try/catch to
                // prevent the entire stream from erroring out.
                try {
                    if (player.removeEventListener) {
                        player.removeEventListener(name, listener);
                    }
                }
                catch (_a) { }
            }) : observableOf();
        }), 
        // By default we run all the API interactions outside the zone
        // so we have to bring the events back in manually when they emit.
        (source) => new Observable(observer => source.subscribe({
            next: value => this._ngZone.run(() => observer.next(value)),
            error: error => observer.error(error),
            complete: () => observer.complete()
        })), 
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
            },] }
];
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
/** Listens to changes to the given width and height and sets it on the player. */
function bindSizeToPlayer(playerObs, widthObs, heightObs) {
    return combineLatest([playerObs, widthObs, heightObs])
        .subscribe(([player, width, height]) => player && player.setSize(width, height));
}
/** Listens to changes from the suggested quality and sets it on the given player. */
function bindSuggestedQualityToPlayer(playerObs, suggestedQualityObs) {
    return combineLatest([
        playerObs,
        suggestedQualityObs
    ]).subscribe(([player, suggestedQuality]) => player && suggestedQuality && player.setPlaybackQuality(suggestedQuality));
}
/**
 * Returns an observable that emits the loaded player once it's ready. Certain properties/methods
 * won't be available until the iframe finishes loading.
 * @param onAbort Callback function that will be invoked if the player loading was aborted before
 * it was able to complete. Can be used to clean up any loose references.
 */
function waitUntilReady(onAbort) {
    return flatMap(player => {
        if (!player) {
            return observableOf(undefined);
        }
        if (playerIsReady(player)) {
            return observableOf(player);
        }
        // Since removeEventListener is not on Player when it's initialized, we can't use fromEvent.
        // The player is not initialized fully until the ready is called.
        return new Observable(emitter => {
            let aborted = false;
            let resolved = false;
            const onReady = (event) => {
                resolved = true;
                if (!aborted) {
                    event.target.removeEventListener('onReady', onReady);
                    emitter.next(event.target);
                }
            };
            player.addEventListener('onReady', onReady);
            return () => {
                aborted = true;
                if (!resolved) {
                    onAbort(player);
                }
            };
        }).pipe(take(1), startWith(undefined));
    });
}
/** Create an observable for the player based on the given options. */
function createPlayerObservable(youtubeContainer, videoIdObs, iframeApiAvailableObs, widthObs, heightObs, ngZone) {
    const playerOptions = videoIdObs
        .pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map(([videoId, [width, height]]) => videoId ? ({ videoId, width, height }) : undefined));
    return combineLatest([youtubeContainer, playerOptions, of(ngZone)])
        .pipe(skipUntilRememberLatest(iframeApiAvailableObs), scan(syncPlayerState, undefined), distinctUntilChanged());
}
/** Skips the given observable until the other observable emits true, then emit the latest. */
function skipUntilRememberLatest(notifier) {
    return pipe(combineLatestOp(notifier), skipWhile(([_, doneSkipping]) => !doneSkipping), map(([value]) => value));
}
/** Destroy the player if there are no options, or create the player if there are options. */
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
    const newPlayer = ngZone.runOutsideAngular(() => new YT.Player(container, videoOptions));
    // Bind videoId for future use.
    newPlayer.videoId = videoOptions.videoId;
    return newPlayer;
}
/**
 * Call cueVideoById if the videoId changes, or when start or end seconds change. cueVideoById will
 * change the loaded video id to the given videoId, and set the start and end times to the given
 * start/end seconds.
 */
function bindCueVideoCall(playerObs, videoIdObs, startSecondsObs, endSecondsObs, suggestedQualityObs, destroyed) {
    const cueOptionsObs = combineLatest([startSecondsObs, endSecondsObs])
        .pipe(map(([startSeconds, endSeconds]) => ({ startSeconds, endSeconds })));
    // Only respond to changes in cue options if the player is not running.
    const filteredCueOptions = cueOptionsObs
        .pipe(filterOnOther(playerObs, player => !!player && !hasPlayerStarted(player)));
    // If the video id changed, there's no reason to run 'cue' unless the player
    // was initialized with a different video id.
    const changedVideoId = videoIdObs
        .pipe(filterOnOther(playerObs, (player, videoId) => !!player && player.videoId !== videoId));
    // If the player changed, there's no reason to run 'cue' unless there are cue options.
    const changedPlayer = playerObs.pipe(filterOnOther(combineLatest([videoIdObs, cueOptionsObs]), ([videoId, cueOptions], player) => !!player &&
        (videoId != player.videoId || !!cueOptions.startSeconds || !!cueOptions.endSeconds)));
    merge(changedPlayer, changedVideoId, filteredCueOptions)
        .pipe(withLatestFrom(combineLatest([playerObs, videoIdObs, cueOptionsObs, suggestedQualityObs])), map(([_, values]) => values), takeUntil(destroyed))
        .subscribe(([player, videoId, cueOptions, suggestedQuality]) => {
        if (!videoId || !player) {
            return;
        }
        player.videoId = videoId;
        player.cueVideoById(Object.assign({ videoId,
            suggestedQuality }, cueOptions));
    });
}
function hasPlayerStarted(player) {
    const state = player.getPlayerState();
    return state !== -1 /* UNSTARTED */ && state !== 5 /* CUED */;
}
function playerIsReady(player) {
    return 'getPlayerStatus' in player;
}
/** Combines the two observables temporarily for the filter function. */
function filterOnOther(otherObs, filterFn) {
    return pipe(withLatestFrom(otherObs), filter(([value, other]) => filterFn(other, value)), map(([value]) => value));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgseUVBQXlFO0FBQ3pFLGlDQUFpQztBQUVqQyxPQUFPLEVBRUwsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsS0FBSyxFQUNMLE1BQU0sRUFHTixNQUFNLEVBQ04sU0FBUyxFQUNULGlCQUFpQixFQUNqQixNQUFNLEVBQ04sV0FBVyxHQUNaLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRWxELE9BQU8sRUFDTCxhQUFhLEVBRWIsS0FBSyxFQUVMLFVBQVUsRUFDVixFQUFFLElBQUksWUFBWSxFQUVsQixJQUFJLEVBQ0osT0FBTyxFQUNQLEVBQUUsRUFDRixlQUFlLEVBQ2YsZ0JBQWdCLEdBQ2pCLE1BQU0sTUFBTSxDQUFDO0FBRWQsT0FBTyxFQUNMLGFBQWEsSUFBSSxlQUFlLEVBQ2hDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sT0FBTyxFQUNQLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEVBQ2QsU0FBUyxFQUNULEdBQUcsR0FDSixNQUFNLGdCQUFnQixDQUFDO0FBU3hCLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztBQUN4QyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUM7QUF3QnpDOzs7O0dBSUc7QUFRSCxNQUFNLE9BQU8sYUFBYTtJQXFGeEIsWUFBb0IsT0FBZSxFQUF1QixVQUFrQjtRQUF4RCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBbEYzQixzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBZSxD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LENBQ1QsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUNsRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FDeEIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gV29ya2Fyb3VuZCBmb3I6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvMTI2NVxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ5b3V0dWJlXCIgLz5cblxuaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgSW5qZWN0LFxuICBQTEFURk9STV9JRCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2lzUGxhdGZvcm1Ccm93c2VyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0LFxuICBDb25uZWN0YWJsZU9ic2VydmFibGUsXG4gIG1lcmdlLFxuICBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb24sXG4gIE9ic2VydmFibGUsXG4gIG9mIGFzIG9ic2VydmFibGVPZixcbiAgT3BlcmF0b3JGdW5jdGlvbixcbiAgcGlwZSxcbiAgU3ViamVjdCxcbiAgb2YsXG4gIEJlaGF2aW9yU3ViamVjdCxcbiAgZnJvbUV2ZW50UGF0dGVybixcbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QgYXMgY29tYmluZUxhdGVzdE9wLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgZmlsdGVyLFxuICBmbGF0TWFwLFxuICBtYXAsXG4gIHB1Ymxpc2gsXG4gIHNjYW4sXG4gIHNraXBXaGlsZSxcbiAgc3RhcnRXaXRoLFxuICB0YWtlLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBzd2l0Y2hNYXAsXG4gIHRhcCxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFlUOiB0eXBlb2YgWVQgfCB1bmRlZmluZWQ7XG4gICAgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfV0lEVEggPSA2NDA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfSEVJR0hUID0gMzkwO1xuXG4vLyBUaGUgbmF0aXZlIFlULlBsYXllciBkb2Vzbid0IGV4cG9zZSB0aGUgc2V0IHZpZGVvSWQsIGJ1dCB3ZSBuZWVkIGl0IGZvclxuLy8gY29udmVuaWVuY2UuXG5pbnRlcmZhY2UgUGxheWVyIGV4dGVuZHMgWVQuUGxheWVyIHtcbiAgdmlkZW9JZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cblxuLy8gVGhlIHBsYXllciBpc24ndCBmdWxseSBpbml0aWFsaXplZCB3aGVuIGl0J3MgY29uc3RydWN0ZWQuXG4vLyBUaGUgb25seSBmaWVsZCBhdmFpbGFibGUgaXMgZGVzdHJveSBhbmQgYWRkRXZlbnRMaXN0ZW5lci5cbnR5cGUgVW5pbml0aWFsaXplZFBsYXllciA9IFBpY2s8UGxheWVyLCAndmlkZW9JZCcgfCAnZGVzdHJveScgfCAnYWRkRXZlbnRMaXN0ZW5lcic+O1xuXG4vKipcbiAqIE9iamVjdCB1c2VkIHRvIHN0b3JlIHRoZSBzdGF0ZSBvZiB0aGUgcGxheWVyIGlmIHRoZVxuICogdXNlciB0cmllcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBBUEkgYmVmb3JlIGl0IGhhcyBiZWVuIGxvYWRlZC5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gIHBsYXliYWNrU3RhdGU/OiBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HIHwgWVQuUGxheWVyU3RhdGUuUEFVU0VEIHwgWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgcGxheWJhY2tSYXRlPzogbnVtYmVyO1xuICB2b2x1bWU/OiBudW1iZXI7XG4gIG11dGVkPzogYm9vbGVhbjtcbiAgc2Vlaz86IHtzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFufTtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNvbXBvbmVudCB0aGF0IHJlbmRlcnMgYSBZb3VUdWJlIHBsYXllciB2aWEgdGhlIFlvdVR1YmUgcGxheWVyXG4gKiBpZnJhbWUgQVBJLlxuICogQHNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3lvdXR1YmUtcGxheWVyJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIC8vIFRoaXMgZGl2IGlzICpyZXBsYWNlZCogYnkgdGhlIFlvdVR1YmUgcGxheWVyIGVtYmVkLlxuICB0ZW1wbGF0ZTogJzxkaXYgI3lvdXR1YmVDb250YWluZXI+PC9kaXY+Jyxcbn0pXG5leHBvcnQgY2xhc3MgWW91VHViZVBsYXllciBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgLyoqIFdoZXRoZXIgd2UncmUgY3VycmVudGx5IHJlbmRlcmluZyBpbnNpZGUgYSBicm93c2VyLiAqL1xuICBwcml2YXRlIF9pc0Jyb3dzZXI6IGJvb2xlYW47XG4gIHByaXZhdGUgX3lvdXR1YmVDb250YWluZXIgPSBuZXcgU3ViamVjdDxIVE1MRWxlbWVudD4oKTtcbiAgcHJpdmF0ZSBfZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSBfcGxheWVyOiBQbGF5ZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjazogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wZW5kaW5nUGxheWVyU3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGxheWVyQ2hhbmdlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogWW91VHViZSBWaWRlbyBJRCB0byB2aWV3ICovXG4gIEBJbnB1dCgpXG4gIGdldCB2aWRlb0lkKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl92aWRlb0lkLnZhbHVlOyB9XG4gIHNldCB2aWRlb0lkKHZpZGVvSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3ZpZGVvSWQubmV4dCh2aWRlb0lkKTtcbiAgfVxuICBwcml2YXRlIF92aWRlb0lkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmcgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIEhlaWdodCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5faGVpZ2h0LnZhbHVlOyB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0OiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9oZWlnaHQubmV4dChoZWlnaHQgfHwgREVGQVVMVF9QTEFZRVJfSEVJR0hUKTtcbiAgfVxuICBwcml2YXRlIF9oZWlnaHQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlcj4oREVGQVVMVF9QTEFZRVJfSEVJR0hUKTtcblxuICAvKiogV2lkdGggb2YgdmlkZW8gcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIGdldCB3aWR0aCgpOiBudW1iZXIgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fd2lkdGgudmFsdWU7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl93aWR0aC5uZXh0KHdpZHRoIHx8IERFRkFVTFRfUExBWUVSX1dJRFRIKTtcbiAgfVxuICBwcml2YXRlIF93aWR0aCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9XSURUSCk7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0YXJ0IHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IHN0YXJ0U2Vjb25kcyhzdGFydFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N0YXJ0U2Vjb25kcy5uZXh0KHN0YXJ0U2Vjb25kcyk7XG4gIH1cbiAgcHJpdmF0ZSBfc3RhcnRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0b3AgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgZW5kU2Vjb25kcyhlbmRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLm5leHQoZW5kU2Vjb25kcyk7XG4gIH1cbiAgcHJpdmF0ZSBfZW5kU2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgc3VnZ2VzdGVkIHF1YWxpdHkgb2YgdGhlIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBzZXQgc3VnZ2VzdGVkUXVhbGl0eShzdWdnZXN0ZWRRdWFsaXR5OiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5Lm5leHQoc3VnZ2VzdGVkUXVhbGl0eSk7XG4gIH1cbiAgcHJpdmF0ZSBfc3VnZ2VzdGVkUXVhbGl0eSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBpZnJhbWUgd2lsbCBhdHRlbXB0IHRvIGxvYWQgcmVnYXJkbGVzcyBvZiB0aGUgc3RhdHVzIG9mIHRoZSBhcGkgb24gdGhlXG4gICAqIHBhZ2UuIFNldCB0aGlzIHRvIHRydWUgaWYgeW91IGRvbid0IHdhbnQgdGhlIGBvbllvdVR1YmVJZnJhbWVBUElSZWFkeWAgZmllbGQgdG8gYmVcbiAgICogc2V0IG9uIHRoZSBnbG9iYWwgd2luZG93LlxuICAgKi9cbiAgQElucHV0KCkgc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzOiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBPdXRwdXRzIGFyZSBkaXJlY3QgcHJveGllcyBmcm9tIHRoZSBwbGF5ZXIgaXRzZWxmLiAqL1xuICBAT3V0cHV0KCkgcmVhZHk6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25SZWFkeScpO1xuXG4gIEBPdXRwdXQoKSBzdGF0ZUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4oJ29uU3RhdGVDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgZXJyb3I6IE9ic2VydmFibGU8WVQuT25FcnJvckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PbkVycm9yRXZlbnQ+KCdvbkVycm9yJyk7XG5cbiAgQE91dHB1dCgpIGFwaUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvbkFwaUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSBwbGF5YmFja1F1YWxpdHlDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4oJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHBsYXliYWNrUmF0ZUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1JhdGVDaGFuZ2UnKTtcblxuICAvKiogVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBpZnJhbWUuICovXG4gIEBWaWV3Q2hpbGQoJ3lvdXR1YmVDb250YWluZXInKVxuICB5b3V0dWJlQ29udGFpbmVyOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSwgQEluamVjdChQTEFURk9STV9JRCkgcGxhdGZvcm1JZDogT2JqZWN0KSB7XG4gICAgdGhpcy5faXNCcm93c2VyID0gaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBub3QgaW4gYSBicm93c2VyIGVudmlyb25tZW50LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGlmcmFtZUFwaUF2YWlsYWJsZU9iczogT2JzZXJ2YWJsZTxib29sZWFuPiA9IG9ic2VydmFibGVPZih0cnVlKTtcbiAgICBpZiAoIXdpbmRvdy5ZVCkge1xuICAgICAgaWYgKHRoaXMuc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTmFtZXNwYWNlIFlUIG5vdCBmb3VuZCwgY2Fubm90IGNvbnN0cnVjdCBlbWJlZGRlZCB5b3V0dWJlIHBsYXllci4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIGluc3RhbGwgdGhlIFlvdVR1YmUgUGxheWVyIEFQSSBSZWZlcmVuY2UgZm9yIGlmcmFtZSBFbWJlZHM6ICcgK1xuICAgICAgICAgICAgJ2h0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdCA9IG5ldyBTdWJqZWN0PGJvb2xlYW4+KCk7XG4gICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2sgPSB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk7XG5cbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdC5uZXh0KHRydWUpKTtcbiAgICAgIH07XG4gICAgICBpZnJhbWVBcGlBdmFpbGFibGVPYnMgPSBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0LnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKGZhbHNlKSk7XG4gICAgfVxuXG4gICAgLy8gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBwbGF5ZXIuXG4gICAgY29uc3QgcGxheWVyT2JzID1cbiAgICAgIGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gICAgICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIsXG4gICAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyxcbiAgICAgICAgdGhpcy5fd2lkdGgsXG4gICAgICAgIHRoaXMuX2hlaWdodCxcbiAgICAgICAgdGhpcy5fbmdab25lXG4gICAgICApLnBpcGUodGFwKHBsYXllciA9PiB7XG4gICAgICAgIC8vIEVtaXQgdGhpcyBiZWZvcmUgdGhlIGB3YWl0VW50aWxSZWFkeWAgY2FsbCBzbyB0aGF0IHdlIGNhbiBiaW5kIHRvXG4gICAgICAgIC8vIGV2ZW50cyB0aGF0IGhhcHBlbiBhcyB0aGUgcGxheWVyIGlzIGJlaW5nIGluaXRpYWxpemVkIChlLmcuIGBvblJlYWR5YCkuXG4gICAgICAgIHRoaXMuX3BsYXllckNoYW5nZXMubmV4dChwbGF5ZXIpO1xuICAgICAgfSksIHdhaXRVbnRpbFJlYWR5KHBsYXllciA9PiB7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIHBsYXllciBpZiBsb2FkaW5nIHdhcyBhYm9ydGVkIHNvIHRoYXQgd2UgZG9uJ3QgZW5kIHVwIGxlYWtpbmcgbWVtb3J5LlxuICAgICAgICBpZiAoIXBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLCB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSwgcHVibGlzaCgpKTtcblxuICAgIC8vIFNldCB1cCBzaWRlIGVmZmVjdHMgdG8gYmluZCBpbnB1dHMgdG8gdGhlIHBsYXllci5cbiAgICBwbGF5ZXJPYnMuc3Vic2NyaWJlKHBsYXllciA9PiB7XG4gICAgICB0aGlzLl9wbGF5ZXIgPSBwbGF5ZXI7XG5cbiAgICAgIGlmIChwbGF5ZXIgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVQbGF5ZXIocGxheWVyLCB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICBiaW5kU2l6ZVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG5cbiAgICBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSk7XG5cbiAgICBiaW5kQ3VlVmlkZW9DYWxsKFxuICAgICAgcGxheWVyT2JzLFxuICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgIHRoaXMuX3N0YXJ0U2Vjb25kcyxcbiAgICAgIHRoaXMuX2VuZFNlY29uZHMsXG4gICAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgdGhpcy5fZGVzdHJveWVkKTtcblxuICAgIC8vIEFmdGVyIGFsbCBvZiB0aGUgc3Vic2NyaXB0aW9ucyBhcmUgc2V0IHVwLCBjb25uZWN0IHRoZSBvYnNlcnZhYmxlLlxuICAgIChwbGF5ZXJPYnMgYXMgQ29ubmVjdGFibGVPYnNlcnZhYmxlPFBsYXllcj4pLmNvbm5lY3QoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCBObyBsb25nZXIgYmVpbmcgdXNlZC4gVG8gYmUgcmVtb3ZlZC5cbiAgICogQGJyZWFraW5nLWNoYW5nZSAxMS4wLjBcbiAgICovXG4gIGNyZWF0ZUV2ZW50c0JvdW5kSW5ab25lKCk6IFlULkV2ZW50cyB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgbmdBZnRlclZpZXdJbml0KCkge1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIubmV4dCh0aGlzLnlvdXR1YmVDb250YWluZXIubmF0aXZlRWxlbWVudCk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrO1xuICAgIH1cblxuICAgIHRoaXMuX3BsYXllckNoYW5nZXMuY29tcGxldGUoKTtcbiAgICB0aGlzLl92aWRlb0lkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5faGVpZ2h0LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fd2lkdGguY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIuY29tcGxldGUoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5jb21wbGV0ZSgpO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BsYXlWaWRlbyAqL1xuICBwbGF5VmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBsYXlWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUExBWUlORztcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGF1c2VWaWRlbyAqL1xuICBwYXVzZVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3N0b3BWaWRlbyAqL1xuICBzdG9wVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnN0b3BWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJdCBzZWVtcyBsaWtlIFlvdVR1YmUgc2V0cyB0aGUgcGxheWVyIHRvIENVRUQgd2hlbiBpdCdzIHN0b3BwZWQuXG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2Vla1RvICovXG4gIHNlZWtUbyhzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNlZWtUbyhzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnNlZWsgPSB7c2Vjb25kcywgYWxsb3dTZWVrQWhlYWR9O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNtdXRlICovXG4gIG11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLm11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSN1bk11dGUgKi9cbiAgdW5NdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci51bk11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjaXNNdXRlZCAqL1xuICBpc011dGVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuaXNNdXRlZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5tdXRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0Vm9sdW1lICovXG4gIHNldFZvbHVtZSh2b2x1bWU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkudm9sdW1lID0gdm9sdW1lO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWb2x1bWUgKi9cbiAgZ2V0Vm9sdW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRWb2x1bWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0UGxheWJhY2tSYXRlICovXG4gIHNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrUmF0ZSA9IHBsYXliYWNrUmF0ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tSYXRlICovXG4gIGdldFBsYXliYWNrUmF0ZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tSYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMgKi9cbiAgZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0xvYWRlZEZyYWN0aW9uICovXG4gIGdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWVyU3RhdGUgKi9cbiAgZ2V0UGxheWVyU3RhdGUoKTogWVQuUGxheWVyU3RhdGUgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5faXNCcm93c2VyIHx8ICF3aW5kb3cuWVQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlO1xuICAgIH1cblxuICAgIHJldHVybiBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQ7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Q3VycmVudFRpbWUgKi9cbiAgZ2V0Q3VycmVudFRpbWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldEN1cnJlbnRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlaykge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrLnNlY29uZHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tRdWFsaXR5ICovXG4gIGdldFBsYXliYWNrUXVhbGl0eSgpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tRdWFsaXR5KCkgOiAnZGVmYXVsdCc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscyAqL1xuICBnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldER1cmF0aW9uICovXG4gIGdldER1cmF0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXREdXJhdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb1VybCAqL1xuICBnZXRWaWRlb1VybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9VcmwoKSA6ICcnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvRW1iZWRDb2RlICovXG4gIGdldFZpZGVvRW1iZWRDb2RlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0VtYmVkQ29kZSgpIDogJyc7XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYmplY3QgdGhhdCBzaG91bGQgYmUgdXNlZCB0byBzdG9yZSB0aGUgdGVtcG9yYXJ5IEFQSSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfZ2V0UGVuZGluZ1N0YXRlKCk6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gICAgaWYgKCF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGU7XG4gIH1cblxuICAvKiogSW5pdGlhbGl6ZXMgYSBwbGF5ZXIgZnJvbSBhIHRlbXBvcmFyeSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfaW5pdGlhbGl6ZVBsYXllcihwbGF5ZXI6IFlULlBsYXllciwgc3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSk6IHZvaWQge1xuICAgIGNvbnN0IHtwbGF5YmFja1N0YXRlLCBwbGF5YmFja1JhdGUsIHZvbHVtZSwgbXV0ZWQsIHNlZWt9ID0gc3RhdGU7XG5cbiAgICBzd2l0Y2ggKHBsYXliYWNrU3RhdGUpIHtcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUExBWUlORzogcGxheWVyLnBsYXlWaWRlbygpOyBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUEFVU0VEOiBwbGF5ZXIucGF1c2VWaWRlbygpOyBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuQ1VFRDogcGxheWVyLnN0b3BWaWRlbygpOyBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9XG5cbiAgICBpZiAodm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9XG5cbiAgICBpZiAobXV0ZWQgIT0gbnVsbCkge1xuICAgICAgbXV0ZWQgPyBwbGF5ZXIubXV0ZSgpIDogcGxheWVyLnVuTXV0ZSgpO1xuICAgIH1cblxuICAgIGlmIChzZWVrICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZWVrVG8oc2Vlay5zZWNvbmRzLCBzZWVrLmFsbG93U2Vla0FoZWFkKTtcbiAgICB9XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYnNlcnZhYmxlIHRoYXQgYWRkcyBhbiBldmVudCBsaXN0ZW5lciB0byB0aGUgcGxheWVyIHdoZW4gYSB1c2VyIHN1YnNjcmliZXMgdG8gaXQuICovXG4gIHByaXZhdGUgX2dldExhenlFbWl0dGVyPFQgZXh0ZW5kcyBZVC5QbGF5ZXJFdmVudD4obmFtZToga2V5b2YgWVQuRXZlbnRzKTogT2JzZXJ2YWJsZTxUPiB7XG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgc3RyZWFtIG9mIHBsYXllcnMuIFRoaXMgd2F5IHRoZSBldmVudHMgd2lsbCBiZSB0cmFuc2ZlcnJlZFxuICAgIC8vIG92ZXIgdG8gdGhlIG5ldyBwbGF5ZXIgaWYgaXQgZ2V0cyBzd2FwcGVkIG91dCB1bmRlci10aGUtaG9vZC5cbiAgICByZXR1cm4gdGhpcy5fcGxheWVyQ2hhbmdlcy5waXBlKFxuICAgICAgLy8gU3dpdGNoIHRvIHRoZSBib3VuZCBldmVudC4gYHN3aXRjaE1hcGAgZW5zdXJlcyB0aGF0IHRoZSBvbGQgZXZlbnQgaXMgcmVtb3ZlZCB3aGVuIHRoZVxuICAgICAgLy8gcGxheWVyIGlzIGNoYW5nZWQuIElmIHRoZXJlJ3Mgbm8gcGxheWVyLCByZXR1cm4gYW4gb2JzZXJ2YWJsZSB0aGF0IG5ldmVyIGVtaXRzLlxuICAgICAgc3dpdGNoTWFwKHBsYXllciA9PiB7XG4gICAgICAgIHJldHVybiBwbGF5ZXIgPyBmcm9tRXZlbnRQYXR0ZXJuPFQ+KChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICB9LCAobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgIC8vIFRoZSBBUEkgc2VlbXMgdG8gdGhyb3cgd2hlbiB3ZSB0cnkgdG8gdW5iaW5kIGZyb20gYSBkZXN0cm95ZWQgcGxheWVyIGFuZCBpdCBkb2Vzbid0XG4gICAgICAgICAgLy8gZXhwb3NlIHdoZXRoZXIgdGhlIHBsYXllciBoYXMgYmVlbiBkZXN0cm95ZWQgc28gd2UgaGF2ZSB0byB3cmFwIGl0IGluIGEgdHJ5L2NhdGNoIHRvXG4gICAgICAgICAgLy8gcHJldmVudCB0aGUgZW50aXJlIHN0cmVhbSBmcm9tIGVycm9yaW5nIG91dC5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKChwbGF5ZXIgYXMgUGxheWVyKS5yZW1vdmVFdmVudExpc3RlbmVyISkge1xuICAgICAgICAgICAgICAocGxheWVyIGFzIFBsYXllcikucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICB9KSA6IG9ic2VydmFibGVPZjxUPigpO1xuICAgICAgfSksXG4gICAgICAvLyBCeSBkZWZhdWx0IHdlIHJ1biBhbGwgdGhlIEFQSSBpbnRlcmFjdGlvbnMgb3V0c2lkZSB0aGUgem9uZVxuICAgICAgLy8gc28gd2UgaGF2ZSB0byBicmluZyB0aGUgZXZlbnRzIGJhY2sgaW4gbWFudWFsbHkgd2hlbiB0aGV5IGVtaXQuXG4gICAgICAoc291cmNlOiBPYnNlcnZhYmxlPFQ+KSA9PiBuZXcgT2JzZXJ2YWJsZTxUPihvYnNlcnZlciA9PiBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgbmV4dDogdmFsdWUgPT4gdGhpcy5fbmdab25lLnJ1bigoKSA9PiBvYnNlcnZlci5uZXh0KHZhbHVlKSksXG4gICAgICAgIGVycm9yOiBlcnJvciA9PiBvYnNlcnZlci5lcnJvcihlcnJvciksXG4gICAgICAgIGNvbXBsZXRlOiAoKSA9PiBvYnNlcnZlci5jb21wbGV0ZSgpXG4gICAgICB9KSksXG4gICAgICAvLyBFbnN1cmVzIHRoYXQgZXZlcnl0aGluZyBpcyBjbGVhcmVkIG91dCBvbiBkZXN0cm95LlxuICAgICAgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZClcbiAgICApO1xuICB9XG59XG5cbi8qKiBMaXN0ZW5zIHRvIGNoYW5nZXMgdG8gdGhlIGdpdmVuIHdpZHRoIGFuZCBoZWlnaHQgYW5kIHNldHMgaXQgb24gdGhlIHBsYXllci4gKi9cbmZ1bmN0aW9uIGJpbmRTaXplVG9QbGF5ZXIoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPlxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHdpZHRoT2JzLCBoZWlnaHRPYnNdKVxuICAgICAgLnN1YnNjcmliZSgoW3BsYXllciwgd2lkdGgsIGhlaWdodF0pID0+IHBsYXllciAmJiBwbGF5ZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KSk7XG59XG5cbi8qKiBMaXN0ZW5zIHRvIGNoYW5nZXMgZnJvbSB0aGUgc3VnZ2VzdGVkIHF1YWxpdHkgYW5kIHNldHMgaXQgb24gdGhlIGdpdmVuIHBsYXllci4gKi9cbmZ1bmN0aW9uIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD5cbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbXG4gICAgcGxheWVyT2JzLFxuICAgIHN1Z2dlc3RlZFF1YWxpdHlPYnNcbiAgXSkuc3Vic2NyaWJlKFxuICAgIChbcGxheWVyLCBzdWdnZXN0ZWRRdWFsaXR5XSkgPT5cbiAgICAgICAgcGxheWVyICYmIHN1Z2dlc3RlZFF1YWxpdHkgJiYgcGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShzdWdnZXN0ZWRRdWFsaXR5KSk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIGxvYWRlZCBwbGF5ZXIgb25jZSBpdCdzIHJlYWR5LiBDZXJ0YWluIHByb3BlcnRpZXMvbWV0aG9kc1xuICogd29uJ3QgYmUgYXZhaWxhYmxlIHVudGlsIHRoZSBpZnJhbWUgZmluaXNoZXMgbG9hZGluZy5cbiAqIEBwYXJhbSBvbkFib3J0IENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBpbnZva2VkIGlmIHRoZSBwbGF5ZXIgbG9hZGluZyB3YXMgYWJvcnRlZCBiZWZvcmVcbiAqIGl0IHdhcyBhYmxlIHRvIGNvbXBsZXRlLiBDYW4gYmUgdXNlZCB0byBjbGVhbiB1cCBhbnkgbG9vc2UgcmVmZXJlbmNlcy5cbiAqL1xuZnVuY3Rpb24gd2FpdFVudGlsUmVhZHkob25BYm9ydDogKHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcikgPT4gdm9pZCk6XG4gIE9wZXJhdG9yRnVuY3Rpb248VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCwgUGxheWVyIHwgdW5kZWZpbmVkPiB7XG4gIHJldHVybiBmbGF0TWFwKHBsYXllciA9PiB7XG4gICAgaWYgKCFwbGF5ZXIpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2Y8UGxheWVyfHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgICB9XG4gICAgaWYgKHBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZihwbGF5ZXIgYXMgUGxheWVyKTtcbiAgICB9XG5cbiAgICAvLyBTaW5jZSByZW1vdmVFdmVudExpc3RlbmVyIGlzIG5vdCBvbiBQbGF5ZXIgd2hlbiBpdCdzIGluaXRpYWxpemVkLCB3ZSBjYW4ndCB1c2UgZnJvbUV2ZW50LlxuICAgIC8vIFRoZSBwbGF5ZXIgaXMgbm90IGluaXRpYWxpemVkIGZ1bGx5IHVudGlsIHRoZSByZWFkeSBpcyBjYWxsZWQuXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBsYXllcj4oZW1pdHRlciA9PiB7XG4gICAgICBsZXQgYWJvcnRlZCA9IGZhbHNlO1xuICAgICAgbGV0IHJlc29sdmVkID0gZmFsc2U7XG4gICAgICBjb25zdCBvblJlYWR5ID0gKGV2ZW50OiBZVC5QbGF5ZXJFdmVudCkgPT4ge1xuICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFhYm9ydGVkKSB7XG4gICAgICAgICAgZXZlbnQudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCBvblJlYWR5KTtcbiAgICAgICAgICBlbWl0dGVyLm5leHQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCBvblJlYWR5KTtcblxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgYWJvcnRlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICAgIG9uQWJvcnQocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5waXBlKHRha2UoMSksIHN0YXJ0V2l0aCh1bmRlZmluZWQpKTtcbiAgfSk7XG59XG5cbi8qKiBDcmVhdGUgYW4gb2JzZXJ2YWJsZSBmb3IgdGhlIHBsYXllciBiYXNlZCBvbiB0aGUgZ2l2ZW4gb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gIHlvdXR1YmVDb250YWluZXI6IE9ic2VydmFibGU8SFRNTEVsZW1lbnQ+LFxuICB2aWRlb0lkT2JzOiBPYnNlcnZhYmxlPHN0cmluZyB8IHVuZGVmaW5lZD4sXG4gIGlmcmFtZUFwaUF2YWlsYWJsZU9iczogT2JzZXJ2YWJsZTxib29sZWFuPixcbiAgd2lkdGhPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgaGVpZ2h0T2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIG5nWm9uZTogTmdab25lXG4pOiBPYnNlcnZhYmxlPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcblxuICBjb25zdCBwbGF5ZXJPcHRpb25zID1cbiAgICB2aWRlb0lkT2JzXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFt3aWR0aE9icywgaGVpZ2h0T2JzXSkpLFxuICAgICAgbWFwKChbdmlkZW9JZCwgW3dpZHRoLCBoZWlnaHRdXSkgPT4gdmlkZW9JZCA/ICh7dmlkZW9JZCwgd2lkdGgsIGhlaWdodH0pIDogdW5kZWZpbmVkKSxcbiAgICApO1xuXG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFt5b3V0dWJlQ29udGFpbmVyLCBwbGF5ZXJPcHRpb25zLCBvZihuZ1pvbmUpXSlcbiAgICAgIC5waXBlKFxuICAgICAgICBza2lwVW50aWxSZW1lbWJlckxhdGVzdChpZnJhbWVBcGlBdmFpbGFibGVPYnMpLFxuICAgICAgICBzY2FuKHN5bmNQbGF5ZXJTdGF0ZSwgdW5kZWZpbmVkKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSk7XG59XG5cbi8qKiBTa2lwcyB0aGUgZ2l2ZW4gb2JzZXJ2YWJsZSB1bnRpbCB0aGUgb3RoZXIgb2JzZXJ2YWJsZSBlbWl0cyB0cnVlLCB0aGVuIGVtaXQgdGhlIGxhdGVzdC4gKi9cbmZ1bmN0aW9uIHNraXBVbnRpbFJlbWVtYmVyTGF0ZXN0PFQ+KG5vdGlmaWVyOiBPYnNlcnZhYmxlPGJvb2xlYW4+KTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFQ+IHtcbiAgcmV0dXJuIHBpcGUoXG4gICAgY29tYmluZUxhdGVzdE9wKG5vdGlmaWVyKSxcbiAgICBza2lwV2hpbGUoKFtfLCBkb25lU2tpcHBpbmddKSA9PiAhZG9uZVNraXBwaW5nKSxcbiAgICBtYXAoKFt2YWx1ZV0pID0+IHZhbHVlKSk7XG59XG5cbi8qKiBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgdGhlcmUgYXJlIG5vIG9wdGlvbnMsIG9yIGNyZWF0ZSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBvcHRpb25zLiAqL1xuZnVuY3Rpb24gc3luY1BsYXllclN0YXRlKFxuICBwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsXG4gIFtjb250YWluZXIsIHZpZGVvT3B0aW9ucywgbmdab25lXTogW0hUTUxFbGVtZW50LCBZVC5QbGF5ZXJPcHRpb25zIHwgdW5kZWZpbmVkLCBOZ1pvbmVdLFxuKTogVW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCB7XG4gIGlmICghdmlkZW9PcHRpb25zKSB7XG4gICAgaWYgKHBsYXllcikge1xuICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChwbGF5ZXIpIHtcbiAgICByZXR1cm4gcGxheWVyO1xuICB9XG5cbiAgLy8gSW1wb3J0YW50ISBXZSBuZWVkIHRvIGNyZWF0ZSB0aGUgUGxheWVyIG9iamVjdCBvdXRzaWRlIG9mIHRoZSBgTmdab25lYCwgYmVjYXVzZSBpdCBraWNrc1xuICAvLyBvZmYgYSAyNTBtcyBzZXRJbnRlcnZhbCB3aGljaCB3aWxsIGNvbnRpbnVhbGx5IHRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbiBpZiB3ZSBkb24ndC5cbiAgY29uc3QgbmV3UGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyID1cbiAgICAgIG5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiBuZXcgWVQuUGxheWVyKGNvbnRhaW5lciwgdmlkZW9PcHRpb25zKSk7XG4gIC8vIEJpbmQgdmlkZW9JZCBmb3IgZnV0dXJlIHVzZS5cbiAgbmV3UGxheWVyLnZpZGVvSWQgPSB2aWRlb09wdGlvbnMudmlkZW9JZDtcbiAgcmV0dXJuIG5ld1BsYXllcjtcbn1cblxuLyoqXG4gKiBDYWxsIGN1ZVZpZGVvQnlJZCBpZiB0aGUgdmlkZW9JZCBjaGFuZ2VzLCBvciB3aGVuIHN0YXJ0IG9yIGVuZCBzZWNvbmRzIGNoYW5nZS4gY3VlVmlkZW9CeUlkIHdpbGxcbiAqIGNoYW5nZSB0aGUgbG9hZGVkIHZpZGVvIGlkIHRvIHRoZSBnaXZlbiB2aWRlb0lkLCBhbmQgc2V0IHRoZSBzdGFydCBhbmQgZW5kIHRpbWVzIHRvIHRoZSBnaXZlblxuICogc3RhcnQvZW5kIHNlY29uZHMuXG4gKi9cbmZ1bmN0aW9uIGJpbmRDdWVWaWRlb0NhbGwoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxQbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICB2aWRlb0lkT2JzOiBPYnNlcnZhYmxlPHN0cmluZyB8IHVuZGVmaW5lZD4sXG4gIHN0YXJ0U2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBlbmRTZWNvbmRzT2JzOiBPYnNlcnZhYmxlPG51bWJlciB8IHVuZGVmaW5lZD4sXG4gIHN1Z2dlc3RlZFF1YWxpdHlPYnM6IE9ic2VydmFibGU8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPixcbiAgZGVzdHJveWVkOiBPYnNlcnZhYmxlPHZvaWQ+LFxuKSB7XG4gIGNvbnN0IGN1ZU9wdGlvbnNPYnMgPSBjb21iaW5lTGF0ZXN0KFtzdGFydFNlY29uZHNPYnMsIGVuZFNlY29uZHNPYnNdKVxuICAgIC5waXBlKG1hcCgoW3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc10pID0+ICh7c3RhcnRTZWNvbmRzLCBlbmRTZWNvbmRzfSkpKTtcblxuICAvLyBPbmx5IHJlc3BvbmQgdG8gY2hhbmdlcyBpbiBjdWUgb3B0aW9ucyBpZiB0aGUgcGxheWVyIGlzIG5vdCBydW5uaW5nLlxuICBjb25zdCBmaWx0ZXJlZEN1ZU9wdGlvbnMgPSBjdWVPcHRpb25zT2JzXG4gICAgLnBpcGUoZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIHBsYXllciA9PiAhIXBsYXllciAmJiAhaGFzUGxheWVyU3RhcnRlZChwbGF5ZXIpKSk7XG5cbiAgLy8gSWYgdGhlIHZpZGVvIGlkIGNoYW5nZWQsIHRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJ1biAnY3VlJyB1bmxlc3MgdGhlIHBsYXllclxuICAvLyB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBhIGRpZmZlcmVudCB2aWRlbyBpZC5cbiAgY29uc3QgY2hhbmdlZFZpZGVvSWQgPSB2aWRlb0lkT2JzXG4gICAgICAucGlwZShmaWx0ZXJPbk90aGVyKHBsYXllck9icywgKHBsYXllciwgdmlkZW9JZCkgPT4gISFwbGF5ZXIgJiYgcGxheWVyLnZpZGVvSWQgIT09IHZpZGVvSWQpKTtcblxuICAvLyBJZiB0aGUgcGxheWVyIGNoYW5nZWQsIHRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJ1biAnY3VlJyB1bmxlc3MgdGhlcmUgYXJlIGN1ZSBvcHRpb25zLlxuICBjb25zdCBjaGFuZ2VkUGxheWVyID0gcGxheWVyT2JzLnBpcGUoXG4gICAgZmlsdGVyT25PdGhlcihcbiAgICAgIGNvbWJpbmVMYXRlc3QoW3ZpZGVvSWRPYnMsIGN1ZU9wdGlvbnNPYnNdKSxcbiAgICAgIChbdmlkZW9JZCwgY3VlT3B0aW9uc10sIHBsYXllcikgPT5cbiAgICAgICAgICAhIXBsYXllciAmJlxuICAgICAgICAgICAgKHZpZGVvSWQgIT0gcGxheWVyLnZpZGVvSWQgfHwgISFjdWVPcHRpb25zLnN0YXJ0U2Vjb25kcyB8fCAhIWN1ZU9wdGlvbnMuZW5kU2Vjb25kcykpKTtcblxuICBtZXJnZShjaGFuZ2VkUGxheWVyLCBjaGFuZ2VkVmlkZW9JZCwgZmlsdGVyZWRDdWVPcHRpb25zKVxuICAgIC5waXBlKFxuICAgICAgd2l0aExhdGVzdEZyb20oY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzLCBzdWdnZXN0ZWRRdWFsaXR5T2JzXSkpLFxuICAgICAgbWFwKChbXywgdmFsdWVzXSkgPT4gdmFsdWVzKSxcbiAgICAgIHRha2VVbnRpbChkZXN0cm95ZWQpLFxuICAgIClcbiAgICAuc3Vic2NyaWJlKChbcGxheWVyLCB2aWRlb0lkLCBjdWVPcHRpb25zLCBzdWdnZXN0ZWRRdWFsaXR5XSkgPT4ge1xuICAgICAgaWYgKCF2aWRlb0lkIHx8ICFwbGF5ZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcGxheWVyLnZpZGVvSWQgPSB2aWRlb0lkO1xuICAgICAgcGxheWVyLmN1ZVZpZGVvQnlJZCh7XG4gICAgICAgIHZpZGVvSWQsXG4gICAgICAgIHN1Z2dlc3RlZFF1YWxpdHksXG4gICAgICAgIC4uLmN1ZU9wdGlvbnMsXG4gICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaGFzUGxheWVyU3RhcnRlZChwbGF5ZXI6IFlULlBsYXllcik6IGJvb2xlYW4ge1xuICBjb25zdCBzdGF0ZSA9IHBsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICByZXR1cm4gc3RhdGUgIT09IFlULlBsYXllclN0YXRlLlVOU1RBUlRFRCAmJiBzdGF0ZSAhPT0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbn1cblxuZnVuY3Rpb24gcGxheWVySXNSZWFkeShwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIpOiBwbGF5ZXIgaXMgUGxheWVyIHtcbiAgcmV0dXJuICdnZXRQbGF5ZXJTdGF0dXMnIGluIHBsYXllcjtcbn1cblxuLyoqIENvbWJpbmVzIHRoZSB0d28gb2JzZXJ2YWJsZXMgdGVtcG9yYXJpbHkgZm9yIHRoZSBmaWx0ZXIgZnVuY3Rpb24uICovXG5mdW5jdGlvbiBmaWx0ZXJPbk90aGVyPFIsIFQ+KFxuICBvdGhlck9iczogT2JzZXJ2YWJsZTxUPixcbiAgZmlsdGVyRm46ICh0OiBULCByPzogUikgPT4gYm9vbGVhbixcbik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxSPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIHdpdGhMYXRlc3RGcm9tKG90aGVyT2JzKSxcbiAgICBmaWx0ZXIoKFt2YWx1ZSwgb3RoZXJdKSA9PiBmaWx0ZXJGbihvdGhlciwgdmFsdWUpKSxcbiAgICBtYXAoKFt2YWx1ZV0pID0+IHZhbHVlKSxcbiAgKTtcbn1cbiJdfQ==