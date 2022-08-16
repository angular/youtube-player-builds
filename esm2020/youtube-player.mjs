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
        this._disableCookies = new BehaviorSubject(false);
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
    get videoId() {
        return this._videoId.value;
    }
    set videoId(videoId) {
        this._videoId.next(videoId);
    }
    /** Height of video player */
    get height() {
        return this._height.value;
    }
    set height(height) {
        this._height.next(height || DEFAULT_PLAYER_HEIGHT);
    }
    /** Width of video player */
    get width() {
        return this._width.value;
    }
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
    get playerVars() {
        return this._playerVars.value;
    }
    set playerVars(playerVars) {
        this._playerVars.next(playerVars);
    }
    /** Whether cookies inside the player have been disabled. */
    get disableCookies() {
        return this._disableCookies.value;
    }
    set disableCookies(value) {
        this._disableCookies.next(!!value);
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
        const hostObservable = this._disableCookies.pipe(map(cookiesDisabled => (cookiesDisabled ? 'https://www.youtube-nocookie.com' : undefined)));
        // An observable of the currently loaded player.
        const playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, hostObservable, iframeApiAvailableObs, this._width, this._height, this._playerVars, this._ngZone).pipe(tap(player => {
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
            return player
                ? fromEventPattern((listener) => {
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
                })
                : observableOf();
        }), 
        // By default we run all the API interactions outside the zone
        // so we have to bring the events back in manually when they emit.
        (source) => new Observable(observer => source.subscribe({
            next: value => this._ngZone.run(() => observer.next(value)),
            error: error => observer.error(error),
            complete: () => observer.complete(),
        })), 
        // Ensures that everything is cleared out on destroy.
        takeUntil(this._destroyed));
    }
}
YouTubePlayer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.0.1", ngImport: i0, type: YouTubePlayer, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component });
YouTubePlayer.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "14.0.1", type: YouTubePlayer, selector: "youtube-player", inputs: { videoId: "videoId", height: "height", width: "width", startSeconds: "startSeconds", endSeconds: "endSeconds", suggestedQuality: "suggestedQuality", playerVars: "playerVars", disableCookies: "disableCookies", showBeforeIframeApiLoads: "showBeforeIframeApiLoads" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true }], ngImport: i0, template: '<div #youtubeContainer></div>', isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.0.1", ngImport: i0, type: YouTubePlayer, decorators: [{
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
                args: ['youtubeContainer']
            }] } });
