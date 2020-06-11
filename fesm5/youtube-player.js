import { Component, ChangeDetectionStrategy, ViewEncapsulation, NgZone, Optional, Inject, PLATFORM_ID, Input, Output, ViewChild, NgModule } from '@angular/core';
import { __read, __assign } from 'tslib';
import { isPlatformBrowser } from '@angular/common';
import { Subject, BehaviorSubject, of, combineLatest, pipe, Observable, fromEventPattern, merge } from 'rxjs';
import { take, startWith, combineLatest as combineLatest$1, skipWhile, map, scan, distinctUntilChanged, tap, flatMap, takeUntil, publish, switchMap, withLatestFrom, filter } from 'rxjs/operators';

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var DEFAULT_PLAYER_WIDTH = 640;
var DEFAULT_PLAYER_HEIGHT = 390;
/**
 * Angular component that renders a YouTube player via the YouTube player
 * iframe API.
 * @see https://developers.google.com/youtube/iframe_api_reference
 */
var YouTubePlayer = /** @class */ (function () {
    function YouTubePlayer(_ngZone, 
    /**
     * @deprecated `platformId` parameter to become required.
     * @breaking-change 10.0.0
     */
    platformId) {
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
        // @breaking-change 10.0.0 Remove null check for `platformId`.
        this._isBrowser =
            platformId ? isPlatformBrowser(platformId) : typeof window === 'object' && !!window;
    }
    Object.defineProperty(YouTubePlayer.prototype, "videoId", {
        /** YouTube Video ID to view */
        get: function () { return this._videoId.value; },
        set: function (videoId) {
            this._videoId.next(videoId);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(YouTubePlayer.prototype, "height", {
        /** Height of video player */
        get: function () { return this._height.value; },
        set: function (height) {
            this._height.next(height || DEFAULT_PLAYER_HEIGHT);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(YouTubePlayer.prototype, "width", {
        /** Width of video player */
        get: function () { return this._width.value; },
        set: function (width) {
            this._width.next(width || DEFAULT_PLAYER_WIDTH);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(YouTubePlayer.prototype, "startSeconds", {
        /** The moment when the player is supposed to start playing */
        set: function (startSeconds) {
            this._startSeconds.next(startSeconds);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(YouTubePlayer.prototype, "endSeconds", {
        /** The moment when the player is supposed to stop playing */
        set: function (endSeconds) {
            this._endSeconds.next(endSeconds);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(YouTubePlayer.prototype, "suggestedQuality", {
        /** The suggested quality of the player */
        set: function (suggestedQuality) {
            this._suggestedQuality.next(suggestedQuality);
        },
        enumerable: true,
        configurable: true
    });
    YouTubePlayer.prototype.ngOnInit = function () {
        var _this = this;
        // Don't do anything if we're not in a browser environment.
        if (!this._isBrowser) {
            return;
        }
        var iframeApiAvailableObs = of(true);
        if (!window.YT) {
            if (this.showBeforeIframeApiLoads) {
                throw new Error('Namespace YT not found, cannot construct embedded youtube player. ' +
                    'Please install the YouTube Player API Reference for iframe Embeds: ' +
                    'https://developers.google.com/youtube/iframe_api_reference');
            }
            var iframeApiAvailableSubject_1 = new Subject();
            this._existingApiReadyCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () {
                if (_this._existingApiReadyCallback) {
                    _this._existingApiReadyCallback();
                }
                _this._ngZone.run(function () { return iframeApiAvailableSubject_1.next(true); });
            };
            iframeApiAvailableObs = iframeApiAvailableSubject_1.pipe(take(1), startWith(false));
        }
        // An observable of the currently loaded player.
        var playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this._ngZone).pipe(tap(function (player) {
            // Emit this before the `waitUntilReady` call so that we can bind to
            // events that happen as the player is being initialized (e.g. `onReady`).
            _this._playerChanges.next(player);
        }), waitUntilReady(function (player) {
            // Destroy the player if loading was aborted so that we don't end up leaking memory.
            if (!playerIsReady(player)) {
                player.destroy();
            }
        }), takeUntil(this._destroyed), publish());
        // Set up side effects to bind inputs to the player.
        playerObs.subscribe(function (player) {
            _this._player = player;
            if (player && _this._pendingPlayerState) {
                _this._initializePlayer(player, _this._pendingPlayerState);
            }
            _this._pendingPlayerState = undefined;
        });
        bindSizeToPlayer(playerObs, this._width, this._height);
        bindSuggestedQualityToPlayer(playerObs, this._suggestedQuality);
        bindCueVideoCall(playerObs, this._videoId, this._startSeconds, this._endSeconds, this._suggestedQuality, this._destroyed);
        // After all of the subscriptions are set up, connect the observable.
        playerObs.connect();
    };
    /**
     * @deprecated No longer being used. To be removed.
     * @breaking-change 11.0.0
     */
    YouTubePlayer.prototype.createEventsBoundInZone = function () {
        return {};
    };
    YouTubePlayer.prototype.ngAfterViewInit = function () {
        this._youtubeContainer.next(this.youtubeContainer.nativeElement);
    };
    YouTubePlayer.prototype.ngOnDestroy = function () {
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
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#playVideo */
    YouTubePlayer.prototype.playVideo = function () {
        if (this._player) {
            this._player.playVideo();
        }
        else {
            this._getPendingState().playbackState = 1 /* PLAYING */;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#pauseVideo */
    YouTubePlayer.prototype.pauseVideo = function () {
        if (this._player) {
            this._player.pauseVideo();
        }
        else {
            this._getPendingState().playbackState = 2 /* PAUSED */;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#stopVideo */
    YouTubePlayer.prototype.stopVideo = function () {
        if (this._player) {
            this._player.stopVideo();
        }
        else {
            // It seems like YouTube sets the player to CUED when it's stopped.
            this._getPendingState().playbackState = 5 /* CUED */;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#seekTo */
    YouTubePlayer.prototype.seekTo = function (seconds, allowSeekAhead) {
        if (this._player) {
            this._player.seekTo(seconds, allowSeekAhead);
        }
        else {
            this._getPendingState().seek = { seconds: seconds, allowSeekAhead: allowSeekAhead };
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#mute */
    YouTubePlayer.prototype.mute = function () {
        if (this._player) {
            this._player.mute();
        }
        else {
            this._getPendingState().muted = true;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#unMute */
    YouTubePlayer.prototype.unMute = function () {
        if (this._player) {
            this._player.unMute();
        }
        else {
            this._getPendingState().muted = false;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#isMuted */
    YouTubePlayer.prototype.isMuted = function () {
        if (this._player) {
            return this._player.isMuted();
        }
        if (this._pendingPlayerState) {
            return !!this._pendingPlayerState.muted;
        }
        return false;
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#setVolume */
    YouTubePlayer.prototype.setVolume = function (volume) {
        if (this._player) {
            this._player.setVolume(volume);
        }
        else {
            this._getPendingState().volume = volume;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getVolume */
    YouTubePlayer.prototype.getVolume = function () {
        if (this._player) {
            return this._player.getVolume();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.volume != null) {
            return this._pendingPlayerState.volume;
        }
        return 0;
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#setPlaybackRate */
    YouTubePlayer.prototype.setPlaybackRate = function (playbackRate) {
        if (this._player) {
            return this._player.setPlaybackRate(playbackRate);
        }
        else {
            this._getPendingState().playbackRate = playbackRate;
        }
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlaybackRate */
    YouTubePlayer.prototype.getPlaybackRate = function () {
        if (this._player) {
            return this._player.getPlaybackRate();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.playbackRate != null) {
            return this._pendingPlayerState.playbackRate;
        }
        return 0;
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getAvailablePlaybackRates */
    YouTubePlayer.prototype.getAvailablePlaybackRates = function () {
        return this._player ? this._player.getAvailablePlaybackRates() : [];
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoLoadedFraction */
    YouTubePlayer.prototype.getVideoLoadedFraction = function () {
        return this._player ? this._player.getVideoLoadedFraction() : 0;
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlayerState */
    YouTubePlayer.prototype.getPlayerState = function () {
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
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getCurrentTime */
    YouTubePlayer.prototype.getCurrentTime = function () {
        if (this._player) {
            return this._player.getCurrentTime();
        }
        if (this._pendingPlayerState && this._pendingPlayerState.seek) {
            return this._pendingPlayerState.seek.seconds;
        }
        return 0;
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getPlaybackQuality */
    YouTubePlayer.prototype.getPlaybackQuality = function () {
        return this._player ? this._player.getPlaybackQuality() : 'default';
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getAvailableQualityLevels */
    YouTubePlayer.prototype.getAvailableQualityLevels = function () {
        return this._player ? this._player.getAvailableQualityLevels() : [];
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getDuration */
    YouTubePlayer.prototype.getDuration = function () {
        return this._player ? this._player.getDuration() : 0;
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoUrl */
    YouTubePlayer.prototype.getVideoUrl = function () {
        return this._player ? this._player.getVideoUrl() : '';
    };
    /** See https://developers.google.com/youtube/iframe_api_reference#getVideoEmbedCode */
    YouTubePlayer.prototype.getVideoEmbedCode = function () {
        return this._player ? this._player.getVideoEmbedCode() : '';
    };
    /** Gets an object that should be used to store the temporary API state. */
    YouTubePlayer.prototype._getPendingState = function () {
        if (!this._pendingPlayerState) {
            this._pendingPlayerState = {};
        }
        return this._pendingPlayerState;
    };
    /** Initializes a player from a temporary state. */
    YouTubePlayer.prototype._initializePlayer = function (player, state) {
        var playbackState = state.playbackState, playbackRate = state.playbackRate, volume = state.volume, muted = state.muted, seek = state.seek;
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
    };
    /** Gets an observable that adds an event listener to the player when a user subscribes to it. */
    YouTubePlayer.prototype._getLazyEmitter = function (name) {
        var _this = this;
        // Start with the stream of players. This way the events will be transferred
        // over to the new player if it gets swapped out under-the-hood.
        return this._playerChanges.pipe(
        // Switch to the bound event. `switchMap` ensures that the old event is removed when the
        // player is changed. If there's no player, return an observable that never emits.
        switchMap(function (player) {
            return player ? fromEventPattern(function (listener) {
                player.addEventListener(name, listener);
            }, function (listener) {
                // The API seems to throw when we try to unbind from a destroyed player and it doesn't
                // expose whether the player has been destroyed so we have to wrap it in a try/catch to
                // prevent the entire stream from erroring out.
                try {
                    if (player.removeEventListener) {
                        player.removeEventListener(name, listener);
                    }
                }
                catch (_a) { }
            }) : of();
        }), 
        // By default we run all the API interactions outside the zone
        // so we have to bring the events back in manually when they emit.
        function (source) { return new Observable(function (observer) { return source.subscribe({
            next: function (value) { return _this._ngZone.run(function () { return observer.next(value); }); },
            error: function (error) { return observer.error(error); },
            complete: function () { return observer.complete(); }
        }); }); }, 
        // Ensures that everything is cleared out on destroy.
        takeUntil(this._destroyed));
    };
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
    YouTubePlayer.ctorParameters = function () { return [
        { type: NgZone },
        { type: Object, decorators: [{ type: Optional }, { type: Inject, args: [PLATFORM_ID,] }] }
    ]; };
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
}());
/** Listens to changes to the given width and height and sets it on the player. */
function bindSizeToPlayer(playerObs, widthObs, heightObs) {
    return combineLatest([playerObs, widthObs, heightObs])
        .subscribe(function (_a) {
        var _b = __read(_a, 3), player = _b[0], width = _b[1], height = _b[2];
        return player && player.setSize(width, height);
    });
}
/** Listens to changes from the suggested quality and sets it on the given player. */
function bindSuggestedQualityToPlayer(playerObs, suggestedQualityObs) {
    return combineLatest([
        playerObs,
        suggestedQualityObs
    ]).subscribe(function (_a) {
        var _b = __read(_a, 2), player = _b[0], suggestedQuality = _b[1];
        return player && suggestedQuality && player.setPlaybackQuality(suggestedQuality);
    });
}
/**
 * Returns an observable that emits the loaded player once it's ready. Certain properties/methods
 * won't be available until the iframe finishes loading.
 * @param onAbort Callback function that will be invoked if the player loading was aborted before
 * it was able to complete. Can be used to clean up any loose references.
 */
function waitUntilReady(onAbort) {
    return flatMap(function (player) {
        if (!player) {
            return of(undefined);
        }
        if (playerIsReady(player)) {
            return of(player);
        }
        // Since removeEventListener is not on Player when it's initialized, we can't use fromEvent.
        // The player is not initialized fully until the ready is called.
        return new Observable(function (emitter) {
            var aborted = false;
            var resolved = false;
            var onReady = function (event) {
                resolved = true;
                if (!aborted) {
                    event.target.removeEventListener('onReady', onReady);
                    emitter.next(event.target);
                }
            };
            player.addEventListener('onReady', onReady);
            return function () {
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
    var playerOptions = videoIdObs
        .pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map(function (_a) {
        var _b = __read(_a, 2), videoId = _b[0], _c = __read(_b[1], 2), width = _c[0], height = _c[1];
        return videoId ? ({ videoId: videoId, width: width, height: height }) : undefined;
    }));
    return combineLatest([youtubeContainer, playerOptions, of(ngZone)])
        .pipe(skipUntilRememberLatest(iframeApiAvailableObs), scan(syncPlayerState, undefined), distinctUntilChanged());
}
/** Skips the given observable until the other observable emits true, then emit the latest. */
function skipUntilRememberLatest(notifier) {
    return pipe(combineLatest$1(notifier), skipWhile(function (_a) {
        var _b = __read(_a, 2), _ = _b[0], doneSkipping = _b[1];
        return !doneSkipping;
    }), map(function (_a) {
        var _b = __read(_a, 1), value = _b[0];
        return value;
    }));
}
/** Destroy the player if there are no options, or create the player if there are options. */
function syncPlayerState(player, _a) {
    var _b = __read(_a, 3), container = _b[0], videoOptions = _b[1], ngZone = _b[2];
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
    var newPlayer = ngZone.runOutsideAngular(function () { return new YT.Player(container, videoOptions); });
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
    var cueOptionsObs = combineLatest([startSecondsObs, endSecondsObs])
        .pipe(map(function (_a) {
        var _b = __read(_a, 2), startSeconds = _b[0], endSeconds = _b[1];
        return ({ startSeconds: startSeconds, endSeconds: endSeconds });
    }));
    // Only respond to changes in cue options if the player is not running.
    var filteredCueOptions = cueOptionsObs
        .pipe(filterOnOther(playerObs, function (player) { return !!player && !hasPlayerStarted(player); }));
    // If the video id changed, there's no reason to run 'cue' unless the player
    // was initialized with a different video id.
    var changedVideoId = videoIdObs
        .pipe(filterOnOther(playerObs, function (player, videoId) { return !!player && player.videoId !== videoId; }));
    // If the player changed, there's no reason to run 'cue' unless there are cue options.
    var changedPlayer = playerObs.pipe(filterOnOther(combineLatest([videoIdObs, cueOptionsObs]), function (_a, player) {
        var _b = __read(_a, 2), videoId = _b[0], cueOptions = _b[1];
        return !!player &&
            (videoId != player.videoId || !!cueOptions.startSeconds || !!cueOptions.endSeconds);
    }));
    merge(changedPlayer, changedVideoId, filteredCueOptions)
        .pipe(withLatestFrom(combineLatest([playerObs, videoIdObs, cueOptionsObs, suggestedQualityObs])), map(function (_a) {
        var _b = __read(_a, 2), _ = _b[0], values = _b[1];
        return values;
    }), takeUntil(destroyed))
        .subscribe(function (_a) {
        var _b = __read(_a, 4), player = _b[0], videoId = _b[1], cueOptions = _b[2], suggestedQuality = _b[3];
        if (!videoId || !player) {
            return;
        }
        player.videoId = videoId;
        player.cueVideoById(__assign({ videoId: videoId,
            suggestedQuality: suggestedQuality }, cueOptions));
    });
}
function hasPlayerStarted(player) {
    var state = player.getPlayerState();
    return state !== -1 /* UNSTARTED */ && state !== 5 /* CUED */;
}
function playerIsReady(player) {
    return 'getPlayerStatus' in player;
}
/** Combines the two observables temporarily for the filter function. */
function filterOnOther(otherObs, filterFn) {
    return pipe(withLatestFrom(otherObs), filter(function (_a) {
        var _b = __read(_a, 2), value = _b[0], other = _b[1];
        return filterFn(other, value);
    }), map(function (_a) {
        var _b = __read(_a, 1), value = _b[0];
        return value;
    }));
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var COMPONENTS = [YouTubePlayer];
var YouTubePlayerModule = /** @class */ (function () {
    function YouTubePlayerModule() {
    }
    YouTubePlayerModule.decorators = [
        { type: NgModule, args: [{
                    declarations: COMPONENTS,
                    exports: COMPONENTS,
                },] }
    ];
    return YouTubePlayerModule;
}());

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { YouTubePlayer, YouTubePlayerModule };
//# sourceMappingURL=youtube-player.js.map
