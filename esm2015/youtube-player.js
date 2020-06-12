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
let YouTubePlayer = /** @class */ (() => {
    class YouTubePlayer {
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
    return YouTubePlayer;
})();
export { YouTubePlayer };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgseUVBQXlFO0FBQ3pFLGlDQUFpQztBQUVqQyxPQUFPLEVBRUwsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsS0FBSyxFQUNMLE1BQU0sRUFHTixNQUFNLEVBQ04sU0FBUyxFQUNULGlCQUFpQixFQUNqQixNQUFNLEVBQ04sV0FBVyxHQUNaLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRWxELE9BQU8sRUFDTCxhQUFhLEVBRWIsS0FBSyxFQUVMLFVBQVUsRUFDVixFQUFFLElBQUksWUFBWSxFQUVsQixJQUFJLEVBQ0osT0FBTyxFQUNQLEVBQUUsRUFDRixlQUFlLEVBQ2YsZ0JBQWdCLEdBQ2pCLE1BQU0sTUFBTSxDQUFDO0FBRWQsT0FBTyxFQUNMLGFBQWEsSUFBSSxlQUFlLEVBQ2hDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sT0FBTyxFQUNQLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEVBQ2QsU0FBUyxFQUNULEdBQUcsR0FDSixNQUFNLGdCQUFnQixDQUFDO0FBU3hCLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztBQUN4QyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUM7QUF3QnpDOzs7O0dBSUc7QUFDSDtJQUFBLE1BT2EsYUFBYTtRQXFGeEIsWUFBb0IsT0FBZSxFQUF1QixVQUFrQjtZQUF4RCxZQUFPLEdBQVAsT0FBTyxDQUFRO1lBbEYzQixzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBZSxD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QU8saUJBQWlCLElBQUksTUFBTSxDQUFDO0FBQ3JDLENBQUM7QUFFRCx3RUFBd0U7QUFDeEUsU0FBUyxhQUFhLENBQ3BCLFFBQXVCLEVBQ3ZCLFFBQWtDO0lBRWxDLE9BQU8sSUFBSSxDQUNULGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFDbEQsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQ3hCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIFdvcmthcm91bmQgZm9yOiBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzEyNjVcbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwieW91dHViZVwiIC8+XG5cbmltcG9ydCB7XG4gIEFmdGVyVmlld0luaXQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIEluamVjdCxcbiAgUExBVEZPUk1fSUQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtpc1BsYXRmb3JtQnJvd3Nlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCxcbiAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLFxuICBtZXJnZSxcbiAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLFxuICBPYnNlcnZhYmxlLFxuICBvZiBhcyBvYnNlcnZhYmxlT2YsXG4gIE9wZXJhdG9yRnVuY3Rpb24sXG4gIHBpcGUsXG4gIFN1YmplY3QsXG4gIG9mLFxuICBCZWhhdmlvclN1YmplY3QsXG4gIGZyb21FdmVudFBhdHRlcm4sXG59IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0IGFzIGNvbWJpbmVMYXRlc3RPcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIGZpbHRlcixcbiAgZmxhdE1hcCxcbiAgbWFwLFxuICBwdWJsaXNoLFxuICBzY2FuLFxuICBza2lwV2hpbGUsXG4gIHN0YXJ0V2l0aCxcbiAgdGFrZSxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgc3dpdGNoTWFwLFxuICB0YXAsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBZVDogdHlwZW9mIFlUIHwgdW5kZWZpbmVkO1xuICAgIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX1dJRFRIID0gNjQwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX0hFSUdIVCA9IDM5MDtcblxuLy8gVGhlIG5hdGl2ZSBZVC5QbGF5ZXIgZG9lc24ndCBleHBvc2UgdGhlIHNldCB2aWRlb0lkLCBidXQgd2UgbmVlZCBpdCBmb3Jcbi8vIGNvbnZlbmllbmNlLlxuaW50ZXJmYWNlIFBsYXllciBleHRlbmRzIFlULlBsYXllciB7XG4gIHZpZGVvSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFRoZSBwbGF5ZXIgaXNuJ3QgZnVsbHkgaW5pdGlhbGl6ZWQgd2hlbiBpdCdzIGNvbnN0cnVjdGVkLlxuLy8gVGhlIG9ubHkgZmllbGQgYXZhaWxhYmxlIGlzIGRlc3Ryb3kgYW5kIGFkZEV2ZW50TGlzdGVuZXIuXG50eXBlIFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPSBQaWNrPFBsYXllciwgJ3ZpZGVvSWQnIHwgJ2Rlc3Ryb3knIHwgJ2FkZEV2ZW50TGlzdGVuZXInPjtcblxuLyoqXG4gKiBPYmplY3QgdXNlZCB0byBzdG9yZSB0aGUgc3RhdGUgb2YgdGhlIHBsYXllciBpZiB0aGVcbiAqIHVzZXIgdHJpZXMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgQVBJIGJlZm9yZSBpdCBoYXMgYmVlbiBsb2FkZWQuXG4gKi9cbmludGVyZmFjZSBQZW5kaW5nUGxheWVyU3RhdGUge1xuICBwbGF5YmFja1N0YXRlPzogWVQuUGxheWVyU3RhdGUuUExBWUlORyB8IFlULlBsYXllclN0YXRlLlBBVVNFRCB8IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gIHBsYXliYWNrUmF0ZT86IG51bWJlcjtcbiAgdm9sdW1lPzogbnVtYmVyO1xuICBtdXRlZD86IGJvb2xlYW47XG4gIHNlZWs/OiB7c2Vjb25kczogbnVtYmVyLCBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbn07XG59XG5cbi8qKlxuICogQW5ndWxhciBjb21wb25lbnQgdGhhdCByZW5kZXJzIGEgWW91VHViZSBwbGF5ZXIgdmlhIHRoZSBZb3VUdWJlIHBsYXllclxuICogaWZyYW1lIEFQSS5cbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZVxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICd5b3V0dWJlLXBsYXllcicsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAvLyBUaGlzIGRpdiBpcyAqcmVwbGFjZWQqIGJ5IHRoZSBZb3VUdWJlIHBsYXllciBlbWJlZC5cbiAgdGVtcGxhdGU6ICc8ZGl2ICN5b3V0dWJlQ29udGFpbmVyPjwvZGl2PicsXG59KVxuZXhwb3J0IGNsYXNzIFlvdVR1YmVQbGF5ZXIgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIC8qKiBXaGV0aGVyIHdlJ3JlIGN1cnJlbnRseSByZW5kZXJpbmcgaW5zaWRlIGEgYnJvd3Nlci4gKi9cbiAgcHJpdmF0ZSBfaXNCcm93c2VyOiBib29sZWFuO1xuICBwcml2YXRlIF95b3V0dWJlQ29udGFpbmVyID0gbmV3IFN1YmplY3Q8SFRNTEVsZW1lbnQ+KCk7XG4gIHByaXZhdGUgX2Rlc3Ryb3llZCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gIHByaXZhdGUgX3BsYXllcjogUGxheWVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGVuZGluZ1BsYXllclN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BsYXllckNoYW5nZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFlvdVR1YmUgVmlkZW8gSUQgdG8gdmlldyAqL1xuICBASW5wdXQoKVxuICBnZXQgdmlkZW9JZCgpOiBzdHJpbmcgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fdmlkZW9JZC52YWx1ZTsgfVxuICBzZXQgdmlkZW9JZCh2aWRlb0lkOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl92aWRlb0lkLm5leHQodmlkZW9JZCk7XG4gIH1cbiAgcHJpdmF0ZSBfdmlkZW9JZCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBIZWlnaHQgb2YgdmlkZW8gcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX2hlaWdodC52YWx1ZTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5faGVpZ2h0Lm5leHQoaGVpZ2h0IHx8IERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG4gIH1cbiAgcHJpdmF0ZSBfaGVpZ2h0ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG5cbiAgLyoqIFdpZHRoIG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3dpZHRoLnZhbHVlOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fd2lkdGgubmV4dCh3aWR0aCB8fCBERUZBVUxUX1BMQVlFUl9XSURUSCk7XG4gIH1cbiAgcHJpdmF0ZSBfd2lkdGggPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlcj4oREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdGFydCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdGFydFNlY29uZHMoc3RhcnRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMubmV4dChzdGFydFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgX3N0YXJ0U2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdG9wIHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IGVuZFNlY29uZHMoZW5kU2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5uZXh0KGVuZFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgX2VuZFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIHN1Z2dlc3RlZCBxdWFsaXR5IG9mIHRoZSBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgc2V0IHN1Z2dlc3RlZFF1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5uZXh0KHN1Z2dlc3RlZFF1YWxpdHkpO1xuICB9XG4gIHByaXZhdGUgX3N1Z2dlc3RlZFF1YWxpdHkgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgaWZyYW1lIHdpbGwgYXR0ZW1wdCB0byBsb2FkIHJlZ2FyZGxlc3Mgb2YgdGhlIHN0YXR1cyBvZiB0aGUgYXBpIG9uIHRoZVxuICAgKiBwYWdlLiBTZXQgdGhpcyB0byB0cnVlIGlmIHlvdSBkb24ndCB3YW50IHRoZSBgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHlgIGZpZWxkIHRvIGJlXG4gICAqIHNldCBvbiB0aGUgZ2xvYmFsIHdpbmRvdy5cbiAgICovXG4gIEBJbnB1dCgpIHNob3dCZWZvcmVJZnJhbWVBcGlMb2FkczogYm9vbGVhbiB8IHVuZGVmaW5lZDtcblxuICAvKiogT3V0cHV0cyBhcmUgZGlyZWN0IHByb3hpZXMgZnJvbSB0aGUgcGxheWVyIGl0c2VsZi4gKi9cbiAgQE91dHB1dCgpIHJlYWR5OiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uUmVhZHknKTtcblxuICBAT3V0cHV0KCkgc3RhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25TdGF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+KCdvblN0YXRlQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIGVycm9yOiBPYnNlcnZhYmxlPFlULk9uRXJyb3JFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25FcnJvckV2ZW50Pignb25FcnJvcicpO1xuXG4gIEBPdXRwdXQoKSBhcGlDaGFuZ2U6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25BcGlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcGxheWJhY2tRdWFsaXR5Q2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSBwbGF5YmFja1JhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4oJ29uUGxheWJhY2tSYXRlQ2hhbmdlJyk7XG5cbiAgLyoqIFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSByZXBsYWNlZCBieSB0aGUgaWZyYW1lLiAqL1xuICBAVmlld0NoaWxkKCd5b3V0dWJlQ29udGFpbmVyJylcbiAgeW91dHViZUNvbnRhaW5lcjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfbmdab25lOiBOZ1pvbmUsIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ6IE9iamVjdCkge1xuICAgIHRoaXMuX2lzQnJvd3NlciA9IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgd2UncmUgbm90IGluIGEgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICBpZiAoIXRoaXMuX2lzQnJvd3Nlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4gPSBvYnNlcnZhYmxlT2YodHJ1ZSk7XG4gICAgaWYgKCF3aW5kb3cuWVQpIHtcbiAgICAgIGlmICh0aGlzLnNob3dCZWZvcmVJZnJhbWVBcGlMb2Fkcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05hbWVzcGFjZSBZVCBub3QgZm91bmQsIGNhbm5vdCBjb25zdHJ1Y3QgZW1iZWRkZWQgeW91dHViZSBwbGF5ZXIuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSBpbnN0YWxsIHRoZSBZb3VUdWJlIFBsYXllciBBUEkgUmVmZXJlbmNlIGZvciBpZnJhbWUgRW1iZWRzOiAnICtcbiAgICAgICAgICAgICdodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QgPSBuZXcgU3ViamVjdDxib29sZWFuPigpO1xuICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrID0gd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5O1xuXG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2spIHtcbiAgICAgICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QubmV4dCh0cnVlKSk7XG4gICAgICB9O1xuICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzID0gaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdC5waXBlKHRha2UoMSksIHN0YXJ0V2l0aChmYWxzZSkpO1xuICAgIH1cblxuICAgIC8vIEFuIG9ic2VydmFibGUgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgcGxheWVyLlxuICAgIGNvbnN0IHBsYXllck9icyA9XG4gICAgICBjcmVhdGVQbGF5ZXJPYnNlcnZhYmxlKFxuICAgICAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLFxuICAgICAgICB0aGlzLl92aWRlb0lkLFxuICAgICAgICBpZnJhbWVBcGlBdmFpbGFibGVPYnMsXG4gICAgICAgIHRoaXMuX3dpZHRoLFxuICAgICAgICB0aGlzLl9oZWlnaHQsXG4gICAgICAgIHRoaXMuX25nWm9uZVxuICAgICAgKS5waXBlKHRhcChwbGF5ZXIgPT4ge1xuICAgICAgICAvLyBFbWl0IHRoaXMgYmVmb3JlIHRoZSBgd2FpdFVudGlsUmVhZHlgIGNhbGwgc28gdGhhdCB3ZSBjYW4gYmluZCB0b1xuICAgICAgICAvLyBldmVudHMgdGhhdCBoYXBwZW4gYXMgdGhlIHBsYXllciBpcyBiZWluZyBpbml0aWFsaXplZCAoZS5nLiBgb25SZWFkeWApLlxuICAgICAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLm5leHQocGxheWVyKTtcbiAgICAgIH0pLCB3YWl0VW50aWxSZWFkeShwbGF5ZXIgPT4ge1xuICAgICAgICAvLyBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgbG9hZGluZyB3YXMgYWJvcnRlZCBzbyB0aGF0IHdlIGRvbid0IGVuZCB1cCBsZWFraW5nIG1lbW9yeS5cbiAgICAgICAgaWYgKCFwbGF5ZXJJc1JlYWR5KHBsYXllcikpIHtcbiAgICAgICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9KSwgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZCksIHB1Ymxpc2goKSk7XG5cbiAgICAvLyBTZXQgdXAgc2lkZSBlZmZlY3RzIHRvIGJpbmQgaW5wdXRzIHRvIHRoZSBwbGF5ZXIuXG4gICAgcGxheWVyT2JzLnN1YnNjcmliZShwbGF5ZXIgPT4ge1xuICAgICAgdGhpcy5fcGxheWVyID0gcGxheWVyO1xuXG4gICAgICBpZiAocGxheWVyICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplUGxheWVyKHBsYXllciwgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0gdW5kZWZpbmVkO1xuICAgIH0pO1xuXG4gICAgYmluZFNpemVUb1BsYXllcihwbGF5ZXJPYnMsIHRoaXMuX3dpZHRoLCB0aGlzLl9oZWlnaHQpO1xuXG4gICAgYmluZFN1Z2dlc3RlZFF1YWxpdHlUb1BsYXllcihwbGF5ZXJPYnMsIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkpO1xuXG4gICAgYmluZEN1ZVZpZGVvQ2FsbChcbiAgICAgIHBsYXllck9icyxcbiAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICB0aGlzLl9zdGFydFNlY29uZHMsXG4gICAgICB0aGlzLl9lbmRTZWNvbmRzLFxuICAgICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgIHRoaXMuX2Rlc3Ryb3llZCk7XG5cbiAgICAvLyBBZnRlciBhbGwgb2YgdGhlIHN1YnNjcmlwdGlvbnMgYXJlIHNldCB1cCwgY29ubmVjdCB0aGUgb2JzZXJ2YWJsZS5cbiAgICAocGxheWVyT2JzIGFzIENvbm5lY3RhYmxlT2JzZXJ2YWJsZTxQbGF5ZXI+KS5jb25uZWN0KCk7XG4gIH1cblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgTm8gbG9uZ2VyIGJlaW5nIHVzZWQuIFRvIGJlIHJlbW92ZWQuXG4gICAqIEBicmVha2luZy1jaGFuZ2UgMTEuMC4wXG4gICAqL1xuICBjcmVhdGVFdmVudHNCb3VuZEluWm9uZSgpOiBZVC5FdmVudHMge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLm5leHQodGhpcy55b3V0dWJlQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9IHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaztcbiAgICB9XG5cbiAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fdmlkZW9JZC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2hlaWdodC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3dpZHRoLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkuY29tcGxldGUoKTtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLm5leHQoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQuY29tcGxldGUoKTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwbGF5VmlkZW8gKi9cbiAgcGxheVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wbGF5VmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBMQVlJTkc7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BhdXNlVmlkZW8gKi9cbiAgcGF1c2VWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGF1c2VWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUEFVU0VEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzdG9wVmlkZW8gKi9cbiAgc3RvcFZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zdG9wVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSXQgc2VlbXMgbGlrZSBZb3VUdWJlIHNldHMgdGhlIHBsYXllciB0byBDVUVEIHdoZW4gaXQncyBzdG9wcGVkLlxuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NlZWtUbyAqL1xuICBzZWVrVG8oc2Vjb25kczogbnVtYmVyLCBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZWVrVG8oc2Vjb25kcywgYWxsb3dTZWVrQWhlYWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5zZWVrID0ge3NlY29uZHMsIGFsbG93U2Vla0FoZWFkfTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjbXV0ZSAqL1xuICBtdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5tdXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLm11dGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjdW5NdXRlICovXG4gIHVuTXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIudW5NdXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLm11dGVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2lzTXV0ZWQgKi9cbiAgaXNNdXRlZCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmlzTXV0ZWQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUubXV0ZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NldFZvbHVtZSAqL1xuICBzZXRWb2x1bWUodm9sdW1lOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2V0Vm9sdW1lKHZvbHVtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnZvbHVtZSA9IHZvbHVtZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Vm9sdW1lICovXG4gIGdldFZvbHVtZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Vm9sdW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUudm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUudm9sdW1lO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NldFBsYXliYWNrUmF0ZSAqL1xuICBzZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1JhdGUgPSBwbGF5YmFja1JhdGU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXliYWNrUmF0ZSAqL1xuICBnZXRQbGF5YmFja1JhdGUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXliYWNrUmF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrUmF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrUmF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzICovXG4gIGdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKTogbnVtYmVyW10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbiAqL1xuICBnZXRWaWRlb0xvYWRlZEZyYWN0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0xvYWRlZEZyYWN0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXllclN0YXRlICovXG4gIGdldFBsYXllclN0YXRlKCk6IFlULlBsYXllclN0YXRlIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuX2lzQnJvd3NlciB8fCAhd2luZG93LllUKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEN1cnJlbnRUaW1lICovXG4gIGdldEN1cnJlbnRUaW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRDdXJyZW50VGltZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWspIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlay5zZWNvbmRzO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXliYWNrUXVhbGl0eSAqL1xuICBnZXRQbGF5YmFja1F1YWxpdHkoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFBsYXliYWNrUXVhbGl0eSgpIDogJ2RlZmF1bHQnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMgKi9cbiAgZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHlbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXREdXJhdGlvbiAqL1xuICBnZXREdXJhdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0RHVyYXRpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9VcmwgKi9cbiAgZ2V0VmlkZW9VcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvVXJsKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0VtYmVkQ29kZSAqL1xuICBnZXRWaWRlb0VtYmVkQ29kZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9FbWJlZENvZGUoKSA6ICcnO1xuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JqZWN0IHRoYXQgc2hvdWxkIGJlIHVzZWQgdG8gc3RvcmUgdGhlIHRlbXBvcmFyeSBBUEkgc3RhdGUuICovXG4gIHByaXZhdGUgX2dldFBlbmRpbmdTdGF0ZSgpOiBQZW5kaW5nUGxheWVyU3RhdGUge1xuICAgIGlmICghdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlO1xuICB9XG5cbiAgLyoqIEluaXRpYWxpemVzIGEgcGxheWVyIGZyb20gYSB0ZW1wb3Jhcnkgc3RhdGUuICovXG4gIHByaXZhdGUgX2luaXRpYWxpemVQbGF5ZXIocGxheWVyOiBZVC5QbGF5ZXIsIHN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCB7cGxheWJhY2tTdGF0ZSwgcGxheWJhY2tSYXRlLCB2b2x1bWUsIG11dGVkLCBzZWVrfSA9IHN0YXRlO1xuXG4gICAgc3dpdGNoIChwbGF5YmFja1N0YXRlKSB7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLlBMQVlJTkc6IHBsYXllci5wbGF5VmlkZW8oKTsgYnJlYWs7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLlBBVVNFRDogcGxheWVyLnBhdXNlVmlkZW8oKTsgYnJlYWs7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLkNVRUQ6IHBsYXllci5zdG9wVmlkZW8oKTsgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHBsYXliYWNrUmF0ZSAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfVxuXG4gICAgaWYgKHZvbHVtZSAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2V0Vm9sdW1lKHZvbHVtZSk7XG4gICAgfVxuXG4gICAgaWYgKG11dGVkICE9IG51bGwpIHtcbiAgICAgIG11dGVkID8gcGxheWVyLm11dGUoKSA6IHBsYXllci51bk11dGUoKTtcbiAgICB9XG5cbiAgICBpZiAoc2VlayAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2Vla1RvKHNlZWsuc2Vjb25kcywgc2Vlay5hbGxvd1NlZWtBaGVhZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JzZXJ2YWJsZSB0aGF0IGFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgdG8gdGhlIHBsYXllciB3aGVuIGEgdXNlciBzdWJzY3JpYmVzIHRvIGl0LiAqL1xuICBwcml2YXRlIF9nZXRMYXp5RW1pdHRlcjxUIGV4dGVuZHMgWVQuUGxheWVyRXZlbnQ+KG5hbWU6IGtleW9mIFlULkV2ZW50cyk6IE9ic2VydmFibGU8VD4ge1xuICAgIC8vIFN0YXJ0IHdpdGggdGhlIHN0cmVhbSBvZiBwbGF5ZXJzLiBUaGlzIHdheSB0aGUgZXZlbnRzIHdpbGwgYmUgdHJhbnNmZXJyZWRcbiAgICAvLyBvdmVyIHRvIHRoZSBuZXcgcGxheWVyIGlmIGl0IGdldHMgc3dhcHBlZCBvdXQgdW5kZXItdGhlLWhvb2QuXG4gICAgcmV0dXJuIHRoaXMuX3BsYXllckNoYW5nZXMucGlwZShcbiAgICAgIC8vIFN3aXRjaCB0byB0aGUgYm91bmQgZXZlbnQuIGBzd2l0Y2hNYXBgIGVuc3VyZXMgdGhhdCB0aGUgb2xkIGV2ZW50IGlzIHJlbW92ZWQgd2hlbiB0aGVcbiAgICAgIC8vIHBsYXllciBpcyBjaGFuZ2VkLiBJZiB0aGVyZSdzIG5vIHBsYXllciwgcmV0dXJuIGFuIG9ic2VydmFibGUgdGhhdCBuZXZlciBlbWl0cy5cbiAgICAgIHN3aXRjaE1hcChwbGF5ZXIgPT4ge1xuICAgICAgICByZXR1cm4gcGxheWVyID8gZnJvbUV2ZW50UGF0dGVybjxUPigobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgfSwgKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICAvLyBUaGUgQVBJIHNlZW1zIHRvIHRocm93IHdoZW4gd2UgdHJ5IHRvIHVuYmluZCBmcm9tIGEgZGVzdHJveWVkIHBsYXllciBhbmQgaXQgZG9lc24ndFxuICAgICAgICAgIC8vIGV4cG9zZSB3aGV0aGVyIHRoZSBwbGF5ZXIgaGFzIGJlZW4gZGVzdHJveWVkIHNvIHdlIGhhdmUgdG8gd3JhcCBpdCBpbiBhIHRyeS9jYXRjaCB0b1xuICAgICAgICAgIC8vIHByZXZlbnQgdGhlIGVudGlyZSBzdHJlYW0gZnJvbSBlcnJvcmluZyBvdXQuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICgocGxheWVyIGFzIFBsYXllcikucmVtb3ZlRXZlbnRMaXN0ZW5lciEpIHtcbiAgICAgICAgICAgICAgKHBsYXllciBhcyBQbGF5ZXIpLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgfSkgOiBvYnNlcnZhYmxlT2Y8VD4oKTtcbiAgICAgIH0pLFxuICAgICAgLy8gQnkgZGVmYXVsdCB3ZSBydW4gYWxsIHRoZSBBUEkgaW50ZXJhY3Rpb25zIG91dHNpZGUgdGhlIHpvbmVcbiAgICAgIC8vIHNvIHdlIGhhdmUgdG8gYnJpbmcgdGhlIGV2ZW50cyBiYWNrIGluIG1hbnVhbGx5IHdoZW4gdGhleSBlbWl0LlxuICAgICAgKHNvdXJjZTogT2JzZXJ2YWJsZTxUPikgPT4gbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT4gc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICBlcnJvcjogZXJyb3IgPT4gb2JzZXJ2ZXIuZXJyb3IoZXJyb3IpLFxuICAgICAgICBjb21wbGV0ZTogKCkgPT4gb2JzZXJ2ZXIuY29tcGxldGUoKVxuICAgICAgfSkpLFxuICAgICAgLy8gRW5zdXJlcyB0aGF0IGV2ZXJ5dGhpbmcgaXMgY2xlYXJlZCBvdXQgb24gZGVzdHJveS5cbiAgICAgIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpXG4gICAgKTtcbiAgfVxufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIHRvIHRoZSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0IGFuZCBzZXRzIGl0IG9uIHRoZSBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU2l6ZVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgd2lkdGhPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgaGVpZ2h0T2JzOiBPYnNlcnZhYmxlPG51bWJlcj5cbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB3aWR0aE9icywgaGVpZ2h0T2JzXSlcbiAgICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHdpZHRoLCBoZWlnaHRdKSA9PiBwbGF5ZXIgJiYgcGxheWVyLnNldFNpemUod2lkdGgsIGhlaWdodCkpO1xufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIGZyb20gdGhlIHN1Z2dlc3RlZCBxdWFsaXR5IGFuZCBzZXRzIGl0IG9uIHRoZSBnaXZlbiBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW1xuICAgIHBsYXllck9icyxcbiAgICBzdWdnZXN0ZWRRdWFsaXR5T2JzXG4gIF0pLnN1YnNjcmliZShcbiAgICAoW3BsYXllciwgc3VnZ2VzdGVkUXVhbGl0eV0pID0+XG4gICAgICAgIHBsYXllciAmJiBzdWdnZXN0ZWRRdWFsaXR5ICYmIHBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBsb2FkZWQgcGxheWVyIG9uY2UgaXQncyByZWFkeS4gQ2VydGFpbiBwcm9wZXJ0aWVzL21ldGhvZHNcbiAqIHdvbid0IGJlIGF2YWlsYWJsZSB1bnRpbCB0aGUgaWZyYW1lIGZpbmlzaGVzIGxvYWRpbmcuXG4gKiBAcGFyYW0gb25BYm9ydCBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgaW52b2tlZCBpZiB0aGUgcGxheWVyIGxvYWRpbmcgd2FzIGFib3J0ZWQgYmVmb3JlXG4gKiBpdCB3YXMgYWJsZSB0byBjb21wbGV0ZS4gQ2FuIGJlIHVzZWQgdG8gY2xlYW4gdXAgYW55IGxvb3NlIHJlZmVyZW5jZXMuXG4gKi9cbmZ1bmN0aW9uIHdhaXRVbnRpbFJlYWR5KG9uQWJvcnQ6IChwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIpID0+IHZvaWQpOlxuICBPcGVyYXRvckZ1bmN0aW9uPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsIFBsYXllciB8IHVuZGVmaW5lZD4ge1xuICByZXR1cm4gZmxhdE1hcChwbGF5ZXIgPT4ge1xuICAgIGlmICghcGxheWVyKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mPFBsYXllcnx1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChwbGF5ZXJJc1JlYWR5KHBsYXllcikpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2YocGxheWVyIGFzIFBsYXllcik7XG4gICAgfVxuXG4gICAgLy8gU2luY2UgcmVtb3ZlRXZlbnRMaXN0ZW5lciBpcyBub3Qgb24gUGxheWVyIHdoZW4gaXQncyBpbml0aWFsaXplZCwgd2UgY2FuJ3QgdXNlIGZyb21FdmVudC5cbiAgICAvLyBUaGUgcGxheWVyIGlzIG5vdCBpbml0aWFsaXplZCBmdWxseSB1bnRpbCB0aGUgcmVhZHkgaXMgY2FsbGVkLlxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQbGF5ZXI+KGVtaXR0ZXIgPT4ge1xuICAgICAgbGV0IGFib3J0ZWQgPSBmYWxzZTtcbiAgICAgIGxldCByZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgY29uc3Qgb25SZWFkeSA9IChldmVudDogWVQuUGxheWVyRXZlbnQpID0+IHtcbiAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmICghYWJvcnRlZCkge1xuICAgICAgICAgIGV2ZW50LnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgb25SZWFkeSk7XG4gICAgICAgICAgZW1pdHRlci5uZXh0KGV2ZW50LnRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgb25SZWFkeSk7XG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGFib3J0ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgICBvbkFib3J0KHBsYXllcik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgodW5kZWZpbmVkKSk7XG4gIH0pO1xufVxuXG4vKiogQ3JlYXRlIGFuIG9ic2VydmFibGUgZm9yIHRoZSBwbGF5ZXIgYmFzZWQgb24gdGhlIGdpdmVuIG9wdGlvbnMuICovXG5mdW5jdGlvbiBjcmVhdGVQbGF5ZXJPYnNlcnZhYmxlKFxuICB5b3V0dWJlQ29udGFpbmVyOiBPYnNlcnZhYmxlPEhUTUxFbGVtZW50PixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBuZ1pvbmU6IE5nWm9uZVxuKTogT2JzZXJ2YWJsZTxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkPiB7XG5cbiAgY29uc3QgcGxheWVyT3B0aW9ucyA9XG4gICAgdmlkZW9JZE9ic1xuICAgIC5waXBlKFxuICAgICAgd2l0aExhdGVzdEZyb20oY29tYmluZUxhdGVzdChbd2lkdGhPYnMsIGhlaWdodE9ic10pKSxcbiAgICAgIG1hcCgoW3ZpZGVvSWQsIFt3aWR0aCwgaGVpZ2h0XV0pID0+IHZpZGVvSWQgPyAoe3ZpZGVvSWQsIHdpZHRoLCBoZWlnaHR9KSA6IHVuZGVmaW5lZCksXG4gICAgKTtcblxuICByZXR1cm4gY29tYmluZUxhdGVzdChbeW91dHViZUNvbnRhaW5lciwgcGxheWVyT3B0aW9ucywgb2Yobmdab25lKV0pXG4gICAgICAucGlwZShcbiAgICAgICAgc2tpcFVudGlsUmVtZW1iZXJMYXRlc3QoaWZyYW1lQXBpQXZhaWxhYmxlT2JzKSxcbiAgICAgICAgc2NhbihzeW5jUGxheWVyU3RhdGUsIHVuZGVmaW5lZCksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCkpO1xufVxuXG4vKiogU2tpcHMgdGhlIGdpdmVuIG9ic2VydmFibGUgdW50aWwgdGhlIG90aGVyIG9ic2VydmFibGUgZW1pdHMgdHJ1ZSwgdGhlbiBlbWl0IHRoZSBsYXRlc3QuICovXG5mdW5jdGlvbiBza2lwVW50aWxSZW1lbWJlckxhdGVzdDxUPihub3RpZmllcjogT2JzZXJ2YWJsZTxib29sZWFuPik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIGNvbWJpbmVMYXRlc3RPcChub3RpZmllciksXG4gICAgc2tpcFdoaWxlKChbXywgZG9uZVNraXBwaW5nXSkgPT4gIWRvbmVTa2lwcGluZyksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSkpO1xufVxuXG4vKiogRGVzdHJveSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBubyBvcHRpb25zLCBvciBjcmVhdGUgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIHN5bmNQbGF5ZXJTdGF0ZShcbiAgcGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLFxuICBbY29udGFpbmVyLCB2aWRlb09wdGlvbnMsIG5nWm9uZV06IFtIVE1MRWxlbWVudCwgWVQuUGxheWVyT3B0aW9ucyB8IHVuZGVmaW5lZCwgTmdab25lXSxcbik6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQge1xuICBpZiAoIXZpZGVvT3B0aW9ucykge1xuICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBpZiAocGxheWVyKSB7XG4gICAgcmV0dXJuIHBsYXllcjtcbiAgfVxuXG4gIC8vIEltcG9ydGFudCEgV2UgbmVlZCB0byBjcmVhdGUgdGhlIFBsYXllciBvYmplY3Qgb3V0c2lkZSBvZiB0aGUgYE5nWm9uZWAsIGJlY2F1c2UgaXQga2lja3NcbiAgLy8gb2ZmIGEgMjUwbXMgc2V0SW50ZXJ2YWwgd2hpY2ggd2lsbCBjb250aW51YWxseSB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gaWYgd2UgZG9uJ3QuXG4gIGNvbnN0IG5ld1BsYXllcjogVW5pbml0aWFsaXplZFBsYXllciA9XG4gICAgICBuZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gbmV3IFlULlBsYXllcihjb250YWluZXIsIHZpZGVvT3B0aW9ucykpO1xuICAvLyBCaW5kIHZpZGVvSWQgZm9yIGZ1dHVyZSB1c2UuXG4gIG5ld1BsYXllci52aWRlb0lkID0gdmlkZW9PcHRpb25zLnZpZGVvSWQ7XG4gIHJldHVybiBuZXdQbGF5ZXI7XG59XG5cbi8qKlxuICogQ2FsbCBjdWVWaWRlb0J5SWQgaWYgdGhlIHZpZGVvSWQgY2hhbmdlcywgb3Igd2hlbiBzdGFydCBvciBlbmQgc2Vjb25kcyBjaGFuZ2UuIGN1ZVZpZGVvQnlJZCB3aWxsXG4gKiBjaGFuZ2UgdGhlIGxvYWRlZCB2aWRlbyBpZCB0byB0aGUgZ2l2ZW4gdmlkZW9JZCwgYW5kIHNldCB0aGUgc3RhcnQgYW5kIGVuZCB0aW1lcyB0byB0aGUgZ2l2ZW5cbiAqIHN0YXJ0L2VuZCBzZWNvbmRzLlxuICovXG5mdW5jdGlvbiBiaW5kQ3VlVmlkZW9DYWxsKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8UGxheWVyIHwgdW5kZWZpbmVkPixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBzdGFydFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgZW5kU2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4sXG4gIGRlc3Ryb3llZDogT2JzZXJ2YWJsZTx2b2lkPixcbikge1xuICBjb25zdCBjdWVPcHRpb25zT2JzID0gY29tYmluZUxhdGVzdChbc3RhcnRTZWNvbmRzT2JzLCBlbmRTZWNvbmRzT2JzXSlcbiAgICAucGlwZShtYXAoKFtzdGFydFNlY29uZHMsIGVuZFNlY29uZHNdKSA9PiAoe3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc30pKSk7XG5cbiAgLy8gT25seSByZXNwb25kIHRvIGNoYW5nZXMgaW4gY3VlIG9wdGlvbnMgaWYgdGhlIHBsYXllciBpcyBub3QgcnVubmluZy5cbiAgY29uc3QgZmlsdGVyZWRDdWVPcHRpb25zID0gY3VlT3B0aW9uc09ic1xuICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCBwbGF5ZXIgPT4gISFwbGF5ZXIgJiYgIWhhc1BsYXllclN0YXJ0ZWQocGxheWVyKSkpO1xuXG4gIC8vIElmIHRoZSB2aWRlbyBpZCBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZSBwbGF5ZXJcbiAgLy8gd2FzIGluaXRpYWxpemVkIHdpdGggYSBkaWZmZXJlbnQgdmlkZW8gaWQuXG4gIGNvbnN0IGNoYW5nZWRWaWRlb0lkID0gdmlkZW9JZE9ic1xuICAgICAgLnBpcGUoZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIChwbGF5ZXIsIHZpZGVvSWQpID0+ICEhcGxheWVyICYmIHBsYXllci52aWRlb0lkICE9PSB2aWRlb0lkKSk7XG5cbiAgLy8gSWYgdGhlIHBsYXllciBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZXJlIGFyZSBjdWUgb3B0aW9ucy5cbiAgY29uc3QgY2hhbmdlZFBsYXllciA9IHBsYXllck9icy5waXBlKFxuICAgIGZpbHRlck9uT3RoZXIoXG4gICAgICBjb21iaW5lTGF0ZXN0KFt2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzXSksXG4gICAgICAoW3ZpZGVvSWQsIGN1ZU9wdGlvbnNdLCBwbGF5ZXIpID0+XG4gICAgICAgICAgISFwbGF5ZXIgJiZcbiAgICAgICAgICAgICh2aWRlb0lkICE9IHBsYXllci52aWRlb0lkIHx8ICEhY3VlT3B0aW9ucy5zdGFydFNlY29uZHMgfHwgISFjdWVPcHRpb25zLmVuZFNlY29uZHMpKSk7XG5cbiAgbWVyZ2UoY2hhbmdlZFBsYXllciwgY2hhbmdlZFZpZGVvSWQsIGZpbHRlcmVkQ3VlT3B0aW9ucylcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgdmlkZW9JZE9icywgY3VlT3B0aW9uc09icywgc3VnZ2VzdGVkUXVhbGl0eU9ic10pKSxcbiAgICAgIG1hcCgoW18sIHZhbHVlc10pID0+IHZhbHVlcyksXG4gICAgICB0YWtlVW50aWwoZGVzdHJveWVkKSxcbiAgICApXG4gICAgLnN1YnNjcmliZSgoW3BsYXllciwgdmlkZW9JZCwgY3VlT3B0aW9ucywgc3VnZ2VzdGVkUXVhbGl0eV0pID0+IHtcbiAgICAgIGlmICghdmlkZW9JZCB8fCAhcGxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBsYXllci52aWRlb0lkID0gdmlkZW9JZDtcbiAgICAgIHBsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkLFxuICAgICAgICBzdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgICAuLi5jdWVPcHRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGhhc1BsYXllclN0YXJ0ZWQocGxheWVyOiBZVC5QbGF5ZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSBwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgcmV0dXJuIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQgJiYgc3RhdGUgIT09IFlULlBsYXllclN0YXRlLkNVRUQ7XG59XG5cbmZ1bmN0aW9uIHBsYXllcklzUmVhZHkocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKTogcGxheWVyIGlzIFBsYXllciB7XG4gIHJldHVybiAnZ2V0UGxheWVyU3RhdHVzJyBpbiBwbGF5ZXI7XG59XG5cbi8qKiBDb21iaW5lcyB0aGUgdHdvIG9ic2VydmFibGVzIHRlbXBvcmFyaWx5IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uLiAqL1xuZnVuY3Rpb24gZmlsdGVyT25PdGhlcjxSLCBUPihcbiAgb3RoZXJPYnM6IE9ic2VydmFibGU8VD4sXG4gIGZpbHRlckZuOiAodDogVCwgcj86IFIpID0+IGJvb2xlYW4sXG4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248Uj4ge1xuICByZXR1cm4gcGlwZShcbiAgICB3aXRoTGF0ZXN0RnJvbShvdGhlck9icyksXG4gICAgZmlsdGVyKChbdmFsdWUsIG90aGVyXSkgPT4gZmlsdGVyRm4ob3RoZXIsIHZhbHVlKSksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSksXG4gICk7XG59XG4iXX0=