/** Listens to changes to the given width and height and sets it on the player. */
function bindSizeToPlayer(playerObs, widthObs, heightObs) {
    return combineLatest([playerObs, widthObs, heightObs]).subscribe(([player, width, height]) => player && player.setSize(width, height));
}
/** Listens to changes from the suggested quality and sets it on the given player. */
function bindSuggestedQualityToPlayer(playerObs, suggestedQualityObs) {
    return combineLatest([playerObs, suggestedQualityObs]).subscribe(([player, suggestedQuality]) => player && suggestedQuality && player.setPlaybackQuality(suggestedQuality));
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
function createPlayerObservable(youtubeContainer, videoIdObs, hostObs, iframeApiAvailableObs, widthObs, heightObs, playerVarsObs, ngZone) {
    const playerOptions = combineLatest([videoIdObs, hostObs, playerVarsObs]).pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map(([constructorOptions, sizeOptions]) => {
        const [videoId, host, playerVars] = constructorOptions;
        const [width, height] = sizeOptions;
        return videoId ? { videoId, playerVars, width, height, host } : undefined;
    }));
    return combineLatest([youtubeContainer, playerOptions, of(ngZone)]).pipe(skipUntilRememberLatest(iframeApiAvailableObs), scan(syncPlayerState, undefined), distinctUntilChanged());
}
/** Skips the given observable until the other observable emits true, then emit the latest. */
function skipUntilRememberLatest(notifier) {
    return pipe(combineLatestOp(notifier), skipWhile(([_, doneSkipping]) => !doneSkipping), map(([value]) => value));
}
/** Destroy the player if there are no options, or create the player if there are options. */
function syncPlayerState(player, [container, videoOptions, ngZone]) {
    if (player &&
        videoOptions &&
        (player.playerVars !== videoOptions.playerVars || player.host !== videoOptions.host)) {
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
    newPlayer.host = videoOptions.host;
    return newPlayer;
}
/**
 * Call cueVideoById if the videoId changes, or when start or end seconds change. cueVideoById will
 * change the loaded video id to the given videoId, and set the start and end times to the given
 * start/end seconds.
 */
function bindCueVideoCall(playerObs, videoIdObs, startSecondsObs, endSecondsObs, suggestedQualityObs, destroyed) {
    const cueOptionsObs = combineLatest([startSecondsObs, endSecondsObs]).pipe(map(([startSeconds, endSeconds]) => ({ startSeconds, endSeconds })));
    // Only respond to changes in cue options if the player is not running.
    const filteredCueOptions = cueOptionsObs.pipe(filterOnOther(playerObs, player => !!player && !hasPlayerStarted(player)));
    // If the video id changed, there's no reason to run 'cue' unless the player
    // was initialized with a different video id.
    const changedVideoId = videoIdObs.pipe(filterOnOther(playerObs, (player, videoId) => !!player && player.videoId !== videoId));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU0EsaUNBQWlDO0FBVGpDOzs7Ozs7R0FNRztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsTUFBTSxFQUNOLFdBQVcsR0FDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUVsRCxPQUFPLEVBQ0wsYUFBYSxFQUViLEtBQUssRUFFTCxVQUFVLEVBQ1YsRUFBRSxJQUFJLFlBQVksRUFFbEIsSUFBSSxFQUNKLE9BQU8sRUFDUCxFQUFFLEVBQ0YsZUFBZSxFQUNmLGdCQUFnQixHQUNqQixNQUFNLE1BQU0sQ0FBQztBQUVkLE9BQU8sRUFDTCxhQUFhLElBQUksZUFBZSxFQUNoQyxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEVBQ2QsU0FBUyxFQUNULEdBQUcsRUFDSCxRQUFRLEdBQ1QsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFTeEIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztBQTZCekM7Ozs7R0FJRztBQVFILE1BQU0sT0FBTyxhQUFhO0lBb0h4QixZQUFvQixPQUFlLEVBQXVCLFVBQWtCO1FBQXhELFlBQU8sR0FBUCxPQUFPLENBQVE7UUFqSGxCLHNCQUFpQixHQUFHLElB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Q0FBQyxDQUFDLEVBQ2xELEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUN4QixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBXb3JrYXJvdW5kIGZvcjogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy8xMjY1XG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cInlvdXR1YmVcIiAvPlxuXG5pbXBvcnQge1xuICBBZnRlclZpZXdJbml0LFxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3V0cHV0LFxuICBWaWV3Q2hpbGQsXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxuICBJbmplY3QsXG4gIFBMQVRGT1JNX0lELFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7aXNQbGF0Zm9ybUJyb3dzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QsXG4gIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSxcbiAgbWVyZ2UsXG4gIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbixcbiAgT2JzZXJ2YWJsZSxcbiAgb2YgYXMgb2JzZXJ2YWJsZU9mLFxuICBPcGVyYXRvckZ1bmN0aW9uLFxuICBwaXBlLFxuICBTdWJqZWN0LFxuICBvZixcbiAgQmVoYXZpb3JTdWJqZWN0LFxuICBmcm9tRXZlbnRQYXR0ZXJuLFxufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCBhcyBjb21iaW5lTGF0ZXN0T3AsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBmaWx0ZXIsXG4gIG1hcCxcbiAgcHVibGlzaCxcbiAgc2NhbixcbiAgc2tpcFdoaWxlLFxuICBzdGFydFdpdGgsXG4gIHRha2UsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIHN3aXRjaE1hcCxcbiAgdGFwLFxuICBtZXJnZU1hcCxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIFlUOiB0eXBlb2YgWVQgfCB1bmRlZmluZWQ7XG4gICAgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfV0lEVEggPSA2NDA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFZRVJfSEVJR0hUID0gMzkwO1xuXG4vLyBUaGUgbmF0aXZlIFlULlBsYXllciBkb2Vzbid0IGV4cG9zZSB0aGUgc2V0IHZpZGVvSWQsIGJ1dCB3ZSBuZWVkIGl0IGZvclxuLy8gY29udmVuaWVuY2UuXG5pbnRlcmZhY2UgUGxheWVyIGV4dGVuZHMgWVQuUGxheWVyIHtcbiAgdmlkZW9JZD86IHN0cmluZztcbiAgcGxheWVyVmFycz86IFlULlBsYXllclZhcnM7XG4gIGhvc3Q/OiBzdHJpbmc7XG59XG5cbi8vIFRoZSBwbGF5ZXIgaXNuJ3QgZnVsbHkgaW5pdGlhbGl6ZWQgd2hlbiBpdCdzIGNvbnN0cnVjdGVkLlxuLy8gVGhlIG9ubHkgZmllbGQgYXZhaWxhYmxlIGlzIGRlc3Ryb3kgYW5kIGFkZEV2ZW50TGlzdGVuZXIuXG50eXBlIFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPSBQaWNrPFxuICBQbGF5ZXIsXG4gICd2aWRlb0lkJyB8ICdwbGF5ZXJWYXJzJyB8ICdkZXN0cm95JyB8ICdhZGRFdmVudExpc3RlbmVyJyB8ICdob3N0J1xuPjtcblxuLyoqXG4gKiBPYmplY3QgdXNlZCB0byBzdG9yZSB0aGUgc3RhdGUgb2YgdGhlIHBsYXllciBpZiB0aGVcbiAqIHVzZXIgdHJpZXMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgQVBJIGJlZm9yZSBpdCBoYXMgYmVlbiBsb2FkZWQuXG4gKi9cbmludGVyZmFjZSBQZW5kaW5nUGxheWVyU3RhdGUge1xuICBwbGF5YmFja1N0YXRlPzogWVQuUGxheWVyU3RhdGUuUExBWUlORyB8IFlULlBsYXllclN0YXRlLlBBVVNFRCB8IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gIHBsYXliYWNrUmF0ZT86IG51bWJlcjtcbiAgdm9sdW1lPzogbnVtYmVyO1xuICBtdXRlZD86IGJvb2xlYW47XG4gIHNlZWs/OiB7c2Vjb25kczogbnVtYmVyOyBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbn07XG59XG5cbi8qKlxuICogQW5ndWxhciBjb21wb25lbnQgdGhhdCByZW5kZXJzIGEgWW91VHViZSBwbGF5ZXIgdmlhIHRoZSBZb3VUdWJlIHBsYXllclxuICogaWZyYW1lIEFQSS5cbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZVxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICd5b3V0dWJlLXBsYXllcicsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAvLyBUaGlzIGRpdiBpcyAqcmVwbGFjZWQqIGJ5IHRoZSBZb3VUdWJlIHBsYXllciBlbWJlZC5cbiAgdGVtcGxhdGU6ICc8ZGl2ICN5b3V0dWJlQ29udGFpbmVyPjwvZGl2PicsXG59KVxuZXhwb3J0IGNsYXNzIFlvdVR1YmVQbGF5ZXIgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIC8qKiBXaGV0aGVyIHdlJ3JlIGN1cnJlbnRseSByZW5kZXJpbmcgaW5zaWRlIGEgYnJvd3Nlci4gKi9cbiAgcHJpdmF0ZSBfaXNCcm93c2VyOiBib29sZWFuO1xuICBwcml2YXRlIHJlYWRvbmx5IF95b3V0dWJlQ29udGFpbmVyID0gbmV3IFN1YmplY3Q8SFRNTEVsZW1lbnQ+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3llZCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG4gIHByaXZhdGUgX3BsYXllcjogUGxheWVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcGVuZGluZ1BsYXllclN0YXRlOiBQZW5kaW5nUGxheWVyU3RhdGUgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3BsYXllckNoYW5nZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFlvdVR1YmUgVmlkZW8gSUQgdG8gdmlldyAqL1xuICBASW5wdXQoKVxuICBnZXQgdmlkZW9JZCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl92aWRlb0lkLnZhbHVlO1xuICB9XG4gIHNldCB2aWRlb0lkKHZpZGVvSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3ZpZGVvSWQubmV4dCh2aWRlb0lkKTtcbiAgfVxuICBwcml2YXRlIHJlYWRvbmx5IF92aWRlb0lkID0gbmV3IEJlaGF2aW9yU3ViamVjdDxzdHJpbmcgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIEhlaWdodCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IGhlaWdodCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9oZWlnaHQudmFsdWU7XG4gIH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodC5uZXh0KGhlaWdodCB8fCBERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX2hlaWdodCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX3dpZHRoLnZhbHVlO1xuICB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fd2lkdGgubmV4dCh3aWR0aCB8fCBERUZBVUxUX1BMQVlFUl9XSURUSCk7XG4gIH1cbiAgcHJpdmF0ZSByZWFkb25seSBfd2lkdGggPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlcj4oREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdGFydCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdGFydFNlY29uZHMoc3RhcnRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMubmV4dChzdGFydFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX3N0YXJ0U2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdG9wIHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IGVuZFNlY29uZHMoZW5kU2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5uZXh0KGVuZFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX2VuZFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIHN1Z2dlc3RlZCBxdWFsaXR5IG9mIHRoZSBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgc2V0IHN1Z2dlc3RlZFF1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5uZXh0KHN1Z2dlc3RlZFF1YWxpdHkpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX3N1Z2dlc3RlZFF1YWxpdHkgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4oXG4gICAgdW5kZWZpbmVkLFxuICApO1xuXG4gIC8qKlxuICAgKiBFeHRyYSBwYXJhbWV0ZXJzIHVzZWQgdG8gY29uZmlndXJlIHRoZSBwbGF5ZXIuIFNlZTpcbiAgICogaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9wbGF5ZXJfcGFyYW1ldGVycy5odG1sP3BsYXllclZlcnNpb249SFRNTDUjUGFyYW1ldGVyc1xuICAgKi9cbiAgQElucHV0KClcbiAgZ2V0IHBsYXllclZhcnMoKTogWVQuUGxheWVyVmFycyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllclZhcnMudmFsdWU7XG4gIH1cbiAgc2V0IHBsYXllclZhcnMocGxheWVyVmFyczogWVQuUGxheWVyVmFycyB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3BsYXllclZhcnMubmV4dChwbGF5ZXJWYXJzKTtcbiAgfVxuICBwcml2YXRlIF9wbGF5ZXJWYXJzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBXaGV0aGVyIGNvb2tpZXMgaW5zaWRlIHRoZSBwbGF5ZXIgaGF2ZSBiZWVuIGRpc2FibGVkLiAqL1xuICBASW5wdXQoKVxuICBnZXQgZGlzYWJsZUNvb2tpZXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2Rpc2FibGVDb29raWVzLnZhbHVlO1xuICB9XG4gIHNldCBkaXNhYmxlQ29va2llcyh2YWx1ZTogdW5rbm93bikge1xuICAgIHRoaXMuX2Rpc2FibGVDb29raWVzLm5leHQoISF2YWx1ZSk7XG4gIH1cbiAgcHJpdmF0ZSByZWFkb25seSBfZGlzYWJsZUNvb2tpZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PGJvb2xlYW4+KGZhbHNlKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgaWZyYW1lIHdpbGwgYXR0ZW1wdCB0byBsb2FkIHJlZ2FyZGxlc3Mgb2YgdGhlIHN0YXR1cyBvZiB0aGUgYXBpIG9uIHRoZVxuICAgKiBwYWdlLiBTZXQgdGhpcyB0byB0cnVlIGlmIHlvdSBkb24ndCB3YW50IHRoZSBgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHlgIGZpZWxkIHRvIGJlXG4gICAqIHNldCBvbiB0aGUgZ2xvYmFsIHdpbmRvdy5cbiAgICovXG4gIEBJbnB1dCgpIHNob3dCZWZvcmVJZnJhbWVBcGlMb2FkczogYm9vbGVhbiB8IHVuZGVmaW5lZDtcblxuICAvKiogT3V0cHV0cyBhcmUgZGlyZWN0IHByb3hpZXMgZnJvbSB0aGUgcGxheWVyIGl0c2VsZi4gKi9cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHJlYWR5OiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvblJlYWR5Jyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHN0YXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4oJ29uU3RhdGVDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgZXJyb3I6IE9ic2VydmFibGU8WVQuT25FcnJvckV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25FcnJvckV2ZW50Pignb25FcnJvcicpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBhcGlDaGFuZ2U6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uQXBpQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHBsYXliYWNrUXVhbGl0eUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25QbGF5YmFja1F1YWxpdHlDaGFuZ2VFdmVudD4oJ29uUGxheWJhY2tRdWFsaXR5Q2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IHBsYXliYWNrUmF0ZUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4oJ29uUGxheWJhY2tSYXRlQ2hhbmdlJyk7XG5cbiAgLyoqIFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSByZXBsYWNlZCBieSB0aGUgaWZyYW1lLiAqL1xuICBAVmlld0NoaWxkKCd5b3V0dWJlQ29udGFpbmVyJylcbiAgeW91dHViZUNvbnRhaW5lcjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfbmdab25lOiBOZ1pvbmUsIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ6IE9iamVjdCkge1xuICAgIHRoaXMuX2lzQnJvd3NlciA9IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpO1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgd2UncmUgbm90IGluIGEgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICBpZiAoIXRoaXMuX2lzQnJvd3Nlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4gPSBvYnNlcnZhYmxlT2YodHJ1ZSk7XG4gICAgaWYgKCF3aW5kb3cuWVQgfHwgIXdpbmRvdy5ZVC5QbGF5ZXIpIHtcbiAgICAgIGlmICh0aGlzLnNob3dCZWZvcmVJZnJhbWVBcGlMb2FkcyAmJiAodHlwZW9mIG5nRGV2TW9kZSA9PT0gJ3VuZGVmaW5lZCcgfHwgbmdEZXZNb2RlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ05hbWVzcGFjZSBZVCBub3QgZm91bmQsIGNhbm5vdCBjb25zdHJ1Y3QgZW1iZWRkZWQgeW91dHViZSBwbGF5ZXIuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSBpbnN0YWxsIHRoZSBZb3VUdWJlIFBsYXllciBBUEkgUmVmZXJlbmNlIGZvciBpZnJhbWUgRW1iZWRzOiAnICtcbiAgICAgICAgICAgICdodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlJyxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdCA9IG5ldyBTdWJqZWN0PGJvb2xlYW4+KCk7XG4gICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2sgPSB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk7XG5cbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdC5uZXh0KHRydWUpKTtcbiAgICAgIH07XG4gICAgICBpZnJhbWVBcGlBdmFpbGFibGVPYnMgPSBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0LnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKGZhbHNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdE9ic2VydmFibGUgPSB0aGlzLl9kaXNhYmxlQ29va2llcy5waXBlKFxuICAgICAgbWFwKGNvb2tpZXNEaXNhYmxlZCA9PiAoY29va2llc0Rpc2FibGVkID8gJ2h0dHBzOi8vd3d3LnlvdXR1YmUtbm9jb29raWUuY29tJyA6IHVuZGVmaW5lZCkpLFxuICAgICk7XG5cbiAgICAvLyBBbiBvYnNlcnZhYmxlIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHBsYXllci5cbiAgICBjb25zdCBwbGF5ZXJPYnMgPSBjcmVhdGVQbGF5ZXJPYnNlcnZhYmxlKFxuICAgICAgdGhpcy5feW91dHViZUNvbnRhaW5lcixcbiAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICBob3N0T2JzZXJ2YWJsZSxcbiAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyxcbiAgICAgIHRoaXMuX3dpZHRoLFxuICAgICAgdGhpcy5faGVpZ2h0LFxuICAgICAgdGhpcy5fcGxheWVyVmFycyxcbiAgICAgIHRoaXMuX25nWm9uZSxcbiAgICApLnBpcGUoXG4gICAgICB0YXAocGxheWVyID0+IHtcbiAgICAgICAgLy8gRW1pdCB0aGlzIGJlZm9yZSB0aGUgYHdhaXRVbnRpbFJlYWR5YCBjYWxsIHNvIHRoYXQgd2UgY2FuIGJpbmQgdG9cbiAgICAgICAgLy8gZXZlbnRzIHRoYXQgaGFwcGVuIGFzIHRoZSBwbGF5ZXIgaXMgYmVpbmcgaW5pdGlhbGl6ZWQgKGUuZy4gYG9uUmVhZHlgKS5cbiAgICAgICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5uZXh0KHBsYXllcik7XG4gICAgICB9KSxcbiAgICAgIHdhaXRVbnRpbFJlYWR5KHBsYXllciA9PiB7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIHBsYXllciBpZiBsb2FkaW5nIHdhcyBhYm9ydGVkIHNvIHRoYXQgd2UgZG9uJ3QgZW5kIHVwIGxlYWtpbmcgbWVtb3J5LlxuICAgICAgICBpZiAoIXBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZCksXG4gICAgICBwdWJsaXNoKCksXG4gICAgKTtcblxuICAgIC8vIFNldCB1cCBzaWRlIGVmZmVjdHMgdG8gYmluZCBpbnB1dHMgdG8gdGhlIHBsYXllci5cbiAgICBwbGF5ZXJPYnMuc3Vic2NyaWJlKHBsYXllciA9PiB7XG4gICAgICB0aGlzLl9wbGF5ZXIgPSBwbGF5ZXI7XG5cbiAgICAgIGlmIChwbGF5ZXIgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKSB7XG4gICAgICAgIHRoaXMuX2luaXRpYWxpemVQbGF5ZXIocGxheWVyLCB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgfSk7XG5cbiAgICBiaW5kU2l6ZVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG5cbiAgICBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKHBsYXllck9icywgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSk7XG5cbiAgICBiaW5kQ3VlVmlkZW9DYWxsKFxuICAgICAgcGxheWVyT2JzLFxuICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgIHRoaXMuX3N0YXJ0U2Vjb25kcyxcbiAgICAgIHRoaXMuX2VuZFNlY29uZHMsXG4gICAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgdGhpcy5fZGVzdHJveWVkLFxuICAgICk7XG5cbiAgICAvLyBBZnRlciBhbGwgb2YgdGhlIHN1YnNjcmlwdGlvbnMgYXJlIHNldCB1cCwgY29ubmVjdCB0aGUgb2JzZXJ2YWJsZS5cbiAgICAocGxheWVyT2JzIGFzIENvbm5lY3RhYmxlT2JzZXJ2YWJsZTxQbGF5ZXI+KS5jb25uZWN0KCk7XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5uZXh0KHRoaXMueW91dHViZUNvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5kZXN0cm95KCk7XG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s7XG4gICAgfVxuXG4gICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3ZpZGVvSWQuY29tcGxldGUoKTtcbiAgICB0aGlzLl9oZWlnaHQuY29tcGxldGUoKTtcbiAgICB0aGlzLl93aWR0aC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N0YXJ0U2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2VuZFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3BsYXllclZhcnMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5jb21wbGV0ZSgpO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BsYXlWaWRlbyAqL1xuICBwbGF5VmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBsYXlWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUExBWUlORztcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGF1c2VWaWRlbyAqL1xuICBwYXVzZVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3N0b3BWaWRlbyAqL1xuICBzdG9wVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnN0b3BWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJdCBzZWVtcyBsaWtlIFlvdVR1YmUgc2V0cyB0aGUgcGxheWVyIHRvIENVRUQgd2hlbiBpdCdzIHN0b3BwZWQuXG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2Vla1RvICovXG4gIHNlZWtUbyhzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNlZWtUbyhzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnNlZWsgPSB7c2Vjb25kcywgYWxsb3dTZWVrQWhlYWR9O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNtdXRlICovXG4gIG11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLm11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSN1bk11dGUgKi9cbiAgdW5NdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci51bk11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjaXNNdXRlZCAqL1xuICBpc011dGVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuaXNNdXRlZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5tdXRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0Vm9sdW1lICovXG4gIHNldFZvbHVtZSh2b2x1bWU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkudm9sdW1lID0gdm9sdW1lO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWb2x1bWUgKi9cbiAgZ2V0Vm9sdW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRWb2x1bWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0UGxheWJhY2tSYXRlICovXG4gIHNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrUmF0ZSA9IHBsYXliYWNrUmF0ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tSYXRlICovXG4gIGdldFBsYXliYWNrUmF0ZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tSYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMgKi9cbiAgZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0xvYWRlZEZyYWN0aW9uICovXG4gIGdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWVyU3RhdGUgKi9cbiAgZ2V0UGxheWVyU3RhdGUoKTogWVQuUGxheWVyU3RhdGUgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5faXNCcm93c2VyIHx8ICF3aW5kb3cuWVQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlO1xuICAgIH1cblxuICAgIHJldHVybiBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQ7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Q3VycmVudFRpbWUgKi9cbiAgZ2V0Q3VycmVudFRpbWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldEN1cnJlbnRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlaykge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrLnNlY29uZHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tRdWFsaXR5ICovXG4gIGdldFBsYXliYWNrUXVhbGl0eSgpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tRdWFsaXR5KCkgOiAnZGVmYXVsdCc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscyAqL1xuICBnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldER1cmF0aW9uICovXG4gIGdldER1cmF0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXREdXJhdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb1VybCAqL1xuICBnZXRWaWRlb1VybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9VcmwoKSA6ICcnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvRW1iZWRDb2RlICovXG4gIGdldFZpZGVvRW1iZWRDb2RlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0VtYmVkQ29kZSgpIDogJyc7XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYmplY3QgdGhhdCBzaG91bGQgYmUgdXNlZCB0byBzdG9yZSB0aGUgdGVtcG9yYXJ5IEFQSSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfZ2V0UGVuZGluZ1N0YXRlKCk6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gICAgaWYgKCF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGU7XG4gIH1cblxuICAvKiogSW5pdGlhbGl6ZXMgYSBwbGF5ZXIgZnJvbSBhIHRlbXBvcmFyeSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfaW5pdGlhbGl6ZVBsYXllcihwbGF5ZXI6IFlULlBsYXllciwgc3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSk6IHZvaWQge1xuICAgIGNvbnN0IHtwbGF5YmFja1N0YXRlLCBwbGF5YmFja1JhdGUsIHZvbHVtZSwgbXV0ZWQsIHNlZWt9ID0gc3RhdGU7XG5cbiAgICBzd2l0Y2ggKHBsYXliYWNrU3RhdGUpIHtcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUExBWUlORzpcbiAgICAgICAgcGxheWVyLnBsYXlWaWRlbygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUEFVU0VEOlxuICAgICAgICBwbGF5ZXIucGF1c2VWaWRlbygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuQ1VFRDpcbiAgICAgICAgcGxheWVyLnN0b3BWaWRlbygpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9XG5cbiAgICBpZiAodm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9XG5cbiAgICBpZiAobXV0ZWQgIT0gbnVsbCkge1xuICAgICAgbXV0ZWQgPyBwbGF5ZXIubXV0ZSgpIDogcGxheWVyLnVuTXV0ZSgpO1xuICAgIH1cblxuICAgIGlmIChzZWVrICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZWVrVG8oc2Vlay5zZWNvbmRzLCBzZWVrLmFsbG93U2Vla0FoZWFkKTtcbiAgICB9XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYnNlcnZhYmxlIHRoYXQgYWRkcyBhbiBldmVudCBsaXN0ZW5lciB0byB0aGUgcGxheWVyIHdoZW4gYSB1c2VyIHN1YnNjcmliZXMgdG8gaXQuICovXG4gIHByaXZhdGUgX2dldExhenlFbWl0dGVyPFQgZXh0ZW5kcyBZVC5QbGF5ZXJFdmVudD4obmFtZToga2V5b2YgWVQuRXZlbnRzKTogT2JzZXJ2YWJsZTxUPiB7XG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgc3RyZWFtIG9mIHBsYXllcnMuIFRoaXMgd2F5IHRoZSBldmVudHMgd2lsbCBiZSB0cmFuc2ZlcnJlZFxuICAgIC8vIG92ZXIgdG8gdGhlIG5ldyBwbGF5ZXIgaWYgaXQgZ2V0cyBzd2FwcGVkIG91dCB1bmRlci10aGUtaG9vZC5cbiAgICByZXR1cm4gdGhpcy5fcGxheWVyQ2hhbmdlcy5waXBlKFxuICAgICAgLy8gU3dpdGNoIHRvIHRoZSBib3VuZCBldmVudC4gYHN3aXRjaE1hcGAgZW5zdXJlcyB0aGF0IHRoZSBvbGQgZXZlbnQgaXMgcmVtb3ZlZCB3aGVuIHRoZVxuICAgICAgLy8gcGxheWVyIGlzIGNoYW5nZWQuIElmIHRoZXJlJ3Mgbm8gcGxheWVyLCByZXR1cm4gYW4gb2JzZXJ2YWJsZSB0aGF0IG5ldmVyIGVtaXRzLlxuICAgICAgc3dpdGNoTWFwKHBsYXllciA9PiB7XG4gICAgICAgIHJldHVybiBwbGF5ZXJcbiAgICAgICAgICA/IGZyb21FdmVudFBhdHRlcm48VD4oXG4gICAgICAgICAgICAgIChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAobGlzdGVuZXI6IChldmVudDogVCkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBBUEkgc2VlbXMgdG8gdGhyb3cgd2hlbiB3ZSB0cnkgdG8gdW5iaW5kIGZyb20gYSBkZXN0cm95ZWQgcGxheWVyIGFuZCBpdCBkb2Vzbid0XG4gICAgICAgICAgICAgICAgLy8gZXhwb3NlIHdoZXRoZXIgdGhlIHBsYXllciBoYXMgYmVlbiBkZXN0cm95ZWQgc28gd2UgaGF2ZSB0byB3cmFwIGl0IGluIGEgdHJ5L2NhdGNoIHRvXG4gICAgICAgICAgICAgICAgLy8gcHJldmVudCB0aGUgZW50aXJlIHN0cmVhbSBmcm9tIGVycm9yaW5nIG91dC5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgaWYgKChwbGF5ZXIgYXMgUGxheWVyKS5yZW1vdmVFdmVudExpc3RlbmVyISkge1xuICAgICAgICAgICAgICAgICAgICAocGxheWVyIGFzIFBsYXllcikucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKVxuICAgICAgICAgIDogb2JzZXJ2YWJsZU9mPFQ+KCk7XG4gICAgICB9KSxcbiAgICAgIC8vIEJ5IGRlZmF1bHQgd2UgcnVuIGFsbCB0aGUgQVBJIGludGVyYWN0aW9ucyBvdXRzaWRlIHRoZSB6b25lXG4gICAgICAvLyBzbyB3ZSBoYXZlIHRvIGJyaW5nIHRoZSBldmVudHMgYmFjayBpbiBtYW51YWxseSB3aGVuIHRoZXkgZW1pdC5cbiAgICAgIChzb3VyY2U6IE9ic2VydmFibGU8VD4pID0+XG4gICAgICAgIG5ldyBPYnNlcnZhYmxlPFQ+KG9ic2VydmVyID0+XG4gICAgICAgICAgc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgICAgICBuZXh0OiB2YWx1ZSA9PiB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IG9ic2VydmVyLm5leHQodmFsdWUpKSxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvciA9PiBvYnNlcnZlci5lcnJvcihlcnJvciksXG4gICAgICAgICAgICBjb21wbGV0ZTogKCkgPT4gb2JzZXJ2ZXIuY29tcGxldGUoKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgKSxcbiAgICAgIC8vIEVuc3VyZXMgdGhhdCBldmVyeXRoaW5nIGlzIGNsZWFyZWQgb3V0IG9uIGRlc3Ryb3kuXG4gICAgICB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSxcbiAgICApO1xuICB9XG59XG5cbi8qKiBMaXN0ZW5zIHRvIGNoYW5nZXMgdG8gdGhlIGdpdmVuIHdpZHRoIGFuZCBoZWlnaHQgYW5kIHNldHMgaXQgb24gdGhlIHBsYXllci4gKi9cbmZ1bmN0aW9uIGJpbmRTaXplVG9QbGF5ZXIoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB3aWR0aE9icywgaGVpZ2h0T2JzXSkuc3Vic2NyaWJlKFxuICAgIChbcGxheWVyLCB3aWR0aCwgaGVpZ2h0XSkgPT4gcGxheWVyICYmIHBsYXllci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpLFxuICApO1xufVxuXG4vKiogTGlzdGVucyB0byBjaGFuZ2VzIGZyb20gdGhlIHN1Z2dlc3RlZCBxdWFsaXR5IGFuZCBzZXRzIGl0IG9uIHRoZSBnaXZlbiBwbGF5ZXIuICovXG5mdW5jdGlvbiBiaW5kU3VnZ2VzdGVkUXVhbGl0eVRvUGxheWVyKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8WVQuUGxheWVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+LFxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHN1Z2dlc3RlZFF1YWxpdHlPYnNdKS5zdWJzY3JpYmUoXG4gICAgKFtwbGF5ZXIsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PlxuICAgICAgcGxheWVyICYmIHN1Z2dlc3RlZFF1YWxpdHkgJiYgcGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShzdWdnZXN0ZWRRdWFsaXR5KSxcbiAgKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgbG9hZGVkIHBsYXllciBvbmNlIGl0J3MgcmVhZHkuIENlcnRhaW4gcHJvcGVydGllcy9tZXRob2RzXG4gKiB3b24ndCBiZSBhdmFpbGFibGUgdW50aWwgdGhlIGlmcmFtZSBmaW5pc2hlcyBsb2FkaW5nLlxuICogQHBhcmFtIG9uQWJvcnQgQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGludm9rZWQgaWYgdGhlIHBsYXllciBsb2FkaW5nIHdhcyBhYm9ydGVkIGJlZm9yZVxuICogaXQgd2FzIGFibGUgdG8gY29tcGxldGUuIENhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueSBsb29zZSByZWZlcmVuY2VzLlxuICovXG5mdW5jdGlvbiB3YWl0VW50aWxSZWFkeShcbiAgb25BYm9ydDogKHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcikgPT4gdm9pZCxcbik6IE9wZXJhdG9yRnVuY3Rpb248VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCwgUGxheWVyIHwgdW5kZWZpbmVkPiB7XG4gIHJldHVybiBtZXJnZU1hcChwbGF5ZXIgPT4ge1xuICAgIGlmICghcGxheWVyKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mPFBsYXllciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgICB9XG4gICAgaWYgKHBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZihwbGF5ZXIgYXMgUGxheWVyKTtcbiAgICB9XG5cbiAgICAvLyBTaW5jZSByZW1vdmVFdmVudExpc3RlbmVyIGlzIG5vdCBvbiBQbGF5ZXIgd2hlbiBpdCdzIGluaXRpYWxpemVkLCB3ZSBjYW4ndCB1c2UgZnJvbUV2ZW50LlxuICAgIC8vIFRoZSBwbGF5ZXIgaXMgbm90IGluaXRpYWxpemVkIGZ1bGx5IHVudGlsIHRoZSByZWFkeSBpcyBjYWxsZWQuXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBsYXllcj4oZW1pdHRlciA9PiB7XG4gICAgICBsZXQgYWJvcnRlZCA9IGZhbHNlO1xuICAgICAgbGV0IHJlc29sdmVkID0gZmFsc2U7XG4gICAgICBjb25zdCBvblJlYWR5ID0gKGV2ZW50OiBZVC5QbGF5ZXJFdmVudCkgPT4ge1xuICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFhYm9ydGVkKSB7XG4gICAgICAgICAgZXZlbnQudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCBvblJlYWR5KTtcbiAgICAgICAgICBlbWl0dGVyLm5leHQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCBvblJlYWR5KTtcblxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgYWJvcnRlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICAgIG9uQWJvcnQocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5waXBlKHRha2UoMSksIHN0YXJ0V2l0aCh1bmRlZmluZWQpKTtcbiAgfSk7XG59XG5cbi8qKiBDcmVhdGUgYW4gb2JzZXJ2YWJsZSBmb3IgdGhlIHBsYXllciBiYXNlZCBvbiB0aGUgZ2l2ZW4gb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gIHlvdXR1YmVDb250YWluZXI6IE9ic2VydmFibGU8SFRNTEVsZW1lbnQ+LFxuICB2aWRlb0lkT2JzOiBPYnNlcnZhYmxlPHN0cmluZyB8IHVuZGVmaW5lZD4sXG4gIGhvc3RPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgcGxheWVyVmFyc09iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkPixcbiAgbmdab25lOiBOZ1pvbmUsXG4pOiBPYnNlcnZhYmxlPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcbiAgY29uc3QgcGxheWVyT3B0aW9ucyA9IGNvbWJpbmVMYXRlc3QoW3ZpZGVvSWRPYnMsIGhvc3RPYnMsIHBsYXllclZhcnNPYnNdKS5waXBlKFxuICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3dpZHRoT2JzLCBoZWlnaHRPYnNdKSksXG4gICAgbWFwKChbY29uc3RydWN0b3JPcHRpb25zLCBzaXplT3B0aW9uc10pID0+IHtcbiAgICAgIGNvbnN0IFt2aWRlb0lkLCBob3N0LCBwbGF5ZXJWYXJzXSA9IGNvbnN0cnVjdG9yT3B0aW9ucztcbiAgICAgIGNvbnN0IFt3aWR0aCwgaGVpZ2h0XSA9IHNpemVPcHRpb25zO1xuICAgICAgcmV0dXJuIHZpZGVvSWQgPyB7dmlkZW9JZCwgcGxheWVyVmFycywgd2lkdGgsIGhlaWdodCwgaG9zdH0gOiB1bmRlZmluZWQ7XG4gICAgfSksXG4gICk7XG5cbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3lvdXR1YmVDb250YWluZXIsIHBsYXllck9wdGlvbnMsIG9mKG5nWm9uZSldKS5waXBlKFxuICAgIHNraXBVbnRpbFJlbWVtYmVyTGF0ZXN0KGlmcmFtZUFwaUF2YWlsYWJsZU9icyksXG4gICAgc2NhbihzeW5jUGxheWVyU3RhdGUsIHVuZGVmaW5lZCksXG4gICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgKTtcbn1cblxuLyoqIFNraXBzIHRoZSBnaXZlbiBvYnNlcnZhYmxlIHVudGlsIHRoZSBvdGhlciBvYnNlcnZhYmxlIGVtaXRzIHRydWUsIHRoZW4gZW1pdCB0aGUgbGF0ZXN0LiAqL1xuZnVuY3Rpb24gc2tpcFVudGlsUmVtZW1iZXJMYXRlc3Q8VD4obm90aWZpZXI6IE9ic2VydmFibGU8Ym9vbGVhbj4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICByZXR1cm4gcGlwZShcbiAgICBjb21iaW5lTGF0ZXN0T3Aobm90aWZpZXIpLFxuICAgIHNraXBXaGlsZSgoW18sIGRvbmVTa2lwcGluZ10pID0+ICFkb25lU2tpcHBpbmcpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpLFxuICApO1xufVxuXG4vKiogRGVzdHJveSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBubyBvcHRpb25zLCBvciBjcmVhdGUgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIHN5bmNQbGF5ZXJTdGF0ZShcbiAgcGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLFxuICBbY29udGFpbmVyLCB2aWRlb09wdGlvbnMsIG5nWm9uZV06IFtIVE1MRWxlbWVudCwgWVQuUGxheWVyT3B0aW9ucyB8IHVuZGVmaW5lZCwgTmdab25lXSxcbik6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQge1xuICBpZiAoXG4gICAgcGxheWVyICYmXG4gICAgdmlkZW9PcHRpb25zICYmXG4gICAgKHBsYXllci5wbGF5ZXJWYXJzICE9PSB2aWRlb09wdGlvbnMucGxheWVyVmFycyB8fCBwbGF5ZXIuaG9zdCAhPT0gdmlkZW9PcHRpb25zLmhvc3QpXG4gICkge1xuICAgIC8vIFRoZSBwbGF5ZXIgbmVlZHMgdG8gYmUgcmVjcmVhdGVkIGlmIHRoZSBwbGF5ZXJWYXJzIGFyZSBkaWZmZXJlbnQuXG4gICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgfSBlbHNlIGlmICghdmlkZW9PcHRpb25zKSB7XG4gICAgaWYgKHBsYXllcikge1xuICAgICAgLy8gRGVzdHJveSB0aGUgcGxheWVyIGlmIHRoZSB2aWRlb0lkIHdhcyByZW1vdmVkLlxuICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKHBsYXllcikge1xuICAgIHJldHVybiBwbGF5ZXI7XG4gIH1cblxuICAvLyBJbXBvcnRhbnQhIFdlIG5lZWQgdG8gY3JlYXRlIHRoZSBQbGF5ZXIgb2JqZWN0IG91dHNpZGUgb2YgdGhlIGBOZ1pvbmVgLCBiZWNhdXNlIGl0IGtpY2tzXG4gIC8vIG9mZiBhIDI1MG1zIHNldEludGVydmFsIHdoaWNoIHdpbGwgY29udGludWFsbHkgdHJpZ2dlciBjaGFuZ2UgZGV0ZWN0aW9uIGlmIHdlIGRvbid0LlxuICBjb25zdCBuZXdQbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPSBuZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoXG4gICAgKCkgPT4gbmV3IFlULlBsYXllcihjb250YWluZXIsIHZpZGVvT3B0aW9ucyksXG4gICk7XG4gIG5ld1BsYXllci52aWRlb0lkID0gdmlkZW9PcHRpb25zLnZpZGVvSWQ7XG4gIG5ld1BsYXllci5wbGF5ZXJWYXJzID0gdmlkZW9PcHRpb25zLnBsYXllclZhcnM7XG4gIG5ld1BsYXllci5ob3N0ID0gdmlkZW9PcHRpb25zLmhvc3Q7XG4gIHJldHVybiBuZXdQbGF5ZXI7XG59XG5cbi8qKlxuICogQ2FsbCBjdWVWaWRlb0J5SWQgaWYgdGhlIHZpZGVvSWQgY2hhbmdlcywgb3Igd2hlbiBzdGFydCBvciBlbmQgc2Vjb25kcyBjaGFuZ2UuIGN1ZVZpZGVvQnlJZCB3aWxsXG4gKiBjaGFuZ2UgdGhlIGxvYWRlZCB2aWRlbyBpZCB0byB0aGUgZ2l2ZW4gdmlkZW9JZCwgYW5kIHNldCB0aGUgc3RhcnQgYW5kIGVuZCB0aW1lcyB0byB0aGUgZ2l2ZW5cbiAqIHN0YXJ0L2VuZCBzZWNvbmRzLlxuICovXG5mdW5jdGlvbiBiaW5kQ3VlVmlkZW9DYWxsKFxuICBwbGF5ZXJPYnM6IE9ic2VydmFibGU8UGxheWVyIHwgdW5kZWZpbmVkPixcbiAgdmlkZW9JZE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBzdGFydFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgZW5kU2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4sXG4gIGRlc3Ryb3llZDogT2JzZXJ2YWJsZTx2b2lkPixcbikge1xuICBjb25zdCBjdWVPcHRpb25zT2JzID0gY29tYmluZUxhdGVzdChbc3RhcnRTZWNvbmRzT2JzLCBlbmRTZWNvbmRzT2JzXSkucGlwZShcbiAgICBtYXAoKFtzdGFydFNlY29uZHMsIGVuZFNlY29uZHNdKSA9PiAoe3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc30pKSxcbiAgKTtcblxuICAvLyBPbmx5IHJlc3BvbmQgdG8gY2hhbmdlcyBpbiBjdWUgb3B0aW9ucyBpZiB0aGUgcGxheWVyIGlzIG5vdCBydW5uaW5nLlxuICBjb25zdCBmaWx0ZXJlZEN1ZU9wdGlvbnMgPSBjdWVPcHRpb25zT2JzLnBpcGUoXG4gICAgZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIHBsYXllciA9PiAhIXBsYXllciAmJiAhaGFzUGxheWVyU3RhcnRlZChwbGF5ZXIpKSxcbiAgKTtcblxuICAvLyBJZiB0aGUgdmlkZW8gaWQgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGUgcGxheWVyXG4gIC8vIHdhcyBpbml0aWFsaXplZCB3aXRoIGEgZGlmZmVyZW50IHZpZGVvIGlkLlxuICBjb25zdCBjaGFuZ2VkVmlkZW9JZCA9IHZpZGVvSWRPYnMucGlwZShcbiAgICBmaWx0ZXJPbk90aGVyKHBsYXllck9icywgKHBsYXllciwgdmlkZW9JZCkgPT4gISFwbGF5ZXIgJiYgcGxheWVyLnZpZGVvSWQgIT09IHZpZGVvSWQpLFxuICApO1xuXG4gIC8vIElmIHRoZSBwbGF5ZXIgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGVyZSBhcmUgY3VlIG9wdGlvbnMuXG4gIGNvbnN0IGNoYW5nZWRQbGF5ZXIgPSBwbGF5ZXJPYnMucGlwZShcbiAgICBmaWx0ZXJPbk90aGVyKFxuICAgICAgY29tYmluZUxhdGVzdChbdmlkZW9JZE9icywgY3VlT3B0aW9uc09ic10pLFxuICAgICAgKFt2aWRlb0lkLCBjdWVPcHRpb25zXSwgcGxheWVyKSA9PlxuICAgICAgICAhIXBsYXllciAmJlxuICAgICAgICAodmlkZW9JZCAhPSBwbGF5ZXIudmlkZW9JZCB8fCAhIWN1ZU9wdGlvbnMuc3RhcnRTZWNvbmRzIHx8ICEhY3VlT3B0aW9ucy5lbmRTZWNvbmRzKSxcbiAgICApLFxuICApO1xuXG4gIG1lcmdlKGNoYW5nZWRQbGF5ZXIsIGNoYW5nZWRWaWRlb0lkLCBmaWx0ZXJlZEN1ZU9wdGlvbnMpXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHZpZGVvSWRPYnMsIGN1ZU9wdGlvbnNPYnMsIHN1Z2dlc3RlZFF1YWxpdHlPYnNdKSksXG4gICAgICBtYXAoKFtfLCB2YWx1ZXNdKSA9PiB2YWx1ZXMpLFxuICAgICAgdGFrZVVudGlsKGRlc3Ryb3llZCksXG4gICAgKVxuICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHZpZGVvSWQsIGN1ZU9wdGlvbnMsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PiB7XG4gICAgICBpZiAoIXZpZGVvSWQgfHwgIXBsYXllcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwbGF5ZXIudmlkZW9JZCA9IHZpZGVvSWQ7XG4gICAgICBwbGF5ZXIuY3VlVmlkZW9CeUlkKHtcbiAgICAgICAgdmlkZW9JZCxcbiAgICAgICAgc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgICAgLi4uY3VlT3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNQbGF5ZXJTdGFydGVkKHBsYXllcjogWVQuUGxheWVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHN0YXRlID0gcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gIHJldHVybiBzdGF0ZSAhPT0gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEICYmIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xufVxuXG5mdW5jdGlvbiBwbGF5ZXJJc1JlYWR5KHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcik6IHBsYXllciBpcyBQbGF5ZXIge1xuICByZXR1cm4gJ2dldFBsYXllclN0YXR1cycgaW4gcGxheWVyO1xufVxuXG4vKiogQ29tYmluZXMgdGhlIHR3byBvYnNlcnZhYmxlcyB0ZW1wb3JhcmlseSBmb3IgdGhlIGZpbHRlciBmdW5jdGlvbi4gKi9cbmZ1bmN0aW9uIGZpbHRlck9uT3RoZXI8UiwgVD4oXG4gIG90aGVyT2JzOiBPYnNlcnZhYmxlPFQ+LFxuICBmaWx0ZXJGbjogKHQ6IFQsIHI/OiBSKSA9PiBib29sZWFuLFxuKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFI+IHtcbiAgcmV0dXJuIHBpcGUoXG4gICAgd2l0aExhdGVzdEZyb20ob3RoZXJPYnMpLFxuICAgIGZpbHRlcigoW3ZhbHVlLCBvdGhlcl0pID0+IGZpbHRlckZuKG90aGVyLCB2YWx1ZSkpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpLFxuICApO1xufVxuIl19