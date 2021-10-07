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
import { combineLatest, merge, Observable, of as observableOf, pipe, Subject, of, BehaviorSubject, fromEventPattern, } from 'rxjs';
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, switchMap, tap, mergeMap, } from 'rxjs/operators';
import * as i0 from "@angular/core";
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
        this._playerVars = new BehaviorSubject(undefined);
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
    /**
     * Extra parameters used to configure the player. See:
     * https://developers.google.com/youtube/player_parameters.html?playerVersion=HTML5#Parameters
     */
    get playerVars() { return this._playerVars.value; }
    set playerVars(playerVars) {
        this._playerVars.next(playerVars);
    }
    ngOnInit() {
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        let iframeApiAvailableObs = observableOf(true);
        if (!window.YT || !window.YT.Player) {
            if (this.showBeforeIframeApiLoads && (typeof ngDevMode === 'undefined' || ngDevMode)) {
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
        const playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this._playerVars, this._ngZone).pipe(tap(player => {
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
        this._playerVars.complete();
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
    /** Initializes a player from a temporary state. */
    _initializePlayer(player, state) {
        const { playbackState, playbackRate, volume, muted, seek } = state;
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
                catch { }
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
YouTubePlayer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.0.0-next.15", ngImport: i0, type: YouTubePlayer, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component });
YouTubePlayer.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "12.0.0", version: "13.0.0-next.15", type: YouTubePlayer, selector: "youtube-player", inputs: { videoId: "videoId", height: "height", width: "width", startSeconds: "startSeconds", endSeconds: "endSeconds", suggestedQuality: "suggestedQuality", playerVars: "playerVars", showBeforeIframeApiLoads: "showBeforeIframeApiLoads" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true }], ngImport: i0, template: '<div #youtubeContainer></div>', isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.0.0-next.15", ngImport: i0, type: YouTubePlayer, decorators: [{
            type: Component,
            args: [{
                    selector: 'youtube-player',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    encapsulation: ViewEncapsulation.None,
                    // This div is *replaced* by the YouTube player embed.
                    template: '<div #youtubeContainer></div>',
                }]
        }], ctorParameters: function () { return [{ type: i0.NgZone }, { type: Object, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }]; }, propDecorators: { videoId: [{
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
                args: ['youtubeContainer']
            }] } });
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
    return mergeMap(player => {
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
function createPlayerObservable(youtubeContainer, videoIdObs, iframeApiAvailableObs, widthObs, heightObs, playerVarsObs, ngZone) {
    const playerOptions = combineLatest([videoIdObs, playerVarsObs]).pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map(([constructorOptions, sizeOptions]) => {
        const [videoId, playerVars] = constructorOptions;
        const [width, height] = sizeOptions;
        return videoId ? ({ videoId, playerVars, width, height }) : undefined;
    }));
    return combineLatest([youtubeContainer, playerOptions, of(ngZone)])
        .pipe(skipUntilRememberLatest(iframeApiAvailableObs), scan(syncPlayerState, undefined), distinctUntilChanged());
}
/** Skips the given observable until the other observable emits true, then emit the latest. */
function skipUntilRememberLatest(notifier) {
    return pipe(combineLatestOp(notifier), skipWhile(([_, doneSkipping]) => !doneSkipping), map(([value]) => value));
}
/** Destroy the player if there are no options, or create the player if there are options. */
function syncPlayerState(player, [container, videoOptions, ngZone]) {
    if (player && videoOptions && player.playerVars !== videoOptions.playerVars) {
        // The player needs to be recreated if the playerVars are different.
        player.destroy();
    }
    else if (!videoOptions) {
        if (player) {
            // Destroy the player if the videoId was removed.
            player.destroy();
        }
        return;
    }
    else if (player) {
        return player;
    }
    // Important! We need to create the Player object outside of the `NgZone`, because it kicks
    // off a 250ms setInterval which will continually trigger change detection if we don't.
    const newPlayer = ngZone.runOutsideAngular(() => new YT.Player(container, videoOptions));
    newPlayer.videoId = videoOptions.videoId;
    newPlayer.playerVars = videoOptions.playerVars;
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
        player.cueVideoById({
            videoId,
            suggestedQuality,
            ...cueOptions,
        });
    });
}
function hasPlayerStarted(player) {
    const state = player.getPlayerState();
    return state !== YT.PlayerState.UNSTARTED && state !== YT.PlayerState.CUED;
}
function playerIsReady(player) {
    return 'getPlayerStatus' in player;
}
/** Combines the two observables temporarily for the filter function. */
function filterOnOther(otherObs, filterFn) {
    return pipe(withLatestFrom(otherObs), filter(([value, other]) => filterFn(other, value)), map(([value]) => value));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU0EsaUNBQWlDO0FBVGpDOzs7Ozs7R0FNRztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsTUFBTSxFQUNOLFdBQVcsR0FDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUVsRCxPQUFPLEVBQ0wsYUFBYSxFQUViLEtBQUssRUFFTCxVQUFVLEVBQ1YsRUFBRSxJQUFJLFlBQVksRUFFbEIsSUFBSSxFQUNKLE9BQU8sRUFDUCxFQUFFLEVBQ0YsZUFBZSxFQUNmLGdCQUFnQixHQUNqQixNQUFNLE1BQU0sQ0FBQztBQUVkLE9BQU8sRUFDTCxhQUFhLElBQUksZUFBZSxFQUNoQyxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEVBQ2QsU0FBUyxFQUNULEdBQUcsRUFDSCxRQUFRLEdBQ1QsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFTeEIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztBQXlCekM7Ozs7R0FJRztBQVFILE1BQU0sT0FBTyxhQUFhO0lBaUd4QixZQUFvQixPQUFlLEVBQXVCLFVBQWtCO1FBQXhELFlBQU8sR0FBUCxPQUFPLENBQVE7UUE5RmxCLHNCQUFpQixHQUFHLElB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RSxDQUFDO0lBQ3RDLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztBQUM3RSxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsTUFBMkI7SUFDaEQsT0FBTyxpQkFBaUIsSUFBSSxNQUFNLENBQUM7QUFDckMsQ0FBQztBQUVELHdFQUF3RTtBQUN4RSxTQUFTLGFBQWEsQ0FDcEIsUUFBdUIsRUFDdkIsUUFBa0M7SUFFbEMsT0FBTyxJQUFJLENBQ1QsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUNsRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FDeEIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gV29ya2Fyb3VuZCBmb3I6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvMTI2NVxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ5b3V0dWJlXCIgLz5cblxuaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgSW5qZWN0LFxuICBQTEFURk9STV9JRCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge2lzUGxhdGZvcm1Ccm93c2VyfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0LFxuICBDb25uZWN0YWJsZU9ic2VydmFibGUsXG4gIG1lcmdlLFxuICBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb24sXG4gIE9ic2VydmFibGUsXG4gIG9mIGFzIG9ic2VydmFibGVPZixcbiAgT3BlcmF0b3JGdW5jdGlvbixcbiAgcGlwZSxcbiAgU3ViamVjdCxcbiAgb2YsXG4gIEJlaGF2aW9yU3ViamVjdCxcbiAgZnJvbUV2ZW50UGF0dGVybixcbn0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QgYXMgY29tYmluZUxhdGVzdE9wLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgZmlsdGVyLFxuICBtYXAsXG4gIHB1Ymxpc2gsXG4gIHNjYW4sXG4gIHNraXBXaGlsZSxcbiAgc3RhcnRXaXRoLFxuICB0YWtlLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBzd2l0Y2hNYXAsXG4gIHRhcCxcbiAgbWVyZ2VNYXAsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBZVDogdHlwZW9mIFlUIHwgdW5kZWZpbmVkO1xuICAgIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX1dJRFRIID0gNjQwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX0hFSUdIVCA9IDM5MDtcblxuLy8gVGhlIG5hdGl2ZSBZVC5QbGF5ZXIgZG9lc24ndCBleHBvc2UgdGhlIHNldCB2aWRlb0lkLCBidXQgd2UgbmVlZCBpdCBmb3Jcbi8vIGNvbnZlbmllbmNlLlxuaW50ZXJmYWNlIFBsYXllciBleHRlbmRzIFlULlBsYXllciB7XG4gIHZpZGVvSWQ/OiBzdHJpbmc7XG4gIHBsYXllclZhcnM/OiBZVC5QbGF5ZXJWYXJzO1xufVxuXG4vLyBUaGUgcGxheWVyIGlzbid0IGZ1bGx5IGluaXRpYWxpemVkIHdoZW4gaXQncyBjb25zdHJ1Y3RlZC5cbi8vIFRoZSBvbmx5IGZpZWxkIGF2YWlsYWJsZSBpcyBkZXN0cm95IGFuZCBhZGRFdmVudExpc3RlbmVyLlxudHlwZSBVbmluaXRpYWxpemVkUGxheWVyID0gUGljazxQbGF5ZXIsICd2aWRlb0lkJyB8ICdwbGF5ZXJWYXJzJyB8ICdkZXN0cm95JyB8ICdhZGRFdmVudExpc3RlbmVyJz47XG5cbi8qKlxuICogT2JqZWN0IHVzZWQgdG8gc3RvcmUgdGhlIHN0YXRlIG9mIHRoZSBwbGF5ZXIgaWYgdGhlXG4gKiB1c2VyIHRyaWVzIHRvIGludGVyYWN0IHdpdGggdGhlIEFQSSBiZWZvcmUgaXQgaGFzIGJlZW4gbG9hZGVkLlxuICovXG5pbnRlcmZhY2UgUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgcGxheWJhY2tTdGF0ZT86IFlULlBsYXllclN0YXRlLlBMQVlJTkcgfCBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQgfCBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICBwbGF5YmFja1JhdGU/OiBudW1iZXI7XG4gIHZvbHVtZT86IG51bWJlcjtcbiAgbXV0ZWQ/OiBib29sZWFuO1xuICBzZWVrPzoge3NlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW59O1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY29tcG9uZW50IHRoYXQgcmVuZGVycyBhIFlvdVR1YmUgcGxheWVyIHZpYSB0aGUgWW91VHViZSBwbGF5ZXJcbiAqIGlmcmFtZSBBUEkuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2VcbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAneW91dHViZS1wbGF5ZXInLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgLy8gVGhpcyBkaXYgaXMgKnJlcGxhY2VkKiBieSB0aGUgWW91VHViZSBwbGF5ZXIgZW1iZWQuXG4gIHRlbXBsYXRlOiAnPGRpdiAjeW91dHViZUNvbnRhaW5lcj48L2Rpdj4nLFxufSlcbmV4cG9ydCBjbGFzcyBZb3VUdWJlUGxheWVyIGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95LCBPbkluaXQge1xuICAvKiogV2hldGhlciB3ZSdyZSBjdXJyZW50bHkgcmVuZGVyaW5nIGluc2lkZSBhIGJyb3dzZXIuICovXG4gIHByaXZhdGUgX2lzQnJvd3NlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSByZWFkb25seSBfeW91dHViZUNvbnRhaW5lciA9IG5ldyBTdWJqZWN0PEhUTUxFbGVtZW50PigpO1xuICBwcml2YXRlIHJlYWRvbmx5IF9kZXN0cm95ZWQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICBwcml2YXRlIF9wbGF5ZXI6IFBsYXllciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BlbmRpbmdQbGF5ZXJTdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIHJlYWRvbmx5IF9wbGF5ZXJDaGFuZ2VzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBZb3VUdWJlIFZpZGVvIElEIHRvIHZpZXcgKi9cbiAgQElucHV0KClcbiAgZ2V0IHZpZGVvSWQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3ZpZGVvSWQudmFsdWU7IH1cbiAgc2V0IHZpZGVvSWQodmlkZW9JZDogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fdmlkZW9JZC5uZXh0KHZpZGVvSWQpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX3ZpZGVvSWQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZyB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogSGVpZ2h0IG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl9oZWlnaHQudmFsdWU7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodC5uZXh0KGhlaWdodCB8fCBERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX2hlaWdodCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl93aWR0aC52YWx1ZTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3dpZHRoLm5leHQod2lkdGggfHwgREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX3dpZHRoID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX1dJRFRIKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RhcnQgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgc3RhcnRTZWNvbmRzKHN0YXJ0U2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLm5leHQoc3RhcnRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIHJlYWRvbmx5IF9zdGFydFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RvcCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBlbmRTZWNvbmRzKGVuZFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2VuZFNlY29uZHMubmV4dChlbmRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIHJlYWRvbmx5IF9lbmRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBvZiB0aGUgcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdWdnZXN0ZWRRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkubmV4dChzdWdnZXN0ZWRRdWFsaXR5KTtcbiAgfVxuICBwcml2YXRlIHJlYWRvbmx5IF9zdWdnZXN0ZWRRdWFsaXR5ID1cbiAgICBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKipcbiAgICogRXh0cmEgcGFyYW1ldGVycyB1c2VkIHRvIGNvbmZpZ3VyZSB0aGUgcGxheWVyLiBTZWU6XG4gICAqIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvcGxheWVyX3BhcmFtZXRlcnMuaHRtbD9wbGF5ZXJWZXJzaW9uPUhUTUw1I1BhcmFtZXRlcnNcbiAgICovXG4gIEBJbnB1dCgpXG4gIGdldCBwbGF5ZXJWYXJzKCk6IFlULlBsYXllclZhcnMgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fcGxheWVyVmFycy52YWx1ZTsgfVxuICBzZXQgcGxheWVyVmFycyhwbGF5ZXJWYXJzOiBZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fcGxheWVyVmFycy5uZXh0KHBsYXllclZhcnMpO1xuICB9XG4gIHByaXZhdGUgX3BsYXllclZhcnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlBsYXllclZhcnMgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGlmcmFtZSB3aWxsIGF0dGVtcHQgdG8gbG9hZCByZWdhcmRsZXNzIG9mIHRoZSBzdGF0dXMgb2YgdGhlIGFwaSBvbiB0aGVcbiAgICogcGFnZS4gU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3UgZG9uJ3Qgd2FudCB0aGUgYG9uWW91VHViZUlmcmFtZUFQSVJlYWR5YCBmaWVsZCB0byBiZVxuICAgKiBzZXQgb24gdGhlIGdsb2JhbCB3aW5kb3cuXG4gICAqL1xuICBASW5wdXQoKSBzaG93QmVmb3JlSWZyYW1lQXBpTG9hZHM6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqIE91dHB1dHMgYXJlIGRpcmVjdCBwcm94aWVzIGZyb20gdGhlIHBsYXllciBpdHNlbGYuICovXG4gIEBPdXRwdXQoKSByZWFkb25seSByZWFkeTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvblJlYWR5Jyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHN0YXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50Pignb25TdGF0ZUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBlcnJvcjogT2JzZXJ2YWJsZTxZVC5PbkVycm9yRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uRXJyb3JFdmVudD4oJ29uRXJyb3InKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgYXBpQ2hhbmdlOiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uQXBpQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHBsYXliYWNrUXVhbGl0eUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tSYXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUmF0ZUNoYW5nZScpO1xuXG4gIC8qKiBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgcmVwbGFjZWQgYnkgdGhlIGlmcmFtZS4gKi9cbiAgQFZpZXdDaGlsZCgneW91dHViZUNvbnRhaW5lcicpXG4gIHlvdXR1YmVDb250YWluZXI6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX25nWm9uZTogTmdab25lLCBASW5qZWN0KFBMQVRGT1JNX0lEKSBwbGF0Zm9ybUlkOiBPYmplY3QpIHtcbiAgICB0aGlzLl9pc0Jyb3dzZXIgPSBpc1BsYXRmb3JtQnJvd3NlcihwbGF0Zm9ybUlkKTtcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIHdlJ3JlIG5vdCBpbiBhIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+ID0gb2JzZXJ2YWJsZU9mKHRydWUpO1xuICAgIGlmICghd2luZG93LllUIHx8ICF3aW5kb3cuWVQuUGxheWVyKSB7XG4gICAgICBpZiAodGhpcy5zaG93QmVmb3JlSWZyYW1lQXBpTG9hZHMgJiYgKHR5cGVvZiBuZ0Rldk1vZGUgPT09ICd1bmRlZmluZWQnIHx8IG5nRGV2TW9kZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOYW1lc3BhY2UgWVQgbm90IGZvdW5kLCBjYW5ub3QgY29uc3RydWN0IGVtYmVkZGVkIHlvdXR1YmUgcGxheWVyLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgaW5zdGFsbCB0aGUgWW91VHViZSBQbGF5ZXIgQVBJIFJlZmVyZW5jZSBmb3IgaWZyYW1lIEVtYmVkczogJyArXG4gICAgICAgICAgICAnaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8Ym9vbGVhbj4oKTtcbiAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjayA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblxuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbmdab25lLnJ1bigoKSA9PiBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0Lm5leHQodHJ1ZSkpO1xuICAgICAgfTtcbiAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyA9IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgoZmFsc2UpKTtcbiAgICB9XG5cbiAgICAvLyBBbiBvYnNlcnZhYmxlIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHBsYXllci5cbiAgICBjb25zdCBwbGF5ZXJPYnMgPVxuICAgICAgY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgICAgICAgdGhpcy5feW91dHViZUNvbnRhaW5lcixcbiAgICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzLFxuICAgICAgICB0aGlzLl93aWR0aCxcbiAgICAgICAgdGhpcy5faGVpZ2h0LFxuICAgICAgICB0aGlzLl9wbGF5ZXJWYXJzLFxuICAgICAgICB0aGlzLl9uZ1pvbmVcbiAgICAgICkucGlwZSh0YXAocGxheWVyID0+IHtcbiAgICAgICAgLy8gRW1pdCB0aGlzIGJlZm9yZSB0aGUgYHdhaXRVbnRpbFJlYWR5YCBjYWxsIHNvIHRoYXQgd2UgY2FuIGJpbmQgdG9cbiAgICAgICAgLy8gZXZlbnRzIHRoYXQgaGFwcGVuIGFzIHRoZSBwbGF5ZXIgaXMgYmVpbmcgaW5pdGlhbGl6ZWQgKGUuZy4gYG9uUmVhZHlgKS5cbiAgICAgICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5uZXh0KHBsYXllcik7XG4gICAgICB9KSwgd2FpdFVudGlsUmVhZHkocGxheWVyID0+IHtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgcGxheWVyIGlmIGxvYWRpbmcgd2FzIGFib3J0ZWQgc28gdGhhdCB3ZSBkb24ndCBlbmQgdXAgbGVha2luZyBtZW1vcnkuXG4gICAgICAgIGlmICghcGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfSksIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpLCBwdWJsaXNoKCkpO1xuXG4gICAgLy8gU2V0IHVwIHNpZGUgZWZmZWN0cyB0byBiaW5kIGlucHV0cyB0byB0aGUgcGxheWVyLlxuICAgIHBsYXllck9icy5zdWJzY3JpYmUocGxheWVyID0+IHtcbiAgICAgIHRoaXMuX3BsYXllciA9IHBsYXllcjtcblxuICAgICAgaWYgKHBsYXllciAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZVBsYXllcihwbGF5ZXIsIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIGJpbmRTaXplVG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5KTtcblxuICAgIGJpbmRDdWVWaWRlb0NhbGwoXG4gICAgICBwbGF5ZXJPYnMsXG4gICAgICB0aGlzLl92aWRlb0lkLFxuICAgICAgdGhpcy5fc3RhcnRTZWNvbmRzLFxuICAgICAgdGhpcy5fZW5kU2Vjb25kcyxcbiAgICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHksXG4gICAgICB0aGlzLl9kZXN0cm95ZWQpO1xuXG4gICAgLy8gQWZ0ZXIgYWxsIG9mIHRoZSBzdWJzY3JpcHRpb25zIGFyZSBzZXQgdXAsIGNvbm5lY3QgdGhlIG9ic2VydmFibGUuXG4gICAgKHBsYXllck9icyBhcyBDb25uZWN0YWJsZU9ic2VydmFibGU8UGxheWVyPikuY29ubmVjdCgpO1xuICB9XG5cbiAgbmdBZnRlclZpZXdJbml0KCkge1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIubmV4dCh0aGlzLnlvdXR1YmVDb250YWluZXIubmF0aXZlRWxlbWVudCk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrO1xuICAgIH1cblxuICAgIHRoaXMuX3BsYXllckNoYW5nZXMuY29tcGxldGUoKTtcbiAgICB0aGlzLl92aWRlb0lkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5faGVpZ2h0LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fd2lkdGguY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIuY29tcGxldGUoKTtcbiAgICB0aGlzLl9wbGF5ZXJWYXJzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLm5leHQoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQuY29tcGxldGUoKTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwbGF5VmlkZW8gKi9cbiAgcGxheVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wbGF5VmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBMQVlJTkc7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BhdXNlVmlkZW8gKi9cbiAgcGF1c2VWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGF1c2VWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUEFVU0VEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzdG9wVmlkZW8gKi9cbiAgc3RvcFZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zdG9wVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSXQgc2VlbXMgbGlrZSBZb3VUdWJlIHNldHMgdGhlIHBsYXllciB0byBDVUVEIHdoZW4gaXQncyBzdG9wcGVkLlxuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NlZWtUbyAqL1xuICBzZWVrVG8oc2Vjb25kczogbnVtYmVyLCBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZWVrVG8oc2Vjb25kcywgYWxsb3dTZWVrQWhlYWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5zZWVrID0ge3NlY29uZHMsIGFsbG93U2Vla0FoZWFkfTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjbXV0ZSAqL1xuICBtdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5tdXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLm11dGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjdW5NdXRlICovXG4gIHVuTXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIudW5NdXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLm11dGVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2lzTXV0ZWQgKi9cbiAgaXNNdXRlZCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmlzTXV0ZWQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUubXV0ZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NldFZvbHVtZSAqL1xuICBzZXRWb2x1bWUodm9sdW1lOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2V0Vm9sdW1lKHZvbHVtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnZvbHVtZSA9IHZvbHVtZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Vm9sdW1lICovXG4gIGdldFZvbHVtZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Vm9sdW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUudm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUudm9sdW1lO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3NldFBsYXliYWNrUmF0ZSAqL1xuICBzZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1JhdGUgPSBwbGF5YmFja1JhdGU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXliYWNrUmF0ZSAqL1xuICBnZXRQbGF5YmFja1JhdGUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXliYWNrUmF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrUmF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrUmF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzICovXG4gIGdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKTogbnVtYmVyW10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbiAqL1xuICBnZXRWaWRlb0xvYWRlZEZyYWN0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0xvYWRlZEZyYWN0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXllclN0YXRlICovXG4gIGdldFBsYXllclN0YXRlKCk6IFlULlBsYXllclN0YXRlIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuX2lzQnJvd3NlciB8fCAhd2luZG93LllUKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEN1cnJlbnRUaW1lICovXG4gIGdldEN1cnJlbnRUaW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRDdXJyZW50VGltZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWspIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlay5zZWNvbmRzO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFBsYXliYWNrUXVhbGl0eSAqL1xuICBnZXRQbGF5YmFja1F1YWxpdHkoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFBsYXliYWNrUXVhbGl0eSgpIDogJ2RlZmF1bHQnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMgKi9cbiAgZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHlbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXREdXJhdGlvbiAqL1xuICBnZXREdXJhdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0RHVyYXRpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9VcmwgKi9cbiAgZ2V0VmlkZW9VcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvVXJsKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0VtYmVkQ29kZSAqL1xuICBnZXRWaWRlb0VtYmVkQ29kZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9FbWJlZENvZGUoKSA6ICcnO1xuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JqZWN0IHRoYXQgc2hvdWxkIGJlIHVzZWQgdG8gc3RvcmUgdGhlIHRlbXBvcmFyeSBBUEkgc3RhdGUuICovXG4gIHByaXZhdGUgX2dldFBlbmRpbmdTdGF0ZSgpOiBQZW5kaW5nUGxheWVyU3RhdGUge1xuICAgIGlmICghdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlO1xuICB9XG5cbiAgLyoqIEluaXRpYWxpemVzIGEgcGxheWVyIGZyb20gYSB0ZW1wb3Jhcnkgc3RhdGUuICovXG4gIHByaXZhdGUgX2luaXRpYWxpemVQbGF5ZXIocGxheWVyOiBZVC5QbGF5ZXIsIHN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCB7cGxheWJhY2tTdGF0ZSwgcGxheWJhY2tSYXRlLCB2b2x1bWUsIG11dGVkLCBzZWVrfSA9IHN0YXRlO1xuXG4gICAgc3dpdGNoIChwbGF5YmFja1N0YXRlKSB7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLlBMQVlJTkc6IHBsYXllci5wbGF5VmlkZW8oKTsgYnJlYWs7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLlBBVVNFRDogcGxheWVyLnBhdXNlVmlkZW8oKTsgYnJlYWs7XG4gICAgICBjYXNlIFlULlBsYXllclN0YXRlLkNVRUQ6IHBsYXllci5zdG9wVmlkZW8oKTsgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHBsYXliYWNrUmF0ZSAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfVxuXG4gICAgaWYgKHZvbHVtZSAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2V0Vm9sdW1lKHZvbHVtZSk7XG4gICAgfVxuXG4gICAgaWYgKG11dGVkICE9IG51bGwpIHtcbiAgICAgIG11dGVkID8gcGxheWVyLm11dGUoKSA6IHBsYXllci51bk11dGUoKTtcbiAgICB9XG5cbiAgICBpZiAoc2VlayAhPSBudWxsKSB7XG4gICAgICBwbGF5ZXIuc2Vla1RvKHNlZWsuc2Vjb25kcywgc2Vlay5hbGxvd1NlZWtBaGVhZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEdldHMgYW4gb2JzZXJ2YWJsZSB0aGF0IGFkZHMgYW4gZXZlbnQgbGlzdGVuZXIgdG8gdGhlIHBsYXllciB3aGVuIGEgdXNlciBzdWJzY3JpYmVzIHRvIGl0LiAqL1xuICBwcml2YXRlIF9nZXRMYXp5RW1pdHRlcjxUIGV4dGVuZHMgWVQuUGxheWVyRXZlbnQ+KG5hbWU6IGtleW9mIFlULkV2ZW50cyk6IE9ic2VydmFibGU8VD4ge1xuICAgIC8vIFN0YXJ0IHdpdGggdGhlIHN0cmVhbSBvZiBwbGF5ZXJzLiBUaGlzIHdheSB0aGUgZXZlbnRzIHdpbGwgYmUgdHJhbnNmZXJyZWRcbiAgICAvLyBvdmVyIHRvIHRoZSBuZXcgcGxheWVyIGlmIGl0IGdldHMgc3dhcHBlZCBvdXQgdW5kZXItdGhlLWhvb2QuXG4gICAgcmV0dXJuIHRoaXMuX3BsYXllckNoYW5nZXMucGlwZShcbiAgICAgIC8vIFN3aXRjaCB0byB0aGUgYm91bmQgZXZlbnQuIGBzd2l0Y2hNYXBgIGVuc3VyZXMgdGhhdCB0aGUgb2xkIGV2ZW50IGlzIHJlbW92ZWQgd2hlbiB0aGVcbiAgICAgIC8vIHBsYXllciBpcyBjaGFuZ2VkLiBJZiB0aGVyZSdzIG5vIHBsYXllciwgcmV0dXJuIGFuIG9ic2VydmFibGUgdGhhdCBuZXZlciBlbWl0cy5cbiAgICAgIHN3aXRjaE1hcChwbGF5ZXIgPT4ge1xuICAgICAgICByZXR1cm4gcGxheWVyID8gZnJvbUV2ZW50UGF0dGVybjxUPigobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgIHBsYXllci5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgfSwgKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICAvLyBUaGUgQVBJIHNlZW1zIHRvIHRocm93IHdoZW4gd2UgdHJ5IHRvIHVuYmluZCBmcm9tIGEgZGVzdHJveWVkIHBsYXllciBhbmQgaXQgZG9lc24ndFxuICAgICAgICAgIC8vIGV4cG9zZSB3aGV0aGVyIHRoZSBwbGF5ZXIgaGFzIGJlZW4gZGVzdHJveWVkIHNvIHdlIGhhdmUgdG8gd3JhcCBpdCBpbiBhIHRyeS9jYXRjaCB0b1xuICAgICAgICAgIC8vIHByZXZlbnQgdGhlIGVudGlyZSBzdHJlYW0gZnJvbSBlcnJvcmluZyBvdXQuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICgocGxheWVyIGFzIFBsYXllcikucmVtb3ZlRXZlbnRMaXN0ZW5lciEpIHtcbiAgICAgICAgICAgICAgKHBsYXllciBhcyBQbGF5ZXIpLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgfSkgOiBvYnNlcnZhYmxlT2Y8VD4oKTtcbiAgICAgIH0pLFxuICAgICAgLy8gQnkgZGVmYXVsdCB3ZSBydW4gYWxsIHRoZSBBUEkgaW50ZXJhY3Rpb25zIG91dHNpZGUgdGhlIHpvbmVcbiAgICAgIC8vIHNvIHdlIGhhdmUgdG8gYnJpbmcgdGhlIGV2ZW50cyBiYWNrIGluIG1hbnVhbGx5IHdoZW4gdGhleSBlbWl0LlxuICAgICAgKHNvdXJjZTogT2JzZXJ2YWJsZTxUPikgPT4gbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT4gc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICBlcnJvcjogZXJyb3IgPT4gb2JzZXJ2ZXIuZXJyb3IoZXJyb3IpLFxuICAgICAgICBjb21wbGV0ZTogKCkgPT4gb2JzZXJ2ZXIuY29tcGxldGUoKVxuICAgICAgfSkpLFxuICAgICAgLy8gRW5zdXJlcyB0aGF0IGV2ZXJ5dGhpbmcgaXMgY2xlYXJlZCBvdXQgb24gZGVzdHJveS5cbiAgICAgIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpXG4gICAgKTtcbiAgfVxufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIHRvIHRoZSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0IGFuZCBzZXRzIGl0IG9uIHRoZSBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU2l6ZVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgd2lkdGhPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgaGVpZ2h0T2JzOiBPYnNlcnZhYmxlPG51bWJlcj5cbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB3aWR0aE9icywgaGVpZ2h0T2JzXSlcbiAgICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHdpZHRoLCBoZWlnaHRdKSA9PiBwbGF5ZXIgJiYgcGxheWVyLnNldFNpemUod2lkdGgsIGhlaWdodCkpO1xufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIGZyb20gdGhlIHN1Z2dlc3RlZCBxdWFsaXR5IGFuZCBzZXRzIGl0IG9uIHRoZSBnaXZlbiBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW1xuICAgIHBsYXllck9icyxcbiAgICBzdWdnZXN0ZWRRdWFsaXR5T2JzXG4gIF0pLnN1YnNjcmliZShcbiAgICAoW3BsYXllciwgc3VnZ2VzdGVkUXVhbGl0eV0pID0+XG4gICAgICAgIHBsYXllciAmJiBzdWdnZXN0ZWRRdWFsaXR5ICYmIHBsYXllci5zZXRQbGF5YmFja1F1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBsb2FkZWQgcGxheWVyIG9uY2UgaXQncyByZWFkeS4gQ2VydGFpbiBwcm9wZXJ0aWVzL21ldGhvZHNcbiAqIHdvbid0IGJlIGF2YWlsYWJsZSB1bnRpbCB0aGUgaWZyYW1lIGZpbmlzaGVzIGxvYWRpbmcuXG4gKiBAcGFyYW0gb25BYm9ydCBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgaW52b2tlZCBpZiB0aGUgcGxheWVyIGxvYWRpbmcgd2FzIGFib3J0ZWQgYmVmb3JlXG4gKiBpdCB3YXMgYWJsZSB0byBjb21wbGV0ZS4gQ2FuIGJlIHVzZWQgdG8gY2xlYW4gdXAgYW55IGxvb3NlIHJlZmVyZW5jZXMuXG4gKi9cbmZ1bmN0aW9uIHdhaXRVbnRpbFJlYWR5KG9uQWJvcnQ6IChwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIpID0+IHZvaWQpOlxuICBPcGVyYXRvckZ1bmN0aW9uPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsIFBsYXllciB8IHVuZGVmaW5lZD4ge1xuICByZXR1cm4gbWVyZ2VNYXAocGxheWVyID0+IHtcbiAgICBpZiAoIXBsYXllcikge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZjxQbGF5ZXJ8dW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mKHBsYXllciBhcyBQbGF5ZXIpO1xuICAgIH1cblxuICAgIC8vIFNpbmNlIHJlbW92ZUV2ZW50TGlzdGVuZXIgaXMgbm90IG9uIFBsYXllciB3aGVuIGl0J3MgaW5pdGlhbGl6ZWQsIHdlIGNhbid0IHVzZSBmcm9tRXZlbnQuXG4gICAgLy8gVGhlIHBsYXllciBpcyBub3QgaW5pdGlhbGl6ZWQgZnVsbHkgdW50aWwgdGhlIHJlYWR5IGlzIGNhbGxlZC5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGxheWVyPihlbWl0dGVyID0+IHtcbiAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG4gICAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IFlULlBsYXllckV2ZW50KSA9PiB7XG4gICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIWFib3J0ZWQpIHtcbiAgICAgICAgICBldmVudC50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuICAgICAgICAgIGVtaXR0ZXIubmV4dChldmVudC50YXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgb25BYm9ydChwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKHVuZGVmaW5lZCkpO1xuICB9KTtcbn1cblxuLyoqIENyZWF0ZSBhbiBvYnNlcnZhYmxlIGZvciB0aGUgcGxheWVyIGJhc2VkIG9uIHRoZSBnaXZlbiBvcHRpb25zLiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgeW91dHViZUNvbnRhaW5lcjogT2JzZXJ2YWJsZTxIVE1MRWxlbWVudD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgcGxheWVyVmFyc09iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkPixcbiAgbmdab25lOiBOZ1pvbmVcbik6IE9ic2VydmFibGU8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4ge1xuXG4gIGNvbnN0IHBsYXllck9wdGlvbnMgPSBjb21iaW5lTGF0ZXN0KFt2aWRlb0lkT2JzLCBwbGF5ZXJWYXJzT2JzXSkucGlwZShcbiAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFt3aWR0aE9icywgaGVpZ2h0T2JzXSkpLFxuICAgIG1hcCgoW2NvbnN0cnVjdG9yT3B0aW9ucywgc2l6ZU9wdGlvbnNdKSA9PiB7XG4gICAgICBjb25zdCBbdmlkZW9JZCwgcGxheWVyVmFyc10gPSBjb25zdHJ1Y3Rvck9wdGlvbnM7XG4gICAgICBjb25zdCBbd2lkdGgsIGhlaWdodF0gPSBzaXplT3B0aW9ucztcbiAgICAgIHJldHVybiB2aWRlb0lkID8gKHsgdmlkZW9JZCwgcGxheWVyVmFycywgd2lkdGgsIGhlaWdodCB9KSA6IHVuZGVmaW5lZDtcbiAgICB9KSxcbiAgKTtcblxuICByZXR1cm4gY29tYmluZUxhdGVzdChbeW91dHViZUNvbnRhaW5lciwgcGxheWVyT3B0aW9ucywgb2Yobmdab25lKV0pXG4gICAgICAucGlwZShcbiAgICAgICAgc2tpcFVudGlsUmVtZW1iZXJMYXRlc3QoaWZyYW1lQXBpQXZhaWxhYmxlT2JzKSxcbiAgICAgICAgc2NhbihzeW5jUGxheWVyU3RhdGUsIHVuZGVmaW5lZCksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCkpO1xufVxuXG4vKiogU2tpcHMgdGhlIGdpdmVuIG9ic2VydmFibGUgdW50aWwgdGhlIG90aGVyIG9ic2VydmFibGUgZW1pdHMgdHJ1ZSwgdGhlbiBlbWl0IHRoZSBsYXRlc3QuICovXG5mdW5jdGlvbiBza2lwVW50aWxSZW1lbWJlckxhdGVzdDxUPihub3RpZmllcjogT2JzZXJ2YWJsZTxib29sZWFuPik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIGNvbWJpbmVMYXRlc3RPcChub3RpZmllciksXG4gICAgc2tpcFdoaWxlKChbXywgZG9uZVNraXBwaW5nXSkgPT4gIWRvbmVTa2lwcGluZyksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSkpO1xufVxuXG4vKiogRGVzdHJveSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBubyBvcHRpb25zLCBvciBjcmVhdGUgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIHN5bmNQbGF5ZXJTdGF0ZShcbiAgcGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLFxuICBbY29udGFpbmVyLCB2aWRlb09wdGlvbnMsIG5nWm9uZV06IFtIVE1MRWxlbWVudCwgWVQuUGxheWVyT3B0aW9ucyB8IHVuZGVmaW5lZCwgTmdab25lXSxcbik6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQge1xuICBpZiAocGxheWVyICYmIHZpZGVvT3B0aW9ucyAmJiBwbGF5ZXIucGxheWVyVmFycyAhPT0gdmlkZW9PcHRpb25zLnBsYXllclZhcnMpIHtcbiAgICAvLyBUaGUgcGxheWVyIG5lZWRzIHRvIGJlIHJlY3JlYXRlZCBpZiB0aGUgcGxheWVyVmFycyBhcmUgZGlmZmVyZW50LlxuICAgIHBsYXllci5kZXN0cm95KCk7XG4gIH0gZWxzZSBpZiAoIXZpZGVvT3B0aW9ucykge1xuICAgIGlmIChwbGF5ZXIpIHtcbiAgICAgIC8vIERlc3Ryb3kgdGhlIHBsYXllciBpZiB0aGUgdmlkZW9JZCB3YXMgcmVtb3ZlZC5cbiAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfSBlbHNlIGlmIChwbGF5ZXIpIHtcbiAgICByZXR1cm4gcGxheWVyO1xuICB9XG5cbiAgLy8gSW1wb3J0YW50ISBXZSBuZWVkIHRvIGNyZWF0ZSB0aGUgUGxheWVyIG9iamVjdCBvdXRzaWRlIG9mIHRoZSBgTmdab25lYCwgYmVjYXVzZSBpdCBraWNrc1xuICAvLyBvZmYgYSAyNTBtcyBzZXRJbnRlcnZhbCB3aGljaCB3aWxsIGNvbnRpbnVhbGx5IHRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbiBpZiB3ZSBkb24ndC5cbiAgY29uc3QgbmV3UGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyID1cbiAgICAgIG5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiBuZXcgWVQuUGxheWVyKGNvbnRhaW5lciwgdmlkZW9PcHRpb25zKSk7XG4gIG5ld1BsYXllci52aWRlb0lkID0gdmlkZW9PcHRpb25zLnZpZGVvSWQ7XG4gIG5ld1BsYXllci5wbGF5ZXJWYXJzID0gdmlkZW9PcHRpb25zLnBsYXllclZhcnM7XG4gIHJldHVybiBuZXdQbGF5ZXI7XG59XG5cbi8qKlxuICogQ2FsbCBjdWVWaWRlb0J5SWQgaWYgdGhlIHZpZGVvSWQgY2hhbmdlcywgb3Igd2hlbiBzdGFydCBvciBlbmQgc2Vjb25kcyBjaGFuZ2UuIGN1ZVZpZGVvQnlJZCB3aWxsXG4gKiBjaGFuZ2UgdGhlIGxvYWRlZCB2aWRlbyBpZCB0byB0aGUgZ2l2ZW4gdmlkZW9JZCwgYW5kIHNldCB0aGUgc3RhcnQgYW5kIGVuZCB0aW1lcyB0byB0aGUgZ2l2ZW5cbiAqIHN0YXJ0L2VuZCBzZWNvbmRzLlxuICovXG5mdW5jdGlvbiBiaW5kQ3VlVmlkZW9DYWxsKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8UGxheWVyIHwgdW5kZWZpbmVkPixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBzdGFydFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgZW5kU2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4sXG4gIGRlc3Ryb3llZDogT2JzZXJ2YWJsZTx2b2lkPixcbikge1xuICBjb25zdCBjdWVPcHRpb25zT2JzID0gY29tYmluZUxhdGVzdChbc3RhcnRTZWNvbmRzT2JzLCBlbmRTZWNvbmRzT2JzXSlcbiAgICAucGlwZShtYXAoKFtzdGFydFNlY29uZHMsIGVuZFNlY29uZHNdKSA9PiAoe3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc30pKSk7XG5cbiAgLy8gT25seSByZXNwb25kIHRvIGNoYW5nZXMgaW4gY3VlIG9wdGlvbnMgaWYgdGhlIHBsYXllciBpcyBub3QgcnVubmluZy5cbiAgY29uc3QgZmlsdGVyZWRDdWVPcHRpb25zID0gY3VlT3B0aW9uc09ic1xuICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCBwbGF5ZXIgPT4gISFwbGF5ZXIgJiYgIWhhc1BsYXllclN0YXJ0ZWQocGxheWVyKSkpO1xuXG4gIC8vIElmIHRoZSB2aWRlbyBpZCBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZSBwbGF5ZXJcbiAgLy8gd2FzIGluaXRpYWxpemVkIHdpdGggYSBkaWZmZXJlbnQgdmlkZW8gaWQuXG4gIGNvbnN0IGNoYW5nZWRWaWRlb0lkID0gdmlkZW9JZE9ic1xuICAgICAgLnBpcGUoZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIChwbGF5ZXIsIHZpZGVvSWQpID0+ICEhcGxheWVyICYmIHBsYXllci52aWRlb0lkICE9PSB2aWRlb0lkKSk7XG5cbiAgLy8gSWYgdGhlIHBsYXllciBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZXJlIGFyZSBjdWUgb3B0aW9ucy5cbiAgY29uc3QgY2hhbmdlZFBsYXllciA9IHBsYXllck9icy5waXBlKFxuICAgIGZpbHRlck9uT3RoZXIoXG4gICAgICBjb21iaW5lTGF0ZXN0KFt2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzXSksXG4gICAgICAoW3ZpZGVvSWQsIGN1ZU9wdGlvbnNdLCBwbGF5ZXIpID0+XG4gICAgICAgICAgISFwbGF5ZXIgJiZcbiAgICAgICAgICAgICh2aWRlb0lkICE9IHBsYXllci52aWRlb0lkIHx8ICEhY3VlT3B0aW9ucy5zdGFydFNlY29uZHMgfHwgISFjdWVPcHRpb25zLmVuZFNlY29uZHMpKSk7XG5cbiAgbWVyZ2UoY2hhbmdlZFBsYXllciwgY2hhbmdlZFZpZGVvSWQsIGZpbHRlcmVkQ3VlT3B0aW9ucylcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgdmlkZW9JZE9icywgY3VlT3B0aW9uc09icywgc3VnZ2VzdGVkUXVhbGl0eU9ic10pKSxcbiAgICAgIG1hcCgoW18sIHZhbHVlc10pID0+IHZhbHVlcyksXG4gICAgICB0YWtlVW50aWwoZGVzdHJveWVkKSxcbiAgICApXG4gICAgLnN1YnNjcmliZSgoW3BsYXllciwgdmlkZW9JZCwgY3VlT3B0aW9ucywgc3VnZ2VzdGVkUXVhbGl0eV0pID0+IHtcbiAgICAgIGlmICghdmlkZW9JZCB8fCAhcGxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBsYXllci52aWRlb0lkID0gdmlkZW9JZDtcbiAgICAgIHBsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkLFxuICAgICAgICBzdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgICAuLi5jdWVPcHRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGhhc1BsYXllclN0YXJ0ZWQocGxheWVyOiBZVC5QbGF5ZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSBwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgcmV0dXJuIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQgJiYgc3RhdGUgIT09IFlULlBsYXllclN0YXRlLkNVRUQ7XG59XG5cbmZ1bmN0aW9uIHBsYXllcklzUmVhZHkocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKTogcGxheWVyIGlzIFBsYXllciB7XG4gIHJldHVybiAnZ2V0UGxheWVyU3RhdHVzJyBpbiBwbGF5ZXI7XG59XG5cbi8qKiBDb21iaW5lcyB0aGUgdHdvIG9ic2VydmFibGVzIHRlbXBvcmFyaWx5IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uLiAqL1xuZnVuY3Rpb24gZmlsdGVyT25PdGhlcjxSLCBUPihcbiAgb3RoZXJPYnM6IE9ic2VydmFibGU8VD4sXG4gIGZpbHRlckZuOiAodDogVCwgcj86IFIpID0+IGJvb2xlYW4sXG4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248Uj4ge1xuICByZXR1cm4gcGlwZShcbiAgICB3aXRoTGF0ZXN0RnJvbShvdGhlck9icyksXG4gICAgZmlsdGVyKChbdmFsdWUsIG90aGVyXSkgPT4gZmlsdGVyRm4ob3RoZXIsIHZhbHVlKSksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSksXG4gICk7XG59XG4iXX0=