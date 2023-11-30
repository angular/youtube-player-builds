/// <reference types="youtube" />

import { AfterViewInit } from '@angular/core';
import { ElementRef } from '@angular/core';
import * as i0 from '@angular/core';
import { InjectionToken } from '@angular/core';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { OnChanges } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { SimpleChanges } from '@angular/core';

declare const DEFAULT_PLAYER_HEIGHT = 390;

declare const DEFAULT_PLAYER_WIDTH = 640;

declare namespace i1 {
    export {
        YOUTUBE_PLAYER_CONFIG,
        YouTubePlayerConfig,
        DEFAULT_PLAYER_WIDTH,
        DEFAULT_PLAYER_HEIGHT,
        YouTubePlayer
    }
}

/**  Quality of the placeholder image.  */
export declare type PlaceholderImageQuality = 'high' | 'standard' | 'low';

/** Injection token used to configure the `YouTubePlayer`. */
export declare const YOUTUBE_PLAYER_CONFIG: InjectionToken<YouTubePlayerConfig>;

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
    private readonly _nonce;
    private readonly _changeDetectorRef;
    protected _isLoading: boolean;
    protected _hasPlaceholder: boolean;
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
    /** Whether to automatically load the YouTube iframe API. Defaults to `true`. */
    loadApi: boolean;
    /**
     * By default the player shows a placeholder image instead of loading the YouTube API which
     * improves the initial page load performance. This input allows for the behavior to be disabled.
     */
    disablePlaceholder: boolean;
    /**
     * Whether the iframe will attempt to load regardless of the status of the api on the
     * page. Set this to true if you don't want the `onYouTubeIframeAPIReady` field to be
     * set on the global window.
     */
    showBeforeIframeApiLoads: boolean;
    /** Accessible label for the play button inside of the placeholder. */
    placeholderButtonLabel: string;
    /**
     * Quality of the displayed placeholder image. Defaults to `standard`,
     * because not all video have a high-quality placeholder.
     */
    placeholderImageQuality: PlaceholderImageQuality;
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
    /**
     * Loads the YouTube API and sets up the player.
     * @param playVideo Whether to automatically play the video once the player is loaded.
     */
    protected _load(playVideo: boolean): void;
    /** Loads the player depending on the internal state of the component. */
    private _conditionallyLoad;
    /** Whether to show the placeholder element. */
    protected _shouldShowPlaceholder(): boolean;
    /** Gets an object that should be used to store the temporary API state. */
    private _getPendingState;
    /**
     * Determines whether a change in the component state
     * requires the YouTube player to be recreated.
     */
    private _shouldRecreatePlayer;
    /**
     * Creates a new YouTube player and destroys the existing one.
     * @param playVideo Whether to play the video once it loads.
     */
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
    static ɵcmp: i0.ɵɵComponentDeclaration<YouTubePlayer, "youtube-player", never, { "videoId": { "alias": "videoId"; "required": false; }; "height": { "alias": "height"; "required": false; }; "width": { "alias": "width"; "required": false; }; "startSeconds": { "alias": "startSeconds"; "required": false; }; "endSeconds": { "alias": "endSeconds"; "required": false; }; "suggestedQuality": { "alias": "suggestedQuality"; "required": false; }; "playerVars": { "alias": "playerVars"; "required": false; }; "disableCookies": { "alias": "disableCookies"; "required": false; }; "loadApi": { "alias": "loadApi"; "required": false; }; "disablePlaceholder": { "alias": "disablePlaceholder"; "required": false; }; "showBeforeIframeApiLoads": { "alias": "showBeforeIframeApiLoads"; "required": false; }; "placeholderButtonLabel": { "alias": "placeholderButtonLabel"; "required": false; }; "placeholderImageQuality": { "alias": "placeholderImageQuality"; "required": false; }; }, { "ready": "ready"; "stateChange": "stateChange"; "error": "error"; "apiChange": "apiChange"; "playbackQualityChange": "playbackQualityChange"; "playbackRateChange": "playbackRateChange"; }, never, never, true, never>;
    static ngAcceptInputType_height: unknown;
    static ngAcceptInputType_width: unknown;
    static ngAcceptInputType_startSeconds: number | undefined;
    static ngAcceptInputType_endSeconds: number | undefined;
    static ngAcceptInputType_disableCookies: unknown;
    static ngAcceptInputType_loadApi: unknown;
    static ngAcceptInputType_disablePlaceholder: unknown;
    static ngAcceptInputType_showBeforeIframeApiLoads: unknown;
}

/** Object that can be used to configure the `YouTubePlayer`. */
export declare interface YouTubePlayerConfig {
    /** Whether to load the YouTube iframe API automatically. Defaults to `true`. */
    loadApi?: boolean;
    /**
     * By default the player shows a placeholder image instead of loading the YouTube API which
     * improves the initial page load performance. Use this option to disable the placeholder loading
     * behavior globally. Defaults to `false`.
     */
    disablePlaceholder?: boolean;
    /** Accessible label for the play button inside of the placeholder. */
    placeholderButtonLabel?: string;
    /**
     * Quality of the displayed placeholder image. Defaults to `standard`,
     * because not all video have a high-quality placeholder.
     */
    placeholderImageQuality?: PlaceholderImageQuality;
}

export declare class YouTubePlayerModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<YouTubePlayerModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<YouTubePlayerModule, never, [typeof i1.YouTubePlayer], [typeof i1.YouTubePlayer]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<YouTubePlayerModule>;
}

export { }
