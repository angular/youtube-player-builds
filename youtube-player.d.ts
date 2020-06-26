/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <reference types="youtube" />
import { AfterViewInit, ElementRef, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
declare global {
    interface Window {
        YT: typeof YT | undefined;
        onYouTubeIframeAPIReady: (() => void) | undefined;
    }
}
export declare const DEFAULT_PLAYER_WIDTH = 640;
export declare const DEFAULT_PLAYER_HEIGHT = 390;
/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
export declare class YouTubePlayer implements AfterViewInit, OnDestroy, OnInit {
    private _ngZone;
    /** Whether we're currently rendering inside a browser. */
    private _isBrowser;
    private _youtubeContainer;
    private _destroyed;
    private _player;
    private _existingApiReadyCallback;
    private _pendingPlayerState;
    private _playerChanges;
    /** YouTube Video ID to view */
    get videoId(): string | undefined;
    set videoId(videoId: string | undefined);
    private _videoId;
    /** Height of video player */
    get height(): number | undefined;
    set height(height: number | undefined);
    private _height;
    /** Width of video player */
    get width(): number | undefined;
    set width(width: number | undefined);
    private _width;
    /** The moment when the player is supposed to start playing */
    set startSeconds(startSeconds: number | undefined);
    private _startSeconds;
    /** The moment when the player is supposed to stop playing */
    set endSeconds(endSeconds: number | undefined);
    private _endSeconds;
    /** The suggested quality of the player */
    set suggestedQuality(suggestedQuality: YT.SuggestedVideoQuality | undefined);
    private _suggestedQuality;
    /**
     * Extra parameters used to configure the player. See:
     * https://developers.google.com/youtube/player_parameters.html?playerVersion=HTML5#Parameters
     */
    get playerVars(): YT.PlayerVars | undefined;
    set playerVars(playerVars: YT.PlayerVars | undefined);
    private _playerVars;
    /**
     * Whether the iframe will attempt to load regardless of the status of the api on the
     * page. Set this to true if you don't want the `onYouTubeIframeAPIReady` field to be
     * set on the global window.
     */
    showBeforeIframeApiLoads: boolean | undefined;
    /** Outputs are direct proxies from the player itself. */
    ready: Observable<YT.PlayerEvent>;
    stateChange: Observable<YT.OnStateChangeEvent>;
    error: Observable<YT.OnErrorEvent>;
    apiChange: Observable<YT.PlayerEvent>;
    playbackQualityChange: Observable<YT.OnPlaybackQualityChangeEvent>;
    playbackRateChange: Observable<YT.OnPlaybackRateChangeEvent>;
    /** The element that will be replaced by the iframe. */
    youtubeContainer: ElementRef<HTMLElement>;
    constructor(_ngZone: NgZone, platformId: Object);
    ngOnInit(): void;
    /**
     * @deprecated No longer being used. To be removed.
     * @breaking-change 11.0.0
     */
    createEventsBoundInZone(): YT.Events;
    ngAfterViewInit(): void;
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
    /** Initializes a player from a temporary state. */
    private _initializePlayer;
    /** Gets an observable that adds an event listener to the player when a user subscribes to it. */
    private _getLazyEmitter;
}
