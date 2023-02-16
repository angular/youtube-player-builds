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
YouTubePlayer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "15.2.0-rc.0", ngImport: i0, type: YouTubePlayer, deps: [{ token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component });
YouTubePlayer.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "15.2.0-rc.0", type: YouTubePlayer, selector: "youtube-player", inputs: { videoId: "videoId", height: "height", width: "width", startSeconds: "startSeconds", endSeconds: "endSeconds", suggestedQuality: "suggestedQuality", playerVars: "playerVars", disableCookies: "disableCookies", showBeforeIframeApiLoads: "showBeforeIframeApiLoads" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true }], ngImport: i0, template: '<div #youtubeContainer></div>', isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "15.2.0-rc.0", ngImport: i0, type: YouTubePlayer, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU0EsaUNBQWlDO0FBVGpDOzs7Ozs7R0FNRztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsTUFBTSxFQUNOLFdBQVcsR0FDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUMsaUJBQWlCLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUVsRCxPQUFPLEVBQ0wsYUFBYSxFQUViLEtBQUssRUFFTCxVQUFVLEVBQ1YsRUFBRSxJQUFJLFlBQVksRUFFbEIsSUFBSSxFQUNKLE9BQU8sRUFDUCxFQUFFLEVBQ0YsZUFBZSxFQUNmLGdCQUFnQixHQUNqQixNQUFNLE1BQU0sQ0FBQztBQUVkLE9BQU8sRUFDTCxhQUFhLElBQUksZUFBZSxFQUNoQyxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEVBQ2QsU0FBUyxFQUNULEdBQUcsRUFDSCxRQUFRLEdBQ1QsTUFBTSxnQkFBZ0IsQ0FBQzs7QUFTeEIsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztBQTZCekM7Ozs7R0FJRztBQVFILE1BQU0sT0FBTyxhQUFhO0lBVXhCLCtCQUErQjtJQUMvQixJQUNJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0lBQzdCLENB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bEQsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQ3hCLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIFdvcmthcm91bmQgZm9yOiBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzEyNjVcbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwieW91dHViZVwiIC8+XG5cbmltcG9ydCB7XG4gIEFmdGVyVmlld0luaXQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIEluamVjdCxcbiAgUExBVEZPUk1fSUQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtpc1BsYXRmb3JtQnJvd3Nlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCxcbiAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLFxuICBtZXJnZSxcbiAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLFxuICBPYnNlcnZhYmxlLFxuICBvZiBhcyBvYnNlcnZhYmxlT2YsXG4gIE9wZXJhdG9yRnVuY3Rpb24sXG4gIHBpcGUsXG4gIFN1YmplY3QsXG4gIG9mLFxuICBCZWhhdmlvclN1YmplY3QsXG4gIGZyb21FdmVudFBhdHRlcm4sXG59IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0IGFzIGNvbWJpbmVMYXRlc3RPcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIGZpbHRlcixcbiAgbWFwLFxuICBwdWJsaXNoLFxuICBzY2FuLFxuICBza2lwV2hpbGUsXG4gIHN0YXJ0V2l0aCxcbiAgdGFrZSxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgc3dpdGNoTWFwLFxuICB0YXAsXG4gIG1lcmdlTWFwLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgWVQ6IHR5cGVvZiBZVCB8IHVuZGVmaW5lZDtcbiAgICBvbllvdVR1YmVJZnJhbWVBUElSZWFkeTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9XSURUSCA9IDY0MDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9IRUlHSFQgPSAzOTA7XG5cbi8vIFRoZSBuYXRpdmUgWVQuUGxheWVyIGRvZXNuJ3QgZXhwb3NlIHRoZSBzZXQgdmlkZW9JZCwgYnV0IHdlIG5lZWQgaXQgZm9yXG4vLyBjb252ZW5pZW5jZS5cbmludGVyZmFjZSBQbGF5ZXIgZXh0ZW5kcyBZVC5QbGF5ZXIge1xuICB2aWRlb0lkPzogc3RyaW5nO1xuICBwbGF5ZXJWYXJzPzogWVQuUGxheWVyVmFycztcbiAgaG9zdD86IHN0cmluZztcbn1cblxuLy8gVGhlIHBsYXllciBpc24ndCBmdWxseSBpbml0aWFsaXplZCB3aGVuIGl0J3MgY29uc3RydWN0ZWQuXG4vLyBUaGUgb25seSBmaWVsZCBhdmFpbGFibGUgaXMgZGVzdHJveSBhbmQgYWRkRXZlbnRMaXN0ZW5lci5cbnR5cGUgVW5pbml0aWFsaXplZFBsYXllciA9IFBpY2s8XG4gIFBsYXllcixcbiAgJ3ZpZGVvSWQnIHwgJ3BsYXllclZhcnMnIHwgJ2Rlc3Ryb3knIHwgJ2FkZEV2ZW50TGlzdGVuZXInIHwgJ2hvc3QnXG4+O1xuXG4vKipcbiAqIE9iamVjdCB1c2VkIHRvIHN0b3JlIHRoZSBzdGF0ZSBvZiB0aGUgcGxheWVyIGlmIHRoZVxuICogdXNlciB0cmllcyB0byBpbnRlcmFjdCB3aXRoIHRoZSBBUEkgYmVmb3JlIGl0IGhhcyBiZWVuIGxvYWRlZC5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gIHBsYXliYWNrU3RhdGU/OiBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HIHwgWVQuUGxheWVyU3RhdGUuUEFVU0VEIHwgWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgcGxheWJhY2tSYXRlPzogbnVtYmVyO1xuICB2b2x1bWU/OiBudW1iZXI7XG4gIG11dGVkPzogYm9vbGVhbjtcbiAgc2Vlaz86IHtzZWNvbmRzOiBudW1iZXI7IGFsbG93U2Vla0FoZWFkOiBib29sZWFufTtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNvbXBvbmVudCB0aGF0IHJlbmRlcnMgYSBZb3VUdWJlIHBsYXllciB2aWEgdGhlIFlvdVR1YmUgcGxheWVyXG4gKiBpZnJhbWUgQVBJLlxuICogQHNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlXG4gKi9cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ3lvdXR1YmUtcGxheWVyJyxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIC8vIFRoaXMgZGl2IGlzICpyZXBsYWNlZCogYnkgdGhlIFlvdVR1YmUgcGxheWVyIGVtYmVkLlxuICB0ZW1wbGF0ZTogJzxkaXYgI3lvdXR1YmVDb250YWluZXI+PC9kaXY+Jyxcbn0pXG5leHBvcnQgY2xhc3MgWW91VHViZVBsYXllciBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSwgT25Jbml0IHtcbiAgLyoqIFdoZXRoZXIgd2UncmUgY3VycmVudGx5IHJlbmRlcmluZyBpbnNpZGUgYSBicm93c2VyLiAqL1xuICBwcml2YXRlIF9pc0Jyb3dzZXI6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVhZG9ubHkgX3lvdXR1YmVDb250YWluZXIgPSBuZXcgU3ViamVjdDxIVE1MRWxlbWVudD4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBfZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSBfcGxheWVyOiBQbGF5ZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjazogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wZW5kaW5nUGxheWVyU3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByZWFkb25seSBfcGxheWVyQ2hhbmdlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogWW91VHViZSBWaWRlbyBJRCB0byB2aWV3ICovXG4gIEBJbnB1dCgpXG4gIGdldCB2aWRlb0lkKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX3ZpZGVvSWQudmFsdWU7XG4gIH1cbiAgc2V0IHZpZGVvSWQodmlkZW9JZDogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fdmlkZW9JZC5uZXh0KHZpZGVvSWQpO1xuICB9XG4gIHByaXZhdGUgcmVhZG9ubHkgX3ZpZGVvSWQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZyB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogSGVpZ2h0IG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2hlaWdodC52YWx1ZTtcbiAgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5faGVpZ2h0Lm5leHQoaGVpZ2h0IHx8IERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG4gIH1cbiAgcHJpdmF0ZSByZWFkb25seSBfaGVpZ2h0ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG5cbiAgLyoqIFdpZHRoIG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGgudmFsdWU7XG4gIH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl93aWR0aC5uZXh0KHdpZHRoIHx8IERFRkFVTFRfUExBWUVSX1dJRFRIKTtcbiAgfVxuICBwcml2YXRlIHJlYWRvbmx5IF93aWR0aCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9XSURUSCk7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0YXJ0IHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IHN0YXJ0U2Vjb25kcyhzdGFydFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N0YXJ0U2Vjb25kcy5uZXh0KHN0YXJ0U2Vjb25kcyk7XG4gIH1cbiAgcHJpdmF0ZSByZWFkb25seSBfc3RhcnRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBtb21lbnQgd2hlbiB0aGUgcGxheWVyIGlzIHN1cHBvc2VkIHRvIHN0b3AgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgZW5kU2Vjb25kcyhlbmRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9lbmRTZWNvbmRzLm5leHQoZW5kU2Vjb25kcyk7XG4gIH1cbiAgcHJpdmF0ZSByZWFkb25seSBfZW5kU2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgc3VnZ2VzdGVkIHF1YWxpdHkgb2YgdGhlIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBzZXQgc3VnZ2VzdGVkUXVhbGl0eShzdWdnZXN0ZWRRdWFsaXR5OiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5Lm5leHQoc3VnZ2VzdGVkUXVhbGl0eSk7XG4gIH1cbiAgcHJpdmF0ZSByZWFkb25seSBfc3VnZ2VzdGVkUXVhbGl0eSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPihcbiAgICB1bmRlZmluZWQsXG4gICk7XG5cbiAgLyoqXG4gICAqIEV4dHJhIHBhcmFtZXRlcnMgdXNlZCB0byBjb25maWd1cmUgdGhlIHBsYXllci4gU2VlOlxuICAgKiBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL3BsYXllcl9wYXJhbWV0ZXJzLmh0bWw/cGxheWVyVmVyc2lvbj1IVE1MNSNQYXJhbWV0ZXJzXG4gICAqL1xuICBASW5wdXQoKVxuICBnZXQgcGxheWVyVmFycygpOiBZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyVmFycy52YWx1ZTtcbiAgfVxuICBzZXQgcGxheWVyVmFycyhwbGF5ZXJWYXJzOiBZVC5QbGF5ZXJWYXJzIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fcGxheWVyVmFycy5uZXh0KHBsYXllclZhcnMpO1xuICB9XG4gIHByaXZhdGUgX3BsYXllclZhcnMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlBsYXllclZhcnMgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFdoZXRoZXIgY29va2llcyBpbnNpZGUgdGhlIHBsYXllciBoYXZlIGJlZW4gZGlzYWJsZWQuICovXG4gIEBJbnB1dCgpXG4gIGdldCBkaXNhYmxlQ29va2llcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzYWJsZUNvb2tpZXMudmFsdWU7XG4gIH1cbiAgc2V0IGRpc2FibGVDb29raWVzKHZhbHVlOiB1bmtub3duKSB7XG4gICAgdGhpcy5fZGlzYWJsZUNvb2tpZXMubmV4dCghIXZhbHVlKTtcbiAgfVxuICBwcml2YXRlIHJlYWRvbmx5IF9kaXNhYmxlQ29va2llcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Ym9vbGVhbj4oZmFsc2UpO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBpZnJhbWUgd2lsbCBhdHRlbXB0IHRvIGxvYWQgcmVnYXJkbGVzcyBvZiB0aGUgc3RhdHVzIG9mIHRoZSBhcGkgb24gdGhlXG4gICAqIHBhZ2UuIFNldCB0aGlzIHRvIHRydWUgaWYgeW91IGRvbid0IHdhbnQgdGhlIGBvbllvdVR1YmVJZnJhbWVBUElSZWFkeWAgZmllbGQgdG8gYmVcbiAgICogc2V0IG9uIHRoZSBnbG9iYWwgd2luZG93LlxuICAgKi9cbiAgQElucHV0KCkgc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzOiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBPdXRwdXRzIGFyZSBkaXJlY3QgcHJveGllcyBmcm9tIHRoZSBwbGF5ZXIgaXRzZWxmLiAqL1xuICBAT3V0cHV0KCkgcmVhZG9ubHkgcmVhZHk6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uUmVhZHknKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgc3RhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25TdGF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50Pignb25TdGF0ZUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSByZWFkb25seSBlcnJvcjogT2JzZXJ2YWJsZTxZVC5PbkVycm9yRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PbkVycm9yRXZlbnQ+KCdvbkVycm9yJyk7XG5cbiAgQE91dHB1dCgpIHJlYWRvbmx5IGFwaUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25BcGlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tRdWFsaXR5Q2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcmVhZG9ubHkgcGxheWJhY2tSYXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUmF0ZUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1JhdGVDaGFuZ2UnKTtcblxuICAvKiogVGhlIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHJlcGxhY2VkIGJ5IHRoZSBpZnJhbWUuICovXG4gIEBWaWV3Q2hpbGQoJ3lvdXR1YmVDb250YWluZXInKVxuICB5b3V0dWJlQ29udGFpbmVyOiBFbGVtZW50UmVmPEhUTUxFbGVtZW50PjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSwgQEluamVjdChQTEFURk9STV9JRCkgcGxhdGZvcm1JZDogT2JqZWN0KSB7XG4gICAgdGhpcy5faXNCcm93c2VyID0gaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCk7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBub3QgaW4gYSBicm93c2VyIGVudmlyb25tZW50LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGlmcmFtZUFwaUF2YWlsYWJsZU9iczogT2JzZXJ2YWJsZTxib29sZWFuPiA9IG9ic2VydmFibGVPZih0cnVlKTtcbiAgICBpZiAoIXdpbmRvdy5ZVCB8fCAhd2luZG93LllULlBsYXllcikge1xuICAgICAgaWYgKHRoaXMuc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzICYmICh0eXBlb2YgbmdEZXZNb2RlID09PSAndW5kZWZpbmVkJyB8fCBuZ0Rldk1vZGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnTmFtZXNwYWNlIFlUIG5vdCBmb3VuZCwgY2Fubm90IGNvbnN0cnVjdCBlbWJlZGRlZCB5b3V0dWJlIHBsYXllci4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIGluc3RhbGwgdGhlIFlvdVR1YmUgUGxheWVyIEFQSSBSZWZlcmVuY2UgZm9yIGlmcmFtZSBFbWJlZHM6ICcgK1xuICAgICAgICAgICAgJ2h0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UnLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8Ym9vbGVhbj4oKTtcbiAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjayA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblxuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbmdab25lLnJ1bigoKSA9PiBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0Lm5leHQodHJ1ZSkpO1xuICAgICAgfTtcbiAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyA9IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgoZmFsc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0T2JzZXJ2YWJsZSA9IHRoaXMuX2Rpc2FibGVDb29raWVzLnBpcGUoXG4gICAgICBtYXAoY29va2llc0Rpc2FibGVkID0+IChjb29raWVzRGlzYWJsZWQgPyAnaHR0cHM6Ly93d3cueW91dHViZS1ub2Nvb2tpZS5jb20nIDogdW5kZWZpbmVkKSksXG4gICAgKTtcblxuICAgIC8vIEFuIG9ic2VydmFibGUgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgcGxheWVyLlxuICAgIGNvbnN0IHBsYXllck9icyA9IGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gICAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLFxuICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgIGhvc3RPYnNlcnZhYmxlLFxuICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzLFxuICAgICAgdGhpcy5fd2lkdGgsXG4gICAgICB0aGlzLl9oZWlnaHQsXG4gICAgICB0aGlzLl9wbGF5ZXJWYXJzLFxuICAgICAgdGhpcy5fbmdab25lLFxuICAgICkucGlwZShcbiAgICAgIHRhcChwbGF5ZXIgPT4ge1xuICAgICAgICAvLyBFbWl0IHRoaXMgYmVmb3JlIHRoZSBgd2FpdFVudGlsUmVhZHlgIGNhbGwgc28gdGhhdCB3ZSBjYW4gYmluZCB0b1xuICAgICAgICAvLyBldmVudHMgdGhhdCBoYXBwZW4gYXMgdGhlIHBsYXllciBpcyBiZWluZyBpbml0aWFsaXplZCAoZS5nLiBgb25SZWFkeWApLlxuICAgICAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLm5leHQocGxheWVyKTtcbiAgICAgIH0pLFxuICAgICAgd2FpdFVudGlsUmVhZHkocGxheWVyID0+IHtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgcGxheWVyIGlmIGxvYWRpbmcgd2FzIGFib3J0ZWQgc28gdGhhdCB3ZSBkb24ndCBlbmQgdXAgbGVha2luZyBtZW1vcnkuXG4gICAgICAgIGlmICghcGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSxcbiAgICAgIHB1Ymxpc2goKSxcbiAgICApO1xuXG4gICAgLy8gU2V0IHVwIHNpZGUgZWZmZWN0cyB0byBiaW5kIGlucHV0cyB0byB0aGUgcGxheWVyLlxuICAgIHBsYXllck9icy5zdWJzY3JpYmUocGxheWVyID0+IHtcbiAgICAgIHRoaXMuX3BsYXllciA9IHBsYXllcjtcblxuICAgICAgaWYgKHBsYXllciAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZVBsYXllcihwbGF5ZXIsIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIGJpbmRTaXplVG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5KTtcblxuICAgIGJpbmRDdWVWaWRlb0NhbGwoXG4gICAgICBwbGF5ZXJPYnMsXG4gICAgICB0aGlzLl92aWRlb0lkLFxuICAgICAgdGhpcy5fc3RhcnRTZWNvbmRzLFxuICAgICAgdGhpcy5fZW5kU2Vjb25kcyxcbiAgICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHksXG4gICAgICB0aGlzLl9kZXN0cm95ZWQsXG4gICAgKTtcblxuICAgIC8vIEFmdGVyIGFsbCBvZiB0aGUgc3Vic2NyaXB0aW9ucyBhcmUgc2V0IHVwLCBjb25uZWN0IHRoZSBvYnNlcnZhYmxlLlxuICAgIChwbGF5ZXJPYnMgYXMgQ29ubmVjdGFibGVPYnNlcnZhYmxlPFBsYXllcj4pLmNvbm5lY3QoKTtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLm5leHQodGhpcy55b3V0dWJlQ29udGFpbmVyLm5hdGl2ZUVsZW1lbnQpO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9IHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaztcbiAgICB9XG5cbiAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fdmlkZW9JZC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2hlaWdodC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3dpZHRoLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkuY29tcGxldGUoKTtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fcGxheWVyVmFycy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5uZXh0KCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLmNvbXBsZXRlKCk7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGxheVZpZGVvICovXG4gIHBsYXlWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwYXVzZVZpZGVvICovXG4gIHBhdXNlVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBhdXNlVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBBVVNFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc3RvcFZpZGVvICovXG4gIHN0b3BWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEl0IHNlZW1zIGxpa2UgWW91VHViZSBzZXRzIHRoZSBwbGF5ZXIgdG8gQ1VFRCB3aGVuIGl0J3Mgc3RvcHBlZC5cbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZWVrVG8gKi9cbiAgc2Vla1RvKHNlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2Vla1RvKHNlY29uZHMsIGFsbG93U2Vla0FoZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkuc2VlayA9IHtzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI211dGUgKi9cbiAgbXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIubXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3VuTXV0ZSAqL1xuICB1bk11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnVuTXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNpc011dGVkICovXG4gIGlzTXV0ZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5pc011dGVkKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLm11dGVkO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRWb2x1bWUgKi9cbiAgc2V0Vm9sdW1lKHZvbHVtZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS52b2x1bWUgPSB2b2x1bWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZvbHVtZSAqL1xuICBnZXRWb2x1bWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFZvbHVtZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRQbGF5YmFja1JhdGUgKi9cbiAgc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tSYXRlID0gcGxheWJhY2tSYXRlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1JhdGUgKi9cbiAgZ2V0UGxheWJhY2tSYXRlKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1JhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcyAqL1xuICBnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvTG9hZGVkRnJhY3Rpb24gKi9cbiAgZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5ZXJTdGF0ZSAqL1xuICBnZXRQbGF5ZXJTdGF0ZSgpOiBZVC5QbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIgfHwgIXdpbmRvdy5ZVCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFlULlBsYXllclN0YXRlLlVOU1RBUlRFRDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRDdXJyZW50VGltZSAqL1xuICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWsuc2Vjb25kcztcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1F1YWxpdHkgKi9cbiAgZ2V0UGxheWJhY2tRdWFsaXR5KCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1F1YWxpdHkoKSA6ICdkZWZhdWx0JztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzICovXG4gIGdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5W10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0RHVyYXRpb24gKi9cbiAgZ2V0RHVyYXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldER1cmF0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvVXJsICovXG4gIGdldFZpZGVvVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb1VybCgpIDogJyc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9FbWJlZENvZGUgKi9cbiAgZ2V0VmlkZW9FbWJlZENvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvRW1iZWRDb2RlKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSB1c2VkIHRvIHN0b3JlIHRoZSB0ZW1wb3JhcnkgQVBJIHN0YXRlLiAqL1xuICBwcml2YXRlIF9nZXRQZW5kaW5nU3RhdGUoKTogUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgICBpZiAoIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZTtcbiAgfVxuXG4gIC8qKiBJbml0aWFsaXplcyBhIHBsYXllciBmcm9tIGEgdGVtcG9yYXJ5IHN0YXRlLiAqL1xuICBwcml2YXRlIF9pbml0aWFsaXplUGxheWVyKHBsYXllcjogWVQuUGxheWVyLCBzdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlKTogdm9pZCB7XG4gICAgY29uc3Qge3BsYXliYWNrU3RhdGUsIHBsYXliYWNrUmF0ZSwgdm9sdW1lLCBtdXRlZCwgc2Vla30gPSBzdGF0ZTtcblxuICAgIHN3aXRjaCAocGxheWJhY2tTdGF0ZSkge1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HOlxuICAgICAgICBwbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ6XG4gICAgICAgIHBsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5DVUVEOlxuICAgICAgICBwbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH1cblxuICAgIGlmICh2b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH1cblxuICAgIGlmIChtdXRlZCAhPSBudWxsKSB7XG4gICAgICBtdXRlZCA/IHBsYXllci5tdXRlKCkgOiBwbGF5ZXIudW5NdXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlZWsgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNlZWtUbyhzZWVrLnNlY29uZHMsIHNlZWsuYWxsb3dTZWVrQWhlYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9ic2VydmFibGUgdGhhdCBhZGRzIGFuIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBwbGF5ZXIgd2hlbiBhIHVzZXIgc3Vic2NyaWJlcyB0byBpdC4gKi9cbiAgcHJpdmF0ZSBfZ2V0TGF6eUVtaXR0ZXI8VCBleHRlbmRzIFlULlBsYXllckV2ZW50PihuYW1lOiBrZXlvZiBZVC5FdmVudHMpOiBPYnNlcnZhYmxlPFQ+IHtcbiAgICAvLyBTdGFydCB3aXRoIHRoZSBzdHJlYW0gb2YgcGxheWVycy4gVGhpcyB3YXkgdGhlIGV2ZW50cyB3aWxsIGJlIHRyYW5zZmVycmVkXG4gICAgLy8gb3ZlciB0byB0aGUgbmV3IHBsYXllciBpZiBpdCBnZXRzIHN3YXBwZWQgb3V0IHVuZGVyLXRoZS1ob29kLlxuICAgIHJldHVybiB0aGlzLl9wbGF5ZXJDaGFuZ2VzLnBpcGUoXG4gICAgICAvLyBTd2l0Y2ggdG8gdGhlIGJvdW5kIGV2ZW50LiBgc3dpdGNoTWFwYCBlbnN1cmVzIHRoYXQgdGhlIG9sZCBldmVudCBpcyByZW1vdmVkIHdoZW4gdGhlXG4gICAgICAvLyBwbGF5ZXIgaXMgY2hhbmdlZC4gSWYgdGhlcmUncyBubyBwbGF5ZXIsIHJldHVybiBhbiBvYnNlcnZhYmxlIHRoYXQgbmV2ZXIgZW1pdHMuXG4gICAgICBzd2l0Y2hNYXAocGxheWVyID0+IHtcbiAgICAgICAgcmV0dXJuIHBsYXllclxuICAgICAgICAgID8gZnJvbUV2ZW50UGF0dGVybjxUPihcbiAgICAgICAgICAgICAgKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICAgICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVGhlIEFQSSBzZWVtcyB0byB0aHJvdyB3aGVuIHdlIHRyeSB0byB1bmJpbmQgZnJvbSBhIGRlc3Ryb3llZCBwbGF5ZXIgYW5kIGl0IGRvZXNuJ3RcbiAgICAgICAgICAgICAgICAvLyBleHBvc2Ugd2hldGhlciB0aGUgcGxheWVyIGhhcyBiZWVuIGRlc3Ryb3llZCBzbyB3ZSBoYXZlIHRvIHdyYXAgaXQgaW4gYSB0cnkvY2F0Y2ggdG9cbiAgICAgICAgICAgICAgICAvLyBwcmV2ZW50IHRoZSBlbnRpcmUgc3RyZWFtIGZyb20gZXJyb3Jpbmcgb3V0LlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBpZiAoKHBsYXllciBhcyBQbGF5ZXIpLnJlbW92ZUV2ZW50TGlzdGVuZXIhKSB7XG4gICAgICAgICAgICAgICAgICAgIChwbGF5ZXIgYXMgUGxheWVyKS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApXG4gICAgICAgICAgOiBvYnNlcnZhYmxlT2Y8VD4oKTtcbiAgICAgIH0pLFxuICAgICAgLy8gQnkgZGVmYXVsdCB3ZSBydW4gYWxsIHRoZSBBUEkgaW50ZXJhY3Rpb25zIG91dHNpZGUgdGhlIHpvbmVcbiAgICAgIC8vIHNvIHdlIGhhdmUgdG8gYnJpbmcgdGhlIGV2ZW50cyBiYWNrIGluIG1hbnVhbGx5IHdoZW4gdGhleSBlbWl0LlxuICAgICAgKHNvdXJjZTogT2JzZXJ2YWJsZTxUPikgPT5cbiAgICAgICAgbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT5cbiAgICAgICAgICBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgICAgIG5leHQ6IHZhbHVlID0+IHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gb2JzZXJ2ZXIubmV4dCh2YWx1ZSkpLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yID0+IG9ic2VydmVyLmVycm9yKGVycm9yKSxcbiAgICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiBvYnNlcnZlci5jb21wbGV0ZSgpLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICAgLy8gRW5zdXJlcyB0aGF0IGV2ZXJ5dGhpbmcgaXMgY2xlYXJlZCBvdXQgb24gZGVzdHJveS5cbiAgICAgIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpLFxuICAgICk7XG4gIH1cbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyB0byB0aGUgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCBhbmQgc2V0cyBpdCBvbiB0aGUgcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFNpemVUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHdpZHRoT2JzLCBoZWlnaHRPYnNdKS5zdWJzY3JpYmUoXG4gICAgKFtwbGF5ZXIsIHdpZHRoLCBoZWlnaHRdKSA9PiBwbGF5ZXIgJiYgcGxheWVyLnNldFNpemUod2lkdGgsIGhlaWdodCksXG4gICk7XG59XG5cbi8qKiBMaXN0ZW5zIHRvIGNoYW5nZXMgZnJvbSB0aGUgc3VnZ2VzdGVkIHF1YWxpdHkgYW5kIHNldHMgaXQgb24gdGhlIGdpdmVuIHBsYXllci4gKi9cbmZ1bmN0aW9uIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4sXG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgc3VnZ2VzdGVkUXVhbGl0eU9ic10pLnN1YnNjcmliZShcbiAgICAoW3BsYXllciwgc3VnZ2VzdGVkUXVhbGl0eV0pID0+XG4gICAgICBwbGF5ZXIgJiYgc3VnZ2VzdGVkUXVhbGl0eSAmJiBwbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHkpLFxuICApO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSB0aGF0IGVtaXRzIHRoZSBsb2FkZWQgcGxheWVyIG9uY2UgaXQncyByZWFkeS4gQ2VydGFpbiBwcm9wZXJ0aWVzL21ldGhvZHNcbiAqIHdvbid0IGJlIGF2YWlsYWJsZSB1bnRpbCB0aGUgaWZyYW1lIGZpbmlzaGVzIGxvYWRpbmcuXG4gKiBAcGFyYW0gb25BYm9ydCBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgaW52b2tlZCBpZiB0aGUgcGxheWVyIGxvYWRpbmcgd2FzIGFib3J0ZWQgYmVmb3JlXG4gKiBpdCB3YXMgYWJsZSB0byBjb21wbGV0ZS4gQ2FuIGJlIHVzZWQgdG8gY2xlYW4gdXAgYW55IGxvb3NlIHJlZmVyZW5jZXMuXG4gKi9cbmZ1bmN0aW9uIHdhaXRVbnRpbFJlYWR5KFxuICBvbkFib3J0OiAocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKSA9PiB2b2lkLFxuKTogT3BlcmF0b3JGdW5jdGlvbjxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLCBQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcbiAgcmV0dXJuIG1lcmdlTWFwKHBsYXllciA9PiB7XG4gICAgaWYgKCFwbGF5ZXIpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2Y8UGxheWVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mKHBsYXllciBhcyBQbGF5ZXIpO1xuICAgIH1cblxuICAgIC8vIFNpbmNlIHJlbW92ZUV2ZW50TGlzdGVuZXIgaXMgbm90IG9uIFBsYXllciB3aGVuIGl0J3MgaW5pdGlhbGl6ZWQsIHdlIGNhbid0IHVzZSBmcm9tRXZlbnQuXG4gICAgLy8gVGhlIHBsYXllciBpcyBub3QgaW5pdGlhbGl6ZWQgZnVsbHkgdW50aWwgdGhlIHJlYWR5IGlzIGNhbGxlZC5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGxheWVyPihlbWl0dGVyID0+IHtcbiAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG4gICAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IFlULlBsYXllckV2ZW50KSA9PiB7XG4gICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIWFib3J0ZWQpIHtcbiAgICAgICAgICBldmVudC50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuICAgICAgICAgIGVtaXR0ZXIubmV4dChldmVudC50YXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgb25BYm9ydChwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKHVuZGVmaW5lZCkpO1xuICB9KTtcbn1cblxuLyoqIENyZWF0ZSBhbiBvYnNlcnZhYmxlIGZvciB0aGUgcGxheWVyIGJhc2VkIG9uIHRoZSBnaXZlbiBvcHRpb25zLiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgeW91dHViZUNvbnRhaW5lcjogT2JzZXJ2YWJsZTxIVE1MRWxlbWVudD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgaG9zdE9iczogT2JzZXJ2YWJsZTxzdHJpbmcgfCB1bmRlZmluZWQ+LFxuICBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBwbGF5ZXJWYXJzT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllclZhcnMgfCB1bmRlZmluZWQ+LFxuICBuZ1pvbmU6IE5nWm9uZSxcbik6IE9ic2VydmFibGU8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4ge1xuICBjb25zdCBwbGF5ZXJPcHRpb25zID0gY29tYmluZUxhdGVzdChbdmlkZW9JZE9icywgaG9zdE9icywgcGxheWVyVmFyc09ic10pLnBpcGUoXG4gICAgd2l0aExhdGVzdEZyb20oY29tYmluZUxhdGVzdChbd2lkdGhPYnMsIGhlaWdodE9ic10pKSxcbiAgICBtYXAoKFtjb25zdHJ1Y3Rvck9wdGlvbnMsIHNpemVPcHRpb25zXSkgPT4ge1xuICAgICAgY29uc3QgW3ZpZGVvSWQsIGhvc3QsIHBsYXllclZhcnNdID0gY29uc3RydWN0b3JPcHRpb25zO1xuICAgICAgY29uc3QgW3dpZHRoLCBoZWlnaHRdID0gc2l6ZU9wdGlvbnM7XG4gICAgICByZXR1cm4gdmlkZW9JZCA/IHt2aWRlb0lkLCBwbGF5ZXJWYXJzLCB3aWR0aCwgaGVpZ2h0LCBob3N0fSA6IHVuZGVmaW5lZDtcbiAgICB9KSxcbiAgKTtcblxuICByZXR1cm4gY29tYmluZUxhdGVzdChbeW91dHViZUNvbnRhaW5lciwgcGxheWVyT3B0aW9ucywgb2Yobmdab25lKV0pLnBpcGUoXG4gICAgc2tpcFVudGlsUmVtZW1iZXJMYXRlc3QoaWZyYW1lQXBpQXZhaWxhYmxlT2JzKSxcbiAgICBzY2FuKHN5bmNQbGF5ZXJTdGF0ZSwgdW5kZWZpbmVkKSxcbiAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICApO1xufVxuXG4vKiogU2tpcHMgdGhlIGdpdmVuIG9ic2VydmFibGUgdW50aWwgdGhlIG90aGVyIG9ic2VydmFibGUgZW1pdHMgdHJ1ZSwgdGhlbiBlbWl0IHRoZSBsYXRlc3QuICovXG5mdW5jdGlvbiBza2lwVW50aWxSZW1lbWJlckxhdGVzdDxUPihub3RpZmllcjogT2JzZXJ2YWJsZTxib29sZWFuPik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIGNvbWJpbmVMYXRlc3RPcChub3RpZmllciksXG4gICAgc2tpcFdoaWxlKChbXywgZG9uZVNraXBwaW5nXSkgPT4gIWRvbmVTa2lwcGluZyksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSksXG4gICk7XG59XG5cbi8qKiBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgdGhlcmUgYXJlIG5vIG9wdGlvbnMsIG9yIGNyZWF0ZSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBvcHRpb25zLiAqL1xuZnVuY3Rpb24gc3luY1BsYXllclN0YXRlKFxuICBwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsXG4gIFtjb250YWluZXIsIHZpZGVvT3B0aW9ucywgbmdab25lXTogW0hUTUxFbGVtZW50LCBZVC5QbGF5ZXJPcHRpb25zIHwgdW5kZWZpbmVkLCBOZ1pvbmVdLFxuKTogVW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCB7XG4gIGlmIChcbiAgICBwbGF5ZXIgJiZcbiAgICB2aWRlb09wdGlvbnMgJiZcbiAgICAocGxheWVyLnBsYXllclZhcnMgIT09IHZpZGVvT3B0aW9ucy5wbGF5ZXJWYXJzIHx8IHBsYXllci5ob3N0ICE9PSB2aWRlb09wdGlvbnMuaG9zdClcbiAgKSB7XG4gICAgLy8gVGhlIHBsYXllciBuZWVkcyB0byBiZSByZWNyZWF0ZWQgaWYgdGhlIHBsYXllclZhcnMgYXJlIGRpZmZlcmVudC5cbiAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICB9IGVsc2UgaWYgKCF2aWRlb09wdGlvbnMpIHtcbiAgICBpZiAocGxheWVyKSB7XG4gICAgICAvLyBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgdGhlIHZpZGVvSWQgd2FzIHJlbW92ZWQuXG4gICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAocGxheWVyKSB7XG4gICAgcmV0dXJuIHBsYXllcjtcbiAgfVxuXG4gIC8vIEltcG9ydGFudCEgV2UgbmVlZCB0byBjcmVhdGUgdGhlIFBsYXllciBvYmplY3Qgb3V0c2lkZSBvZiB0aGUgYE5nWm9uZWAsIGJlY2F1c2UgaXQga2lja3NcbiAgLy8gb2ZmIGEgMjUwbXMgc2V0SW50ZXJ2YWwgd2hpY2ggd2lsbCBjb250aW51YWxseSB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gaWYgd2UgZG9uJ3QuXG4gIGNvbnN0IG5ld1BsYXllcjogVW5pbml0aWFsaXplZFBsYXllciA9IG5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcihcbiAgICAoKSA9PiBuZXcgWVQuUGxheWVyKGNvbnRhaW5lciwgdmlkZW9PcHRpb25zKSxcbiAgKTtcbiAgbmV3UGxheWVyLnZpZGVvSWQgPSB2aWRlb09wdGlvbnMudmlkZW9JZDtcbiAgbmV3UGxheWVyLnBsYXllclZhcnMgPSB2aWRlb09wdGlvbnMucGxheWVyVmFycztcbiAgbmV3UGxheWVyLmhvc3QgPSB2aWRlb09wdGlvbnMuaG9zdDtcbiAgcmV0dXJuIG5ld1BsYXllcjtcbn1cblxuLyoqXG4gKiBDYWxsIGN1ZVZpZGVvQnlJZCBpZiB0aGUgdmlkZW9JZCBjaGFuZ2VzLCBvciB3aGVuIHN0YXJ0IG9yIGVuZCBzZWNvbmRzIGNoYW5nZS4gY3VlVmlkZW9CeUlkIHdpbGxcbiAqIGNoYW5nZSB0aGUgbG9hZGVkIHZpZGVvIGlkIHRvIHRoZSBnaXZlbiB2aWRlb0lkLCBhbmQgc2V0IHRoZSBzdGFydCBhbmQgZW5kIHRpbWVzIHRvIHRoZSBnaXZlblxuICogc3RhcnQvZW5kIHNlY29uZHMuXG4gKi9cbmZ1bmN0aW9uIGJpbmRDdWVWaWRlb0NhbGwoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxQbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICB2aWRlb0lkT2JzOiBPYnNlcnZhYmxlPHN0cmluZyB8IHVuZGVmaW5lZD4sXG4gIHN0YXJ0U2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBlbmRTZWNvbmRzT2JzOiBPYnNlcnZhYmxlPG51bWJlciB8IHVuZGVmaW5lZD4sXG4gIHN1Z2dlc3RlZFF1YWxpdHlPYnM6IE9ic2VydmFibGU8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPixcbiAgZGVzdHJveWVkOiBPYnNlcnZhYmxlPHZvaWQ+LFxuKSB7XG4gIGNvbnN0IGN1ZU9wdGlvbnNPYnMgPSBjb21iaW5lTGF0ZXN0KFtzdGFydFNlY29uZHNPYnMsIGVuZFNlY29uZHNPYnNdKS5waXBlKFxuICAgIG1hcCgoW3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc10pID0+ICh7c3RhcnRTZWNvbmRzLCBlbmRTZWNvbmRzfSkpLFxuICApO1xuXG4gIC8vIE9ubHkgcmVzcG9uZCB0byBjaGFuZ2VzIGluIGN1ZSBvcHRpb25zIGlmIHRoZSBwbGF5ZXIgaXMgbm90IHJ1bm5pbmcuXG4gIGNvbnN0IGZpbHRlcmVkQ3VlT3B0aW9ucyA9IGN1ZU9wdGlvbnNPYnMucGlwZShcbiAgICBmaWx0ZXJPbk90aGVyKHBsYXllck9icywgcGxheWVyID0+ICEhcGxheWVyICYmICFoYXNQbGF5ZXJTdGFydGVkKHBsYXllcikpLFxuICApO1xuXG4gIC8vIElmIHRoZSB2aWRlbyBpZCBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZSBwbGF5ZXJcbiAgLy8gd2FzIGluaXRpYWxpemVkIHdpdGggYSBkaWZmZXJlbnQgdmlkZW8gaWQuXG4gIGNvbnN0IGNoYW5nZWRWaWRlb0lkID0gdmlkZW9JZE9icy5waXBlKFxuICAgIGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCAocGxheWVyLCB2aWRlb0lkKSA9PiAhIXBsYXllciAmJiBwbGF5ZXIudmlkZW9JZCAhPT0gdmlkZW9JZCksXG4gICk7XG5cbiAgLy8gSWYgdGhlIHBsYXllciBjaGFuZ2VkLCB0aGVyZSdzIG5vIHJlYXNvbiB0byBydW4gJ2N1ZScgdW5sZXNzIHRoZXJlIGFyZSBjdWUgb3B0aW9ucy5cbiAgY29uc3QgY2hhbmdlZFBsYXllciA9IHBsYXllck9icy5waXBlKFxuICAgIGZpbHRlck9uT3RoZXIoXG4gICAgICBjb21iaW5lTGF0ZXN0KFt2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzXSksXG4gICAgICAoW3ZpZGVvSWQsIGN1ZU9wdGlvbnNdLCBwbGF5ZXIpID0+XG4gICAgICAgICEhcGxheWVyICYmXG4gICAgICAgICh2aWRlb0lkICE9IHBsYXllci52aWRlb0lkIHx8ICEhY3VlT3B0aW9ucy5zdGFydFNlY29uZHMgfHwgISFjdWVPcHRpb25zLmVuZFNlY29uZHMpLFxuICAgICksXG4gICk7XG5cbiAgbWVyZ2UoY2hhbmdlZFBsYXllciwgY2hhbmdlZFZpZGVvSWQsIGZpbHRlcmVkQ3VlT3B0aW9ucylcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgdmlkZW9JZE9icywgY3VlT3B0aW9uc09icywgc3VnZ2VzdGVkUXVhbGl0eU9ic10pKSxcbiAgICAgIG1hcCgoW18sIHZhbHVlc10pID0+IHZhbHVlcyksXG4gICAgICB0YWtlVW50aWwoZGVzdHJveWVkKSxcbiAgICApXG4gICAgLnN1YnNjcmliZSgoW3BsYXllciwgdmlkZW9JZCwgY3VlT3B0aW9ucywgc3VnZ2VzdGVkUXVhbGl0eV0pID0+IHtcbiAgICAgIGlmICghdmlkZW9JZCB8fCAhcGxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBsYXllci52aWRlb0lkID0gdmlkZW9JZDtcbiAgICAgIHBsYXllci5jdWVWaWRlb0J5SWQoe1xuICAgICAgICB2aWRlb0lkLFxuICAgICAgICBzdWdnZXN0ZWRRdWFsaXR5LFxuICAgICAgICAuLi5jdWVPcHRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGhhc1BsYXllclN0YXJ0ZWQocGxheWVyOiBZVC5QbGF5ZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSBwbGF5ZXIuZ2V0UGxheWVyU3RhdGUoKTtcbiAgcmV0dXJuIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQgJiYgc3RhdGUgIT09IFlULlBsYXllclN0YXRlLkNVRUQ7XG59XG5cbmZ1bmN0aW9uIHBsYXllcklzUmVhZHkocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKTogcGxheWVyIGlzIFBsYXllciB7XG4gIHJldHVybiAnZ2V0UGxheWVyU3RhdHVzJyBpbiBwbGF5ZXI7XG59XG5cbi8qKiBDb21iaW5lcyB0aGUgdHdvIG9ic2VydmFibGVzIHRlbXBvcmFyaWx5IGZvciB0aGUgZmlsdGVyIGZ1bmN0aW9uLiAqL1xuZnVuY3Rpb24gZmlsdGVyT25PdGhlcjxSLCBUPihcbiAgb3RoZXJPYnM6IE9ic2VydmFibGU8VD4sXG4gIGZpbHRlckZuOiAodDogVCwgcj86IFIpID0+IGJvb2xlYW4sXG4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248Uj4ge1xuICByZXR1cm4gcGlwZShcbiAgICB3aXRoTGF0ZXN0RnJvbShvdGhlck9icyksXG4gICAgZmlsdGVyKChbdmFsdWUsIG90aGVyXSkgPT4gZmlsdGVyRm4ob3RoZXIsIHZhbHVlKSksXG4gICAgbWFwKChbdmFsdWVdKSA9PiB2YWx1ZSksXG4gICk7XG59XG4iXX0=