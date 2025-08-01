import * as i0 from '@angular/core';
import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input, InjectionToken, inject, NgZone, CSP_NONCE, ChangeDetectorRef, ElementRef, EventEmitter, PLATFORM_ID, numberAttribute, booleanAttribute, Output, ViewChild, NgModule } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trustedResourceUrl } from 'safevalues';
import { setScriptSrc } from 'safevalues/dom';
import { Subject, BehaviorSubject, fromEventPattern, of, Observable } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

class YouTubePlayerPlaceholder {
    /** ID of the video for which to show the placeholder. */
    videoId;
    /** Width of the video for which to show the placeholder. */
    width;
    /** Height of the video for which to show the placeholder. */
    height;
    /** Whether the video is currently being loaded. */
    isLoading;
    /** Accessible label for the play button. */
    buttonLabel;
    /** Quality of the placeholder image. */
    quality;
    /** Gets the background image showing the placeholder. */
    _getBackgroundImage() {
        let url;
        if (this.quality === 'low') {
            url = `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`;
        }
        else if (this.quality === 'high') {
            url = `https://i.ytimg.com/vi/${this.videoId}/maxresdefault.jpg`;
        }
        else {
            url = `https://i.ytimg.com/vi_webp/${this.videoId}/sddefault.webp`;
        }
        return `url(${url})`;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayerPlaceholder, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.2.0-next.2", type: YouTubePlayerPlaceholder, isStandalone: true, selector: "youtube-player-placeholder", inputs: { videoId: "videoId", width: "width", height: "height", isLoading: "isLoading", buttonLabel: "buttonLabel", quality: "quality" }, host: { properties: { "class.youtube-player-placeholder-loading": "isLoading", "style.background-image": "_getBackgroundImage()", "style.width.px": "width", "style.height.px": "height" }, classAttribute: "youtube-player-placeholder" }, ngImport: i0, template: `
    <button type="button" class="youtube-player-placeholder-button" [attr.aria-label]="buttonLabel">
      <svg
        height="100%"
        version="1.1"
        viewBox="0 0 68 48"
        focusable="false"
        aria-hidden="true">
        <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
        <path d="M 45,24 27,14 27,34" fill="#fff"></path>
      </svg>
    </button>
  `, isInline: true, styles: [".youtube-player-placeholder{display:flex;align-items:center;justify-content:center;width:100%;overflow:hidden;cursor:pointer;background-color:#000;background-position:center center;background-size:cover;transition:box-shadow 300ms ease;box-shadow:inset 0 120px 90px -90px rgba(0,0,0,.8)}:fullscreen .youtube-player-placeholder{min-width:100vw;min-height:100vh}.youtube-player-placeholder-button{transition:opacity 300ms ease;-moz-appearance:none;-webkit-appearance:none;background:none;border:none;padding:0;display:flex}.youtube-player-placeholder-button svg{width:68px;height:48px}.youtube-player-placeholder-loading{box-shadow:none}.youtube-player-placeholder-loading .youtube-player-placeholder-button{opacity:0}\n"], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayerPlaceholder, decorators: [{
            type: Component,
            args: [{ selector: 'youtube-player-placeholder', changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None, template: `
    <button type="button" class="youtube-player-placeholder-button" [attr.aria-label]="buttonLabel">
      <svg
        height="100%"
        version="1.1"
        viewBox="0 0 68 48"
        focusable="false"
        aria-hidden="true">
        <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
        <path d="M 45,24 27,14 27,34" fill="#fff"></path>
      </svg>
    </button>
  `, host: {
                        'class': 'youtube-player-placeholder',
                        '[class.youtube-player-placeholder-loading]': 'isLoading',
                        '[style.background-image]': '_getBackgroundImage()',
                        '[style.width.px]': 'width',
                        '[style.height.px]': 'height',
                    }, styles: [".youtube-player-placeholder{display:flex;align-items:center;justify-content:center;width:100%;overflow:hidden;cursor:pointer;background-color:#000;background-position:center center;background-size:cover;transition:box-shadow 300ms ease;box-shadow:inset 0 120px 90px -90px rgba(0,0,0,.8)}:fullscreen .youtube-player-placeholder{min-width:100vw;min-height:100vh}.youtube-player-placeholder-button{transition:opacity 300ms ease;-moz-appearance:none;-webkit-appearance:none;background:none;border:none;padding:0;display:flex}.youtube-player-placeholder-button svg{width:68px;height:48px}.youtube-player-placeholder-loading{box-shadow:none}.youtube-player-placeholder-loading .youtube-player-placeholder-button{opacity:0}\n"] }]
        }], propDecorators: { videoId: [{
                type: Input
            }], width: [{
                type: Input
            }], height: [{
                type: Input
            }], isLoading: [{
                type: Input
            }], buttonLabel: [{
                type: Input
            }], quality: [{
                type: Input
            }] } });

// Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1265
/// <reference types="youtube" preserve="true" />
/** Injection token used to configure the `YouTubePlayer`. */
const YOUTUBE_PLAYER_CONFIG = new InjectionToken('YOUTUBE_PLAYER_CONFIG');
const DEFAULT_PLAYER_WIDTH = 640;
const DEFAULT_PLAYER_HEIGHT = 390;
/** Coercion function for time values. */
function coerceTime(value) {
    return value == null ? value : numberAttribute(value, 0);
}
/**
 * Equivalent of `YT.PlayerState` which we can't use, because it's meant to
 * be read off the `window` which we can't do before the API has been loaded.
 */
var PlayerState;
(function (PlayerState) {
    PlayerState[PlayerState["UNSTARTED"] = -1] = "UNSTARTED";
    PlayerState[PlayerState["ENDED"] = 0] = "ENDED";
    PlayerState[PlayerState["PLAYING"] = 1] = "PLAYING";
    PlayerState[PlayerState["PAUSED"] = 2] = "PAUSED";
    PlayerState[PlayerState["BUFFERING"] = 3] = "BUFFERING";
    PlayerState[PlayerState["CUED"] = 5] = "CUED";
})(PlayerState || (PlayerState = {}));
/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
class YouTubePlayer {
    _ngZone = inject(NgZone);
    _nonce = inject(CSP_NONCE, { optional: true });
    _changeDetectorRef = inject(ChangeDetectorRef);
    _elementRef = inject(ElementRef);
    _player;
    _pendingPlayer;
    _existingApiReadyCallback;
    _pendingPlayerState;
    _destroyed = new Subject();
    _playerChanges = new BehaviorSubject(undefined);
    _isLoading = false;
    _hasPlaceholder = true;
    /** Whether we're currently rendering inside a browser. */
    _isBrowser;
    /** YouTube Video ID to view */
    videoId;
    /** Height of video player */
    get height() {
        return this._height;
    }
    set height(height) {
        this._height = height == null || isNaN(height) ? DEFAULT_PLAYER_HEIGHT : height;
    }
    _height = DEFAULT_PLAYER_HEIGHT;
    /** Width of video player */
    get width() {
        return this._width;
    }
    set width(width) {
        this._width = width == null || isNaN(width) ? DEFAULT_PLAYER_WIDTH : width;
    }
    _width = DEFAULT_PLAYER_WIDTH;
    /** The moment when the player is supposed to start playing */
    startSeconds;
    /** The moment when the player is supposed to stop playing */
    endSeconds;
    /** The suggested quality of the player */
    suggestedQuality;
    /**
     * Extra parameters used to configure the player. See:
     * https://developers.google.com/youtube/player_parameters.html?playerVersion=HTML5#Parameters
     */
    playerVars;
    /** Whether cookies inside the player have been disabled. */
    disableCookies = false;
    /** Whether to automatically load the YouTube iframe API. Defaults to `true`. */
    loadApi;
    /**
     * By default the player shows a placeholder image instead of loading the YouTube API which
     * improves the initial page load performance. This input allows for the behavior to be disabled.
     */
    disablePlaceholder = false;
    /**
     * Whether the iframe will attempt to load regardless of the status of the api on the
     * page. Set this to true if you don't want the `onYouTubeIframeAPIReady` field to be
     * set on the global window.
     */
    showBeforeIframeApiLoads = false;
    /** Accessible label for the play button inside of the placeholder. */
    placeholderButtonLabel;
    /**
     * Quality of the displayed placeholder image. Defaults to `standard`,
     * because not all video have a high-quality placeholder.
     */
    placeholderImageQuality;
    // Note: ready event can't go through the lazy emitter, because it
    // happens before the `_playerChanges` stream emits the new player.
    /** Emits when the player is initialized. */
    ready = new EventEmitter();
    /** Emits when the state of the player has changed. */
    stateChange = this._getLazyEmitter('onStateChange');
    /** Emits when there's an error while initializing the player. */
    error = this._getLazyEmitter('onError');
    /** Emits when the underlying API of the player has changed. */
    apiChange = this._getLazyEmitter('onApiChange');
    /** Emits when the playback quality has changed. */
    playbackQualityChange = this._getLazyEmitter('onPlaybackQualityChange');
    /** Emits when the playback rate has changed. */
    playbackRateChange = this._getLazyEmitter('onPlaybackRateChange');
    /** The element that will be replaced by the iframe. */
    youtubeContainer;
    constructor() {
        const platformId = inject(PLATFORM_ID);
        const config = inject(YOUTUBE_PLAYER_CONFIG, { optional: true });
        this.loadApi = config?.loadApi ?? true;
        this.disablePlaceholder = !!config?.disablePlaceholder;
        this.placeholderButtonLabel = config?.placeholderButtonLabel || 'Play video';
        this.placeholderImageQuality = config?.placeholderImageQuality || 'standard';
        this._isBrowser = isPlatformBrowser(platformId);
    }
    ngAfterViewInit() {
        this._conditionallyLoad();
    }
    ngOnChanges(changes) {
        if (this._shouldRecreatePlayer(changes)) {
            this._conditionallyLoad();
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
            this._getPendingState().playbackState = PlayerState.PLAYING;
            this._load(true);
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#pauseVideo */
    pauseVideo() {
        if (this._player) {
            this._player.pauseVideo();
        }
        else {
            this._getPendingState().playbackState = PlayerState.PAUSED;
        }
    }
    /** See https://developers.google.com/youtube/iframe_api_reference#stopVideo */
    stopVideo() {
        if (this._player) {
            this._player.stopVideo();
        }
        else {
            // It seems like YouTube sets the player to CUED when it's stopped.
            this._getPendingState().playbackState = PlayerState.CUED;
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
        return PlayerState.UNSTARTED;
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
    /**
     * Attempts to put the player into fullscreen mode, depending on browser support.
     * @param options Options controlling how the element behaves in fullscreen mode.
     */
    async requestFullscreen(options) {
        // Note that we do this on the host, rather than the iframe, because it allows us to handle the
        // placeholder in fullscreen mode. Null check the method since it's not supported everywhere.
        const element = this._elementRef.nativeElement;
        return element.requestFullscreen
            ? element.requestFullscreen(options)
            : Promise.reject(new Error('Fullscreen API not supported by browser.'));
    }
    /**
     * Loads the YouTube API and sets up the player.
     * @param playVideo Whether to automatically play the video once the player is loaded.
     */
    _load(playVideo) {
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        if (!window.YT || !window.YT.Player) {
            if (this.loadApi) {
                this._isLoading = true;
                loadApi(this._nonce);
            }
            else if (this.showBeforeIframeApiLoads && (typeof ngDevMode === 'undefined' || ngDevMode)) {
                throw new Error('Namespace YT not found, cannot construct embedded youtube player. ' +
                    'Please install the YouTube Player API Reference for iframe Embeds: ' +
                    'https://developers.google.com/youtube/iframe_api_reference');
            }
            this._existingApiReadyCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                this._existingApiReadyCallback?.();
                this._ngZone.run(() => this._createPlayer(playVideo));
            };
        }
        else {
            this._createPlayer(playVideo);
        }
    }
    /** Loads the player depending on the internal state of the component. */
    _conditionallyLoad() {
        // If the placeholder isn't shown anymore, we have to trigger a load.
        if (!this._shouldShowPlaceholder()) {
            this._load(false);
        }
        else if (this.playerVars?.autoplay === 1) {
            // If it's an autoplaying video, we have to hide the placeholder and start playing.
            this._load(true);
        }
    }
    /** Whether to show the placeholder element. */
    _shouldShowPlaceholder() {
        if (this.disablePlaceholder) {
            return false;
        }
        // Since we don't load the API on the server, we show the placeholder permanently.
        if (!this._isBrowser) {
            return true;
        }
        return this._hasPlaceholder && !!this.videoId && !this._player;
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
        const change = changes['videoId'] ||
            changes['playerVars'] ||
            changes['disableCookies'] ||
            changes['disablePlaceholder'];
        return !!change && !change.isFirstChange();
    }
    /**
     * Creates a new YouTube player and destroys the existing one.
     * @param playVideo Whether to play the video once it loads.
     */
    _createPlayer(playVideo) {
        this._player?.destroy();
        this._pendingPlayer?.destroy();
        // A player can't be created if the API isn't loaded,
        // or there isn't a video or playlist to be played.
        if (typeof YT === 'undefined' || (!this.videoId && !this.playerVars?.list)) {
            return;
        }
        // Important! We need to create the Player object outside of the `NgZone`, because it kicks
        // off a 250ms setInterval which will continually trigger change detection if we don't.
        const params = {
            host: this.disableCookies ? 'https://www.youtube-nocookie.com' : undefined,
            width: this.width,
            height: this.height,
            // Calling `playVideo` on load doesn't appear to actually play
            // the video so we need to trigger it through `playerVars` instead.
            playerVars: playVideo ? { ...(this.playerVars || {}), autoplay: 1 } : this.playerVars,
        };
        // We only want to injecct a videoId if one is provided, otherwise loading a playlist via
        // playerVars.list, the missing videoId will create a null value in the youtube iframe url
        // and that can trigger a JS error `Invalid video id` in widget api.
        if (this.videoId) {
            params.videoId = this.videoId;
        }
        const player = this._ngZone.runOutsideAngular(() => new YT.Player(this.youtubeContainer.nativeElement, params));
        const whenReady = (event) => {
            // Only assign the player once it's ready, otherwise YouTube doesn't expose some APIs.
            this._ngZone.run(() => {
                this._isLoading = false;
                this._hasPlaceholder = false;
                this._player = player;
                this._pendingPlayer = undefined;
                player.removeEventListener('onReady', whenReady);
                this._playerChanges.next(player);
                this.ready.emit(event);
                this._setSize();
                this._setQuality();
                if (this._pendingPlayerState) {
                    this._applyPendingPlayerState(player, this._pendingPlayerState);
                    this._pendingPlayerState = undefined;
                }
                // Only cue the player when it either hasn't started yet or it's cued,
                // otherwise cuing it can interrupt a player with autoplay enabled.
                const state = player.getPlayerState();
                if (state === PlayerState.UNSTARTED || state === PlayerState.CUED || state == null) {
                    this._cuePlayer();
                }
                else if (playVideo && this.startSeconds && this.startSeconds > 0) {
                    // We have to use `seekTo` when `startSeconds` are specified to simulate it playing from
                    // a specific time. The "proper" way to do it would be to either go through `cueVideoById`
                    // or `playerVars.start`, but at the time of writing both end up resetting the video
                    // to the state as if the user hasn't interacted with it.
                    player.seekTo(this.startSeconds, true);
                }
                this._changeDetectorRef.markForCheck();
            });
        };
        this._pendingPlayer = player;
        player.addEventListener('onReady', whenReady);
    }
    /** Applies any state that changed before the player was initialized. */
    _applyPendingPlayerState(player, pendingState) {
        const { playbackState, playbackRate, volume, muted, seek } = pendingState;
        switch (playbackState) {
            case PlayerState.PLAYING:
                player.playVideo();
                break;
            case PlayerState.PAUSED:
                player.pauseVideo();
                break;
            case PlayerState.CUED:
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
                ? fromEventPattern(listener => {
                    player.addEventListener(name, listener);
                }, listener => {
                    // The API seems to throw when we try to unbind from a destroyed player and it
                    // doesn'texpose whether the player has been destroyed so we have to wrap it in a
                    // try/catch to prevent the entire stream from erroring out.
                    try {
                        player?.removeEventListener?.(name, listener);
                    }
                    catch { }
                })
                : of();
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
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayer, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.2.0-next.2", type: YouTubePlayer, isStandalone: true, selector: "youtube-player", inputs: { videoId: "videoId", height: ["height", "height", numberAttribute], width: ["width", "width", numberAttribute], startSeconds: ["startSeconds", "startSeconds", coerceTime], endSeconds: ["endSeconds", "endSeconds", coerceTime], suggestedQuality: "suggestedQuality", playerVars: "playerVars", disableCookies: ["disableCookies", "disableCookies", booleanAttribute], loadApi: ["loadApi", "loadApi", booleanAttribute], disablePlaceholder: ["disablePlaceholder", "disablePlaceholder", booleanAttribute], showBeforeIframeApiLoads: ["showBeforeIframeApiLoads", "showBeforeIframeApiLoads", booleanAttribute], placeholderButtonLabel: "placeholderButtonLabel", placeholderImageQuality: "placeholderImageQuality" }, outputs: { ready: "ready", stateChange: "stateChange", error: "error", apiChange: "apiChange", playbackQualityChange: "playbackQualityChange", playbackRateChange: "playbackRateChange" }, viewQueries: [{ propertyName: "youtubeContainer", first: true, predicate: ["youtubeContainer"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: `
    @if (_shouldShowPlaceholder()) {
      <youtube-player-placeholder
        [videoId]="videoId!"
        [width]="width"
        [height]="height"
        [isLoading]="_isLoading"
        [buttonLabel]="placeholderButtonLabel"
        [quality]="placeholderImageQuality"
        (click)="_load(true)"/>
    }
    <div [style.display]="_shouldShowPlaceholder() ? 'none' : ''">
      <div #youtubeContainer></div>
    </div>
  `, isInline: true, styles: ["youtube-player:fullscreen,youtube-player:fullscreen iframe{min-width:100vw;min-height:100vh}\n"], dependencies: [{ kind: "component", type: YouTubePlayerPlaceholder, selector: "youtube-player-placeholder", inputs: ["videoId", "width", "height", "isLoading", "buttonLabel", "quality"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayer, decorators: [{
            type: Component,
            args: [{ selector: 'youtube-player', changeDetection: ChangeDetectionStrategy.OnPush, encapsulation: ViewEncapsulation.None, imports: [YouTubePlayerPlaceholder], template: `
    @if (_shouldShowPlaceholder()) {
      <youtube-player-placeholder
        [videoId]="videoId!"
        [width]="width"
        [height]="height"
        [isLoading]="_isLoading"
        [buttonLabel]="placeholderButtonLabel"
        [quality]="placeholderImageQuality"
        (click)="_load(true)"/>
    }
    <div [style.display]="_shouldShowPlaceholder() ? 'none' : ''">
      <div #youtubeContainer></div>
    </div>
  `, styles: ["youtube-player:fullscreen,youtube-player:fullscreen iframe{min-width:100vw;min-height:100vh}\n"] }]
        }], ctorParameters: () => [], propDecorators: { videoId: [{
                type: Input
            }], height: [{
                type: Input,
                args: [{ transform: numberAttribute }]
            }], width: [{
                type: Input,
                args: [{ transform: numberAttribute }]
            }], startSeconds: [{
                type: Input,
                args: [{ transform: coerceTime }]
            }], endSeconds: [{
                type: Input,
                args: [{ transform: coerceTime }]
            }], suggestedQuality: [{
                type: Input
            }], playerVars: [{
                type: Input
            }], disableCookies: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], loadApi: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], disablePlaceholder: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], showBeforeIframeApiLoads: [{
                type: Input,
                args: [{ transform: booleanAttribute }]
            }], placeholderButtonLabel: [{
                type: Input
            }], placeholderImageQuality: [{
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
let apiLoaded = false;
/** Loads the YouTube API from a specified URL only once. */
function loadApi(nonce) {
    if (apiLoaded) {
        return;
    }
    // We can use `document` directly here, because this logic doesn't run outside the browser.
    const url = trustedResourceUrl `https://www.youtube.com/iframe_api`;
    const script = document.createElement('script');
    const callback = (event) => {
        script.removeEventListener('load', callback);
        script.removeEventListener('error', callback);
        if (event.type === 'error') {
            apiLoaded = false;
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                console.error(`Failed to load YouTube API from ${url}`);
            }
        }
    };
    script.addEventListener('load', callback);
    script.addEventListener('error', callback);
    setScriptSrc(script, url);
    script.async = true;
    if (nonce) {
        script.setAttribute('nonce', nonce);
    }
    // Set this immediately to true so we don't start loading another script
    // while this one is pending. If loading fails, we'll flip it back to false.
    apiLoaded = true;
    document.body.appendChild(script);
}

class YouTubePlayerModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayerModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayerModule, imports: [YouTubePlayer], exports: [YouTubePlayer] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayerModule });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.2.0-next.2", ngImport: i0, type: YouTubePlayerModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [YouTubePlayer],
                    exports: [YouTubePlayer],
                }]
        }] });

export { YOUTUBE_PLAYER_CONFIG, YouTubePlayer, YouTubePlayerModule };
//# sourceMappingURL=youtube-player.mjs.map
