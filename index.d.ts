/// <reference types="youtube" />

import { AfterViewInit } from '@angular/core';
import { ElementRef } from '@angular/core';
import * as i0 from '@angular/core';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { OnChanges } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { SimpleChanges } from '@angular/core';

declare const DEFAULT_PLAYER_HEIGHT = 390;

declare const DEFAULT_PLAYER_WIDTH = 640;

declare namespace i1 {
    export {
        DEFAULT_PLAYER_WIDTH,
        DEFAULT_PLAYER_HEIGHT,
        YouTubePlayer
    }
}

/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export declare class YouTubePlayer implements AfterViewInit, OnChanges, OnDestroy {
    private _ngZone;
    /** Whether we're currently rendering inside a browser. */
    private readonly _isBrowser;
    private _player;
    private _pendingPlayer;
    private _existingApiReadyCallback;
    private _pendingPlayerState;
    private readonly _destroyed;
    private readonly _playerChanges;
    /** YouTube Video ID to view */
    videoId: string | undefined;
    /** Height of video player */
    get height(): number;
    set height(height: number | undefined);
    private _height;
    /** Width of video player */
    get width(): number;
    set width(width: number | undefined);
    private _width;
    /** The moment when the player is supposed to start playing */
    startSeconds: number | undefined;
    /** The moment when the player is supposed to stop playing */
    endSeconds: number | undefined;
    /** The suggested quality of the player */
    suggestedQuality: YT.SuggestedVideoQuality | undefined;
    /**
     * Extra parameters used to configure the player. See:
     * https://developers.google.com/youtube/player_parameters.html?playerVersion=HTML5#Parameters
     */
    playerVars: YT.PlayerVars | undefined;
    /** Whether cookies inside the player have been disabled. */
    disableCookies: boolean;
    /**
     * Whether the iframe will attempt to load regardless of the status of the api on the
     * page. Set this to true if you don't want the `onYouTubeIframeAPIReady` field to be
     * set on the global window.
     */
    showBeforeIframeApiLoads: boolean | undefined;
    /** Outputs are direct proxies from the player itself. */
    readonly ready: Observable<YT.PlayerEvent>;
    readonly stateChange: Observable<YT.OnStateChangeEvent>;
    readonly error: Observable<YT.OnErrorEvent>;
    readonly apiChange: Observable<YT.PlayerEvent>;
    readonly playbackQualityChange: Observable<YT.OnPlaybackQualityChangeEvent>;
    readonly playbackRateChange: Observable<YT.OnPlaybackRateChangeEvent>;
    /** The element that will be replaced by the iframe. */
    youtubeContainer: ElementRef<HTMLElement>;
    constructor(_ngZone: NgZone, platformId: Object);
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngOnDestroy(): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#playVideo */
    playVideo(): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#pauseVideo */
    pauseVideo(): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#stopVideo */
    stopVideo(): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#seekTo */
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#mute */
    mute(): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#unMute */
    unMute(): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#isMuted */
    isMuted(): boolean;
    /** See https://developers.google.com/youtube/iframe_api_reference#setVolume */
    setVolume(volume: number): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#getVolume */
    getVolume(): number;
    /** See https://developers.google.com/youtube/iframe_api_reference#setPlaybackRate */
    setPlaybackRate(playbackRate: number): void;
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlaybackRate */
    getPlaybackRate(): number;
    /** See https://developers.google.com/youtube/iframe_api_reference#getAvailablePlaybackRates */
    getAvailablePlaybackRates(): number[];
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoLoadedFraction */
    getVideoLoadedFraction(): number;
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlayerState */
    getPlayerState(): YT.PlayerState | undefined;
    /** See https://developers.google.com/youtube/iframe_api_reference#getCurrentTime */
    getCurrentTime(): number;
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlaybackQuality */
    getPlaybackQuality(): YT.SuggestedVideoQuality;
    /** See https://developers.google.com/youtube/iframe_api_reference#getAvailableQualityLevels */
    getAvailableQualityLevels(): YT.SuggestedVideoQuality[];
    /** See https://developers.google.com/youtube/iframe_api_reference#getDuration */
    getDuration(): number;
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoUrl */
    getVideoUrl(): string;
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoEmbedCode */
    getVideoEmbedCode(): string;
    /** Gets an object that should be used to store the temporary API state. */
    private _getPendingState;
    /**
     * Determines whether a change in the component state
     * requires the YouTube player to be recreated.
     */
    private _shouldRecreatePlayer;
    /** Creates a new YouTube player and destroys the existing one. */
    private _createPlayer;
    /** Applies any state that changed before the player was initialized. */
    private _applyPendingPlayerState;
    /** Cues the player based on the current component state. */
    private _cuePlayer;
    /** Sets the player's size based on the current input values. */
    private _setSize;
    /** Sets the player's quality based on the current input values. */
    private _setQuality;
    /** Gets an observable that adds an event listener to the player when a user subscribes to it. */
    private _getLazyEmitter;
    static ɵfac: i0.ɵɵFactoryDeclaration<YouTubePlayer, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<YouTubePlayer, "youtube-player", never, { "videoId": { "alias": "videoId"; "required": false; }; "height": { "alias": "height"; "required": false; }; "width": { "alias": "width"; "required": false; }; "startSeconds": { "alias": "startSeconds"; "required": false; }; "endSeconds": { "alias": "endSeconds"; "required": false; }; "suggestedQuality": { "alias": "suggestedQuality"; "required": false; }; "playerVars": { "alias": "playerVars"; "required": false; }; "disableCookies": { "alias": "disableCookies"; "required": false; }; "showBeforeIframeApiLoads": { "alias": "showBeforeIframeApiLoads"; "required": false; }; }, { "ready": "ready"; "stateChange": "stateChange"; "error": "error"; "apiChange": "apiChange"; "playbackQualityChange": "playbackQualityChange"; "playbackRateChange": "playbackRateChange"; }, never, never, true, never>;
}

export declare class YouTubePlayerModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<YouTubePlayerModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<YouTubePlayerModule, never, [typeof i1.YouTubePlayer], [typeof i1.YouTubePlayer]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<YouTubePlayerModule>;
}

export { }
