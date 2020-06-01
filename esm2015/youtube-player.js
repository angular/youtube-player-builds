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
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, switchMap, } from 'rxjs/operators';
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
            const playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this._ngZone).pipe(waitUntilReady(player => {
                // Destroy the player if loading was aborted so that we don't end up leaking memory.
                if (!playerIsReady(player)) {
                    player.destroy();
                }
            }), takeUntil(this._destroyed), publish());
            // Set up side effects to bind inputs to the player.
            playerObs.subscribe(player => {
                this._player = player;
                this._playerChanges.next(player);
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
                        player.removeEventListener(name, listener);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgseUVBQXlFO0FBQ3pFLGlDQUFpQztBQUVqQyxPQUFPLEVBRUwsdUJBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsS0FBSyxFQUNMLE1BQU0sRUFHTixNQUFNLEVBQ04sU0FBUyxFQUNULGlCQUFpQixFQUNqQixNQUFNLEVBQ04sV0FBVyxHQUNaLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRWxELE9BQU8sRUFDTCxhQUFhLEVBRWIsS0FBSyxFQUVMLFVBQVUsRUFDVixFQUFFLElBQUksWUFBWSxFQUVsQixJQUFJLEVBQ0osT0FBTyxFQUNQLEVBQUUsRUFDRixlQUFlLEVBQ2YsZ0JBQWdCLEdBQ2pCLE1BQU0sTUFBTSxDQUFDO0FBRWQsT0FBTyxFQUNMLGFBQWEsSUFBSSxlQUFlLEVBQ2hDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sT0FBTyxFQUNQLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEVBQ2QsU0FBUyxHQUNWLE1BQU0sZ0JBQWdCLENBQUM7QUFTeEIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztBQXdCekM7Ozs7R0FJRztBQUNIO0lBQUEsTUFPYSxhQUFhO1FBcUZ4QixZQUFvQixPQUFlLEVBQXVCLFVBQWtCO1lBQXhELFlBQU8sR0FBUCxPQUFPLENBQVE7WUFsRjNCLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUFlLENBQUM7WUFDL0Ms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QUFDLEVBQ3hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQ2xELEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUN4QixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBXb3JrYXJvdW5kIGZvcjogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy8xMjY1XG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cInlvdXR1YmVcIiAvPlxuXG5pbXBvcnQge1xuICBBZnRlclZpZXdJbml0LFxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3V0cHV0LFxuICBWaWV3Q2hpbGQsXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxuICBJbmplY3QsXG4gIFBMQVRGT1JNX0lELFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7aXNQbGF0Zm9ybUJyb3dzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QsXG4gIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSxcbiAgbWVyZ2UsXG4gIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbixcbiAgT2JzZXJ2YWJsZSxcbiAgb2YgYXMgb2JzZXJ2YWJsZU9mLFxuICBPcGVyYXRvckZ1bmN0aW9uLFxuICBwaXBlLFxuICBTdWJqZWN0LFxuICBvZixcbiAgQmVoYXZpb3JTdWJqZWN0LFxuICBmcm9tRXZlbnRQYXR0ZXJuLFxufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCBhcyBjb21iaW5lTGF0ZXN0T3AsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBmaWx0ZXIsXG4gIGZsYXRNYXAsXG4gIG1hcCxcbiAgcHVibGlzaCxcbiAgc2NhbixcbiAgc2tpcFdoaWxlLFxuICBzdGFydFdpdGgsXG4gIHRha2UsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIHN3aXRjaE1hcCxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFlUOiB0eXBlb2YgWVQgfCB1bmRlZmluZWQ7XG4gICAgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfV0lEVEggPSA2NDA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfSEVJR0hUID0gMzkwO1xuXG4vLyBUaGUgbmF0aXZlIFlULlBsYXllciBkb2Vzbid0IGV4cG9zZSB0aGUgc2V0IHZpZGVvSWQsIGJ1dCB3ZSBuZWVkIGl0IGZvclxuLy8gY29udmVuaWVuY2UuXG5pbnRlcmZhY2UgUGxheWVyIGV4dGVuZHMgWVQuUGxheWVyIHtcbiAgdmlkZW9JZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cblxuLy8gVGhlIHBsYXllciBpc24ndCBmdWxseSBpbml0aWFsaXplZCB3aGVuIGl0J3MgY29uc3RydWN0ZWQuXG4vLyBUaGUgb25seSBmaWVsZCBhdmFpbGFibGUgaXMgZGVzdHJveSBhbmQgYWRkRXZlbnRMaXN0ZW5lci5cbnR5cGUgVW5pbml0aWFsaXplZFBsYXllciA9IFBpY2s8UGxheWVyLCAndmlkZW9JZCcgfCAnZGVzdHJveScgfCAnYWRkRXZlbnRMaXN0ZW5lcic+O1xuXG4vKipcbiAqIE9iamVjdCB1c2VkIHRvIHN0b3JlIHRoZSBzdGF0ZSBvZiB0aGUgcGxheWVyIGlmIHRoZVxuICogdXNlciB0cmllcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBBUEkgYmVmb3JlIGl0IGhhcyBiZWVuIGxvYWRlZC5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gIHBsYXliYWNrU3RhdGU/OiBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HIHwgWVQuUGxheWVyU3RhdGUuUEFVU0VEIHwgWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgcGxheWJhY2tSYXRlPzogbnVtYmVyO1xuICB2b2x1bWU/OiBudW1iZXI7XG4gIG11dGVkPzogYm9vbGVhbjtcbiAgc2Vlaz86IHtzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFufTtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNvbXBvbmVudCB0aGF0IHJlbmRlcnMgYSBZb3VUdWJlIHBsYXllciB2aWEgdGhlIFlvdVR1YmUgcGxheWVyXG4gKiBpZnJhbWUgQVBJLlxuICogQHNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3lvdXR1YmUtcGxheWVyJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIC8vIFRoaXMgZGl2IGlzICpyZXBsYWNlZCogYnkgdGhlIFlvdVR1YmUgcGxheWVyIGVtYmVkLlxuICB0ZW1wbGF0ZTogJzxkaXYgI3lvdXR1YmVDb250YWluZXI+PC9kaXY+Jyxcbn0pXG5leHBvcnQgY2xhc3MgWW91VHViZVBsYXllciBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgLyoqIFdoZXRoZXIgd2UncmUgY3VycmVudGx5IHJlbmRlcmluZyBpbnNpZGUgYSBicm93c2VyLiAqL1xuICBwcml2YXRlIF9pc0Jyb3dzZXI6IGJvb2xlYW47XG4gIHByaXZhdGUgX3lvdXR1YmVDb250YWluZXIgPSBuZXcgU3ViamVjdDxIVE1MRWxlbWVudD4oKTtcbiAgcHJpdmF0ZSBfZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSBfcGxheWVyOiBQbGF5ZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjazogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wZW5kaW5nUGxheWVyU3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGxheWVyQ2hhbmdlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8UGxheWVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBZb3VUdWJlIFZpZGVvIElEIHRvIHZpZXcgKi9cbiAgQElucHV0KClcbiAgZ2V0IHZpZGVvSWQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3ZpZGVvSWQudmFsdWU7IH1cbiAgc2V0IHZpZGVvSWQodmlkZW9JZDogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fdmlkZW9JZC5uZXh0KHZpZGVvSWQpO1xuICB9XG4gIHByaXZhdGUgX3ZpZGVvSWQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZyB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogSGVpZ2h0IG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl9oZWlnaHQudmFsdWU7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodC5uZXh0KGhlaWdodCB8fCBERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuICB9XG4gIHByaXZhdGUgX2hlaWdodCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl93aWR0aC52YWx1ZTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3dpZHRoLm5leHQod2lkdGggfHwgREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuICB9XG4gIHByaXZhdGUgX3dpZHRoID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX1dJRFRIKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RhcnQgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgc3RhcnRTZWNvbmRzKHN0YXJ0U2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLm5leHQoc3RhcnRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIF9zdGFydFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RvcCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBlbmRTZWNvbmRzKGVuZFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2VuZFNlY29uZHMubmV4dChlbmRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIF9lbmRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBvZiB0aGUgcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdWdnZXN0ZWRRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkubmV4dChzdWdnZXN0ZWRRdWFsaXR5KTtcbiAgfVxuICBwcml2YXRlIF9zdWdnZXN0ZWRRdWFsaXR5ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGlmcmFtZSB3aWxsIGF0dGVtcHQgdG8gbG9hZCByZWdhcmRsZXNzIG9mIHRoZSBzdGF0dXMgb2YgdGhlIGFwaSBvbiB0aGVcbiAgICogcGFnZS4gU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3UgZG9uJ3Qgd2FudCB0aGUgYG9uWW91VHViZUlmcmFtZUFQSVJlYWR5YCBmaWVsZCB0byBiZVxuICAgKiBzZXQgb24gdGhlIGdsb2JhbCB3aW5kb3cuXG4gICAqL1xuICBASW5wdXQoKSBzaG93QmVmb3JlSWZyYW1lQXBpTG9hZHM6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqIE91dHB1dHMgYXJlIGRpcmVjdCBwcm94aWVzIGZyb20gdGhlIHBsYXllciBpdHNlbGYuICovXG4gIEBPdXRwdXQoKSByZWFkeTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvblJlYWR5Jyk7XG5cbiAgQE91dHB1dCgpIHN0YXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50Pignb25TdGF0ZUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSBlcnJvcjogT2JzZXJ2YWJsZTxZVC5PbkVycm9yRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uRXJyb3JFdmVudD4oJ29uRXJyb3InKTtcblxuICBAT3V0cHV0KCkgYXBpQ2hhbmdlOiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uQXBpQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHBsYXliYWNrUXVhbGl0eUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcGxheWJhY2tSYXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUmF0ZUNoYW5nZScpO1xuXG4gIC8qKiBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgcmVwbGFjZWQgYnkgdGhlIGlmcmFtZS4gKi9cbiAgQFZpZXdDaGlsZCgneW91dHViZUNvbnRhaW5lcicpXG4gIHlvdXR1YmVDb250YWluZXI6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX25nWm9uZTogTmdab25lLCBASW5qZWN0KFBMQVRGT1JNX0lEKSBwbGF0Zm9ybUlkOiBPYmplY3QpIHtcbiAgICB0aGlzLl9pc0Jyb3dzZXIgPSBpc1BsYXRmb3JtQnJvd3NlcihwbGF0Zm9ybUlkKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIHdlJ3JlIG5vdCBpbiBhIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+ID0gb2JzZXJ2YWJsZU9mKHRydWUpO1xuICAgIGlmICghd2luZG93LllUKSB7XG4gICAgICBpZiAodGhpcy5zaG93QmVmb3JlSWZyYW1lQXBpTG9hZHMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOYW1lc3BhY2UgWVQgbm90IGZvdW5kLCBjYW5ub3QgY29uc3RydWN0IGVtYmVkZGVkIHlvdXR1YmUgcGxheWVyLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgaW5zdGFsbCB0aGUgWW91VHViZSBQbGF5ZXIgQVBJIFJlZmVyZW5jZSBmb3IgaWZyYW1lIEVtYmVkczogJyArXG4gICAgICAgICAgICAnaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8Ym9vbGVhbj4oKTtcbiAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjayA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblxuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbmdab25lLnJ1bigoKSA9PiBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0Lm5leHQodHJ1ZSkpO1xuICAgICAgfTtcbiAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyA9IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgoZmFsc2UpKTtcbiAgICB9XG5cbiAgICAvLyBBbiBvYnNlcnZhYmxlIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHBsYXllci5cbiAgICBjb25zdCBwbGF5ZXJPYnMgPVxuICAgICAgY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgICAgICAgdGhpcy5feW91dHViZUNvbnRhaW5lcixcbiAgICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzLFxuICAgICAgICB0aGlzLl93aWR0aCxcbiAgICAgICAgdGhpcy5faGVpZ2h0LFxuICAgICAgICB0aGlzLl9uZ1pvbmVcbiAgICAgICkucGlwZSh3YWl0VW50aWxSZWFkeShwbGF5ZXIgPT4ge1xuICAgICAgICAvLyBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgbG9hZGluZyB3YXMgYWJvcnRlZCBzbyB0aGF0IHdlIGRvbid0IGVuZCB1cCBsZWFraW5nIG1lbW9yeS5cbiAgICAgICAgaWYgKCFwbGF5ZXJJc1JlYWR5KHBsYXllcikpIHtcbiAgICAgICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9KSwgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZCksIHB1Ymxpc2goKSk7XG5cbiAgICAvLyBTZXQgdXAgc2lkZSBlZmZlY3RzIHRvIGJpbmQgaW5wdXRzIHRvIHRoZSBwbGF5ZXIuXG4gICAgcGxheWVyT2JzLnN1YnNjcmliZShwbGF5ZXIgPT4ge1xuICAgICAgdGhpcy5fcGxheWVyID0gcGxheWVyO1xuICAgICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5uZXh0KHBsYXllcik7XG5cbiAgICAgIGlmIChwbGF5ZXIgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVQbGF5ZXIocGxheWVyLCB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICBiaW5kU2l6ZVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG5cbiAgICBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSk7XG5cbiAgICBiaW5kQ3VlVmlkZW9DYWxsKFxuICAgICAgcGxheWVyT2JzLFxuICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgIHRoaXMuX3N0YXJ0U2Vjb25kcyxcbiAgICAgIHRoaXMuX2VuZFNlY29uZHMsXG4gICAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgdGhpcy5fZGVzdHJveWVkKTtcblxuICAgIC8vIEFmdGVyIGFsbCBvZiB0aGUgc3Vic2NyaXB0aW9ucyBhcmUgc2V0IHVwLCBjb25uZWN0IHRoZSBvYnNlcnZhYmxlLlxuICAgIChwbGF5ZXJPYnMgYXMgQ29ubmVjdGFibGVPYnNlcnZhYmxlPFBsYXllcj4pLmNvbm5lY3QoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCBObyBsb25nZXIgYmVpbmcgdXNlZC4gVG8gYmUgcmVtb3ZlZC5cbiAgICogQGJyZWFraW5nLWNoYW5nZSAxMS4wLjBcbiAgICovXG4gIGNyZWF0ZUV2ZW50c0JvdW5kSW5ab25lKCk6IFlULkV2ZW50cyB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgbmdBZnRlclZpZXdJbml0KCkge1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIubmV4dCh0aGlzLnlvdXR1YmVDb250YWluZXIubmF0aXZlRWxlbWVudCk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrO1xuICAgIH1cblxuICAgIHRoaXMuX3BsYXllckNoYW5nZXMuY29tcGxldGUoKTtcbiAgICB0aGlzLl92aWRlb0lkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5faGVpZ2h0LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fd2lkdGguY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIuY29tcGxldGUoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5jb21wbGV0ZSgpO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BsYXlWaWRlbyAqL1xuICBwbGF5VmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBsYXlWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUExBWUlORztcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGF1c2VWaWRlbyAqL1xuICBwYXVzZVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3N0b3BWaWRlbyAqL1xuICBzdG9wVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnN0b3BWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJdCBzZWVtcyBsaWtlIFlvdVR1YmUgc2V0cyB0aGUgcGxheWVyIHRvIENVRUQgd2hlbiBpdCdzIHN0b3BwZWQuXG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2Vla1RvICovXG4gIHNlZWtUbyhzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNlZWtUbyhzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnNlZWsgPSB7c2Vjb25kcywgYWxsb3dTZWVrQWhlYWR9O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNtdXRlICovXG4gIG11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLm11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSN1bk11dGUgKi9cbiAgdW5NdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci51bk11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjaXNNdXRlZCAqL1xuICBpc011dGVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuaXNNdXRlZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5tdXRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0Vm9sdW1lICovXG4gIHNldFZvbHVtZSh2b2x1bWU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkudm9sdW1lID0gdm9sdW1lO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWb2x1bWUgKi9cbiAgZ2V0Vm9sdW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRWb2x1bWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0UGxheWJhY2tSYXRlICovXG4gIHNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrUmF0ZSA9IHBsYXliYWNrUmF0ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tSYXRlICovXG4gIGdldFBsYXliYWNrUmF0ZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tSYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMgKi9cbiAgZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0xvYWRlZEZyYWN0aW9uICovXG4gIGdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWVyU3RhdGUgKi9cbiAgZ2V0UGxheWVyU3RhdGUoKTogWVQuUGxheWVyU3RhdGUgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5faXNCcm93c2VyIHx8ICF3aW5kb3cuWVQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlO1xuICAgIH1cblxuICAgIHJldHVybiBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQ7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Q3VycmVudFRpbWUgKi9cbiAgZ2V0Q3VycmVudFRpbWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldEN1cnJlbnRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlaykge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrLnNlY29uZHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tRdWFsaXR5ICovXG4gIGdldFBsYXliYWNrUXVhbGl0eSgpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tRdWFsaXR5KCkgOiAnZGVmYXVsdCc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscyAqL1xuICBnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldER1cmF0aW9uICovXG4gIGdldER1cmF0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXREdXJhdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb1VybCAqL1xuICBnZXRWaWRlb1VybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9VcmwoKSA6ICcnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvRW1iZWRDb2RlICovXG4gIGdldFZpZGVvRW1iZWRDb2RlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0VtYmVkQ29kZSgpIDogJyc7XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYmplY3QgdGhhdCBzaG91bGQgYmUgdXNlZCB0byBzdG9yZSB0aGUgdGVtcG9yYXJ5IEFQSSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfZ2V0UGVuZGluZ1N0YXRlKCk6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gICAgaWYgKCF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGU7XG4gIH1cblxuICAvKiogSW5pdGlhbGl6ZXMgYSBwbGF5ZXIgZnJvbSBhIHRlbXBvcmFyeSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfaW5pdGlhbGl6ZVBsYXllcihwbGF5ZXI6IFlULlBsYXllciwgc3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSk6IHZvaWQge1xuICAgIGNvbnN0IHtwbGF5YmFja1N0YXRlLCBwbGF5YmFja1JhdGUsIHZvbHVtZSwgbXV0ZWQsIHNlZWt9ID0gc3RhdGU7XG5cbiAgICBzd2l0Y2ggKHBsYXliYWNrU3RhdGUpIHtcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUExBWUlORzogcGxheWVyLnBsYXlWaWRlbygpOyBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUEFVU0VEOiBwbGF5ZXIucGF1c2VWaWRlbygpOyBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuQ1VFRDogcGxheWVyLnN0b3BWaWRlbygpOyBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9XG5cbiAgICBpZiAodm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9XG5cbiAgICBpZiAobXV0ZWQgIT0gbnVsbCkge1xuICAgICAgbXV0ZWQgPyBwbGF5ZXIubXV0ZSgpIDogcGxheWVyLnVuTXV0ZSgpO1xuICAgIH1cblxuICAgIGlmIChzZWVrICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZWVrVG8oc2Vlay5zZWNvbmRzLCBzZWVrLmFsbG93U2Vla0FoZWFkKTtcbiAgICB9XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYnNlcnZhYmxlIHRoYXQgYWRkcyBhbiBldmVudCBsaXN0ZW5lciB0byB0aGUgcGxheWVyIHdoZW4gYSB1c2VyIHN1YnNjcmliZXMgdG8gaXQuICovXG4gIHByaXZhdGUgX2dldExhenlFbWl0dGVyPFQgZXh0ZW5kcyBZVC5QbGF5ZXJFdmVudD4obmFtZToga2V5b2YgWVQuRXZlbnRzKTogT2JzZXJ2YWJsZTxUPiB7XG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgc3RyZWFtIG9mIHBsYXllcnMuIFRoaXMgd2F5IHRoZSBldmVudHMgd2lsbCBiZSB0cmFuc2ZlcnJlZFxuICAgIC8vIG92ZXIgdG8gdGhlIG5ldyBwbGF5ZXIgaWYgaXQgZ2V0cyBzd2FwcGVkIG91dCB1bmRlci10aGUtaG9vZC5cbiAgICByZXR1cm4gdGhpcy5fcGxheWVyQ2hhbmdlcy5waXBlKFxuICAgICAgLy8gU3dpdGNoIHRvIHRoZSBib3VuZCBldmVudC4gYHN3aXRjaE1hcGAgZW5zdXJlcyB0aGF0IHRoZSBvbGQgZXZlbnQgaXMgcmVtb3ZlZCB3aGVuIHRoZVxuICAgICAgLy8gcGxheWVyIGlzIGNoYW5nZWQuIElmIHRoZXJlJ3Mgbm8gcGxheWVyLCByZXR1cm4gYW4gb2JzZXJ2YWJsZSB0aGF0IG5ldmVyIGVtaXRzLlxuICAgICAgc3dpdGNoTWFwKHBsYXllciA9PiB7XG4gICAgICAgIHJldHVybiBwbGF5ZXIgPyBmcm9tRXZlbnRQYXR0ZXJuPFQ+KChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICB9LCAobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgIC8vIFRoZSBBUEkgc2VlbXMgdG8gdGhyb3cgd2hlbiB3ZSB0cnkgdG8gdW5iaW5kIGZyb20gYSBkZXN0cm95ZWQgcGxheWVyIGFuZCBpdCBkb2Vzbid0XG4gICAgICAgICAgLy8gZXhwb3NlIHdoZXRoZXIgdGhlIHBsYXllciBoYXMgYmVlbiBkZXN0cm95ZWQgc28gd2UgaGF2ZSB0byB3cmFwIGl0IGluIGEgdHJ5L2NhdGNoIHRvXG4gICAgICAgICAgLy8gcHJldmVudCB0aGUgZW50aXJlIHN0cmVhbSBmcm9tIGVycm9yaW5nIG91dC5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgfSkgOiBvYnNlcnZhYmxlT2Y8VD4oKTtcbiAgICAgIH0pLFxuICAgICAgLy8gQnkgZGVmYXVsdCB3ZSBydW4gYWxsIHRoZSBBUEkgaW50ZXJhY3Rpb25zIG91dHNpZGUgdGhlIHpvbmVcbiAgICAgIC8vIHNvIHdlIGhhdmUgdG8gYnJpbmcgdGhlIGV2ZW50cyBiYWNrIGluIG1hbnVhbGx5IHdoZW4gdGhleSBlbWl0LlxuICAgICAgKHNvdXJjZTogT2JzZXJ2YWJsZTxUPikgPT4gbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT4gc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICBlcnJvcjogZXJyb3IgPT4gb2JzZXJ2ZXIuZXJyb3IoZXJyb3IpLFxuICAgICAgICBjb21wbGV0ZTogKCkgPT4gb2JzZXJ2ZXIuY29tcGxldGUoKVxuICAgICAgfSkpLFxuICAgICAgLy8gRW5zdXJlcyB0aGF0IGV2ZXJ5dGhpbmcgaXMgY2xlYXJlZCBvdXQgb24gZGVzdHJveS5cbiAgICAgIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpXG4gICAgKTtcbiAgfVxufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIHRvIHRoZSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0IGFuZCBzZXRzIGl0IG9uIHRoZSBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU2l6ZVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgd2lkdGhPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgaGVpZ2h0T2JzOiBPYnNlcnZhYmxlPG51bWJlcj5cbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB3aWR0aE9icywgaGVpZ2h0T2JzXSlcbiAgICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHdpZHRoLCBoZWlnaHRdKSA9PiBwbGF5ZXIgJiYgcGxheWVyLnNldFNpemUod2lkdGgsIGhlaWdodCkpO1xufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIGZyb20gdGhlIHN1Z2dlc3RlZCBxdWFsaXR5IGFuZCBzZXRzIGl0IG9uIHRoZSBnaXZlbiBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW1xuICAgIHBsYXllck9icyxcbiAgICBzdWdnZXN0ZWRRdWFsaXR5T2JzXG4gIF0pLnN1YnNjcmliZShcbiAgICAoW3BsYXllciwgc3VnZ2VzdGVkUXVhbGl0eV0pID0+XG4gICAgICAgIHBsYXllciAmJiBzdWdnZXN0ZWRRdWFsaXR5ICYmIHBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBsb2FkZWQgcGxheWVyIG9uY2UgaXQncyByZWFkeS4gQ2VydGFpbiBwcm9wZXJ0aWVzL21ldGhvZHNcbiAqIHdvbid0IGJlIGF2YWlsYWJsZSB1bnRpbCB0aGUgaWZyYW1lIGZpbmlzaGVzIGxvYWRpbmcuXG4gKiBAcGFyYW0gb25BYm9ydCBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgaW52b2tlZCBpZiB0aGUgcGxheWVyIGxvYWRpbmcgd2FzIGFib3J0ZWQgYmVmb3JlXG4gKiBpdCB3YXMgYWJsZSB0byBjb21wbGV0ZS4gQ2FuIGJlIHVzZWQgdG8gY2xlYW4gdXAgYW55IGxvb3NlIHJlZmVyZW5jZXMuXG4gKi9cbmZ1bmN0aW9uIHdhaXRVbnRpbFJlYWR5KG9uQWJvcnQ6IChwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIpID0+IHZvaWQpOlxuICBPcGVyYXRvckZ1bmN0aW9uPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsIFBsYXllciB8IHVuZGVmaW5lZD4ge1xuICByZXR1cm4gZmxhdE1hcChwbGF5ZXIgPT4ge1xuICAgIGlmICghcGxheWVyKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mPFBsYXllcnx1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChwbGF5ZXJJc1JlYWR5KHBsYXllcikpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2YocGxheWVyIGFzIFBsYXllcik7XG4gICAgfVxuXG4gICAgLy8gU2luY2UgcmVtb3ZlRXZlbnRMaXN0ZW5lciBpcyBub3Qgb24gUGxheWVyIHdoZW4gaXQncyBpbml0aWFsaXplZCwgd2UgY2FuJ3QgdXNlIGZyb21FdmVudC5cbiAgICAvLyBUaGUgcGxheWVyIGlzIG5vdCBpbml0aWFsaXplZCBmdWxseSB1bnRpbCB0aGUgcmVhZHkgaXMgY2FsbGVkLlxuICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxQbGF5ZXI+KGVtaXR0ZXIgPT4ge1xuICAgICAgbGV0IGFib3J0ZWQgPSBmYWxzZTtcbiAgICAgIGxldCByZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgY29uc3Qgb25SZWFkeSA9IChldmVudDogWVQuUGxheWVyRXZlbnQpID0+IHtcbiAgICAgICAgcmVzb2x2ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmICghYWJvcnRlZCkge1xuICAgICAgICAgIGV2ZW50LnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgb25SZWFkeSk7XG4gICAgICAgICAgZW1pdHRlci5uZXh0KGV2ZW50LnRhcmdldCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKCdvblJlYWR5Jywgb25SZWFkeSk7XG5cbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGFib3J0ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgICBvbkFib3J0KHBsYXllcik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgodW5kZWZpbmVkKSk7XG4gIH0pO1xufVxuXG4vKiogQ3JlYXRlIGFuIG9ic2VydmFibGUgZm9yIHRoZSBwbGF5ZXIgYmFzZWQgb24gdGhlIGdpdmVuIG9wdGlvbnMuICovXG5mdW5jdGlvbiBjcmVhdGVQbGF5ZXJPYnNlcnZhYmxlKFxuICB5b3V0dWJlQ29udGFpbmVyOiBPYnNlcnZhYmxlPEhUTUxFbGVtZW50PixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBuZ1pvbmU6IE5nWm9uZVxuKTogT2JzZXJ2YWJsZTxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkPiB7XG5cbiAgY29uc3QgcGxheWVyT3B0aW9ucyA9XG4gICAgdmlkZW9JZE9ic1xuICAgIC5waXBlKFxuICAgICAgd2l0aExhdGVzdEZyb20oY29tYmluZUxhdGVzdChbd2lkdGhPYnMsIGhlaWdodE9ic10pKSxcbiAgICAgIG1hcCgoW3ZpZGVvSWQsIFt3aWR0aCwgaGVpZ2h0XV0pID0+IHZpZGVvSWQgPyAoe3ZpZGVvSWQsIHdpZHRoLCBoZWlnaHR9KSA6IHVuZGVmaW5lZCksXG4gICAgKTtcblxuICByZXR1cm4gY29tYmluZUxhdGVzdChbeW91dHViZUNvbnRhaW5lciwgcGxheWVyT3B0aW9ucywgb2Yobmdab25lKV0pXG4gICAgICAucGlwZShcbiAgICAgICAgc2tpcFVudGlsUmVtZW1iZXJMYXRlc3QoaWZyYW1lQXBpQXZhaWxhYmxlT2JzKSxcbiAgICAgICAgc2NhbihzeW5jUGxheWVyU3RhdGUsIHVuZGVmaW5lZCksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCkpO1xufVxuXG4vKiogU2tpcHMgdGhlIGdpdmVuIG9ic2VydmFibGUgdW50aWwgdGhlIG90aGVyIG9ic2VydmFibGUgZW1pdHMgdHJ1ZSwgdGhlbiBlbWl0IHRoZSBsYXRlc3QuICovXG5mdW5jdGlvbiBza2lwVW50aWxSZW1lbWJlckxhdGVzdDxUPihub3RpZmllcjogT2JzZXJ2YWJsZTxib29sZWFuPik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIGNvbWJpbmVMYXRlc3RPcChub3RpZmllciksXG4gICAgc2tpcFdoaWxlKChbXywgZG9uZVNraXBwaW5nXSkgPT4gIWRvbmVTa2lwcGluZyksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSkpO1xufVxuXG4vKiogRGVzdHJveSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBubyBvcHRpb25zLCBvciBjcmVhdGUgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIHN5bmNQbGF5ZXJTdGF0ZShcbiAgcGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLFxuICBbY29udGFpbmVyLCB2aWRlb09wdGlvbnMsIG5nWm9uZV06IFtIVE1MRWxlbWVudCwgWVQuUGxheWVyT3B0aW9ucyB8IHVuZGVmaW5lZCwgTmdab25lXSxcbik6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQge1xuICBpZiAoIXZpZGVvT3B0aW9ucykge1xuICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuICBpZiAocGxheWVyKSB7XG4gICAgcmV0dXJuIHBsYXllcjtcbiAgfVxuXG4gIC8vIEltcG9ydGFudCEgV2UgbmVlZCB0byBjcmVhdGUgdGhlIFBsYXllciBvYmplY3Qgb3V0c2lkZSBvZiB0aGUgYE5nWm9uZWAsIGJlY2F1c2UgaXQga2lja3NcbiAgLy8gb2ZmIGEgMjUwbXMgc2V0SW50ZXJ2YWwgd2hpY2ggd2lsbCBjb250aW51YWxseSB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gaWYgd2UgZG9uJ3QuXG4gIGNvbnN0IG5ld1BsYXllcjogVW5pbml0aWFsaXplZFBsYXllciA9XG4gICAgICBuZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gbmV3IFlULlBsYXllcihjb250YWluZXIsIHZpZGVvT3B0aW9ucykpO1xuICAvLyBCaW5kIHZpZGVvSWQgZm9yIGZ1dHVyZSB1c2UuXG4gIG5ld1BsYXllci52aWRlb0lkID0gdmlkZW9PcHRpb25zLnZpZGVvSWQ7XG4gIHJldHVybiBuZXdQbGF5ZXI7XG59XG5cbi8qKlxuICogQ2FsbCBjdWVWaWRlb0J5SWQgaWYgdGhlIHZpZGVvSWQgY2hhbmdlcywgb3Igd2hlbiBzdGFydCBvciBlbmQgc2Vjb25kcyBjaGFuZ2UuIGN1ZVZpZGVvQnlJZCB3aWxsXG4gKiBjaGFuZ2UgdGhlIGxvYWRlZCB2aWRlbyBpZCB0byB0aGUgZ2l2ZW4gdmlkZW9JZCwgYW5kIHNldCB0aGUgc3RhcnQgYW5kIGVuZCB0aW1lcyB0byB0aGUgZ2l2ZW5cbiAqIHN0YXJ0L2VuZCBzZWNvbmRzLlxuICovXG5mdW5jdGlvbiBiaW5kQ3VlVmlkZW9DYWxsKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8UGxheWVyIHwgdW5kZWZpbmVkPixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBzdGFydFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgZW5kU2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4sXG4gIGRlc3Ryb3llZDogT2JzZXJ2YWJsZTx2b2lkPixcbikge1xuICBjb25zdCBjdWVPcHRpb25zT2JzID0gY29tYmluZUxhdGVzdChbc3RhcnRTZWNvbmRzT2JzLCBlbmRTZWNvbmRzT2JzXSlcbiAgICAucGlwZShtYXAoKFtzdGFydFNlY29uZHMsIGVuZFNlY29uZHNdKSA9PiAoe3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc30pKSk7XG5cbiAgLy8gT25seSByZXNwb25kIHRvIGNoYW5nZXMgaW4gY3VlIG9wdGlvbnMgaWYgdGhlIHBsYXllciBpcyBub3QgcnVubmluZy5cbiAgY29uc3QgZmlsdGVyZWRDdWVPcHRpb25zID0gY3VlT3B0aW9uc09ic1xuICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCBwbGF5ZXIgPT4gISFwbGF5ZXIgJiYgIWhhc1BsYXllclN0YXJ0ZWQocGxheWVyKSkpO1xuXG4gIC8vIElmIHRoZSB2aWRlbyBpZCBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZSBwbGF5ZXJcbiAgLy8gd2FzIGluaXRpYWxpemVkIHdpdGggYSBkaWZmZXJlbnQgdmlkZW8gaWQuXG4gIGNvbnN0IGNoYW5nZWRWaWRlb0lkID0gdmlkZW9JZE9ic1xuICAgICAgLnBpcGUoZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIChwbGF5ZXIsIHZpZGVvSWQpID0+ICEhcGxheWVyICYmIHBsYXllci52aWRlb0lkICE9PSB2aWRlb0lkKSk7XG5cbiAgLy8gSWYgdGhlIHBsYXllciBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZXJlIGFyZSBjdWUgb3B0aW9ucy5cbiAgY29uc3QgY2hhbmdlZFBsYXllciA9IHBsYXllck9icy5waXBlKFxuICAgIGZpbHRlck9uT3RoZXIoXG4gICAgICBjb21iaW5lTGF0ZXN0KFt2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzXSksXG4gICAgICAoW3ZpZGVvSWQsIGN1ZU9wdGlvbnNdLCBwbGF5ZXIpID0+XG4gICAgICAgICAgISFwbGF5ZXIgJiZcbiAgICAgICAgICAgICh2aWRlb0lkICE9IHBsYXllci52aWRlb0lkIHx8ICEhY3VlT3B0aW9ucy5zdGFydFNlY29uZHMgfHwgISFjdWVPcHRpb25zLmVuZFNlY29uZHMpKSk7XG5cbiAgbWVyZ2UoY2hhbmdlZFBsYXllciwgY2hhbmdlZFZpZGVvSWQsIGZpbHRlcmVkQ3VlT3B0aW9ucylcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgdmlkZW9JZE9icywgY3VlT3B0aW9uc09icywgc3VnZ2VzdGVkUXVhbGl0eU9ic10pKSxcbiAgICAgIG1hcCgoW18sIHZhbHVlc10pID0+IHZhbHVlcyksXG4gICAgICB0YWtlVW50aWwoZGVzdHJveWVkKSxcbiAgICApXG4gICAgLnN1YnNjcmliZSgoW3BsYXllciwgdmlkZW9JZCwgY3VlT3B0aW9ucywgc3VnZ2VzdGVkUXVhbGl0eV0pID0+IHtcbiAgICAgIGlmICghdmlkZW9JZCB8fCAhcGxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBsYXllci52aWRlb0lkID0gdmlkZW9JZDtcbiAgICAgIHBsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkLFxuICAgICAgICBzdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgICAuLi5jdWVPcHRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGhhc1BsYXllclN0YXJ0ZWQocGxheWVyOiBZVC5QbGF5ZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSBwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgcmV0dXJuIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQgJiYgc3RhdGUgIT09IFlULlBsYXllclN0YXRlLkNVRUQ7XG59XG5cbmZ1bmN0aW9uIHBsYXllcklzUmVhZHkocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKTogcGxheWVyIGlzIFBsYXllciB7XG4gIHJldHVybiAnZ2V0UGxheWVyU3RhdHVzJyBpbiBwbGF5ZXI7XG59XG5cbi8qKiBDb21iaW5lcyB0aGUgdHdvIG9ic2VydmFibGVzIHRlbXBvcmFyaWx5IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uLiAqL1xuZnVuY3Rpb24gZmlsdGVyT25PdGhlcjxSLCBUPihcbiAgb3RoZXJPYnM6IE9ic2VydmFibGU8VD4sXG4gIGZpbHRlckZuOiAodDogVCwgcj86IFIpID0+IGJvb2xlYW4sXG4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248Uj4ge1xuICByZXR1cm4gcGlwZShcbiAgICB3aXRoTGF0ZXN0RnJvbShvdGhlck9icyksXG4gICAgZmlsdGVyKChbdmFsdWUsIG90aGVyXSkgPT4gZmlsdGVyRm4ob3RoZXIsIHZhbHVlKSksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSksXG4gICk7XG59XG4iXX0=