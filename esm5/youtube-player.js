/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { __assign, __read } from "tslib";
// Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1265
/// <reference types="youtube" />
import { ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, Output, ViewChild, ViewEncapsulation, Optional, Inject, PLATFORM_ID, } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { combineLatest, merge, Observable, of as observableOf, pipe, Subject, of, BehaviorSubject, fromEventPattern, } from 'rxjs';
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, switchMap, tap, } from 'rxjs/operators';
export var DEFAULT_PLAYER_WIDTH = 640;
export var DEFAULT_PLAYER_HEIGHT = 390;
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
        var iframeApiAvailableObs = observableOf(true);
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
            }) : observableOf();
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
export { YouTubePlayer };
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
            return observableOf(undefined);
        }
        if (playerIsReady(player)) {
            return observableOf(player);
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
    return pipe(combineLatestOp(notifier), skipWhile(function (_a) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsUUFBUSxFQUNSLE1BQU0sRUFDTixXQUFXLEdBQ1osTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFbEQsT0FBTyxFQUNMLGFBQWEsRUFFYixLQUFLLEVBRUwsVUFBVSxFQUNWLEVBQUUsSUFBSSxZQUFZLEVBRWxCLElBQUksRUFDSixPQUFPLEVBQ1AsRUFBRSxFQUNGLGVBQWUsRUFDZixnQkFBZ0IsR0FDakIsTUFBTSxNQUFNLENBQUM7QUFFZCxPQUFPLEVBQ0wsYUFBYSxJQUFJLGVBQWUsRUFDaEMsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixPQUFPLEVBQ1AsR0FBRyxFQUNILE9BQU8sRUFDUCxJQUFJLEVBQ0osU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osU0FBUyxFQUNULGNBQWMsRUFDZCxTQUFTLEVBQ1QsR0FBRyxHQUNKLE1BQU0sZ0JBQWdCLENBQUM7QUFTeEIsTUFBTSxDQUFDLElBQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxJQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztBQXdCekM7Ozs7R0FJRztBQUNIO0lBNEZFLHVCQUNVLE9BQWU7SUFDdkI7OztPQUdHO0lBQzhCLFVBQW1CO1FBTDVDLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFuRmpCLHNCQUFpQixHQUFH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KiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIFdvcmthcm91bmQgZm9yOiBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9ydWxlc19ub2RlanMvaXNzdWVzLzEyNjVcbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwieW91dHViZVwiIC8+XG5cbmltcG9ydCB7XG4gIEFmdGVyVmlld0luaXQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIE9wdGlvbmFsLFxuICBJbmplY3QsXG4gIFBMQVRGT1JNX0lELFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7aXNQbGF0Zm9ybUJyb3dzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QsXG4gIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSxcbiAgbWVyZ2UsXG4gIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbixcbiAgT2JzZXJ2YWJsZSxcbiAgb2YgYXMgb2JzZXJ2YWJsZU9mLFxuICBPcGVyYXRvckZ1bmN0aW9uLFxuICBwaXBlLFxuICBTdWJqZWN0LFxuICBvZixcbiAgQmVoYXZpb3JTdWJqZWN0LFxuICBmcm9tRXZlbnRQYXR0ZXJuLFxufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCBhcyBjb21iaW5lTGF0ZXN0T3AsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBmaWx0ZXIsXG4gIGZsYXRNYXAsXG4gIG1hcCxcbiAgcHVibGlzaCxcbiAgc2NhbixcbiAgc2tpcFdoaWxlLFxuICBzdGFydFdpdGgsXG4gIHRha2UsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIHN3aXRjaE1hcCxcbiAgdGFwLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgWVQ6IHR5cGVvZiBZVCB8IHVuZGVmaW5lZDtcbiAgICBvbllvdVR1YmVJZnJhbWVBUElSZWFkeTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9XSURUSCA9IDY0MDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9IRUlHSFQgPSAzOTA7XG5cbi8vIFRoZSBuYXRpdmUgWVQuUGxheWVyIGRvZXNuJ3QgZXhwb3NlIHRoZSBzZXQgdmlkZW9JZCwgYnV0IHdlIG5lZWQgaXQgZm9yXG4vLyBjb252ZW5pZW5jZS5cbmludGVyZmFjZSBQbGF5ZXIgZXh0ZW5kcyBZVC5QbGF5ZXIge1xuICB2aWRlb0lkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuXG4vLyBUaGUgcGxheWVyIGlzbid0IGZ1bGx5IGluaXRpYWxpemVkIHdoZW4gaXQncyBjb25zdHJ1Y3RlZC5cbi8vIFRoZSBvbmx5IGZpZWxkIGF2YWlsYWJsZSBpcyBkZXN0cm95IGFuZCBhZGRFdmVudExpc3RlbmVyLlxudHlwZSBVbmluaXRpYWxpemVkUGxheWVyID0gUGljazxQbGF5ZXIsICd2aWRlb0lkJyB8ICdkZXN0cm95JyB8ICdhZGRFdmVudExpc3RlbmVyJz47XG5cbi8qKlxuICogT2JqZWN0IHVzZWQgdG8gc3RvcmUgdGhlIHN0YXRlIG9mIHRoZSBwbGF5ZXIgaWYgdGhlXG4gKiB1c2VyIHRyaWVzIHRvIGludGVyYWN0IHdpdGggdGhlIEFQSSBiZWZvcmUgaXQgaGFzIGJlZW4gbG9hZGVkLlxuICovXG5pbnRlcmZhY2UgUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgcGxheWJhY2tTdGF0ZT86IFlULlBsYXllclN0YXRlLlBMQVlJTkcgfCBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQgfCBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICBwbGF5YmFja1JhdGU/OiBudW1iZXI7XG4gIHZvbHVtZT86IG51bWJlcjtcbiAgbXV0ZWQ/OiBib29sZWFuO1xuICBzZWVrPzoge3NlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW59O1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY29tcG9uZW50IHRoYXQgcmVuZGVycyBhIFlvdVR1YmUgcGxheWVyIHZpYSB0aGUgWW91VHViZSBwbGF5ZXJcbiAqIGlmcmFtZSBBUEkuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2VcbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAneW91dHViZS1wbGF5ZXInLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgLy8gVGhpcyBkaXYgaXMgKnJlcGxhY2VkKiBieSB0aGUgWW91VHViZSBwbGF5ZXIgZW1iZWQuXG4gIHRlbXBsYXRlOiAnPGRpdiAjeW91dHViZUNvbnRhaW5lcj48L2Rpdj4nLFxufSlcbmV4cG9ydCBjbGFzcyBZb3VUdWJlUGxheWVyIGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95LCBPbkluaXQge1xuICAvKiogV2hldGhlciB3ZSdyZSBjdXJyZW50bHkgcmVuZGVyaW5nIGluc2lkZSBhIGJyb3dzZXIuICovXG4gIHByaXZhdGUgX2lzQnJvd3NlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfeW91dHViZUNvbnRhaW5lciA9IG5ldyBTdWJqZWN0PEhUTUxFbGVtZW50PigpO1xuICBwcml2YXRlIF9kZXN0cm95ZWQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICBwcml2YXRlIF9wbGF5ZXI6IFBsYXllciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BlbmRpbmdQbGF5ZXJTdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wbGF5ZXJDaGFuZ2VzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBZb3VUdWJlIFZpZGVvIElEIHRvIHZpZXcgKi9cbiAgQElucHV0KClcbiAgZ2V0IHZpZGVvSWQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3ZpZGVvSWQudmFsdWU7IH1cbiAgc2V0IHZpZGVvSWQodmlkZW9JZDogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fdmlkZW9JZC5uZXh0KHZpZGVvSWQpO1xuICB9XG4gIHByaXZhdGUgX3ZpZGVvSWQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZyB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogSGVpZ2h0IG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl9oZWlnaHQudmFsdWU7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodC5uZXh0KGhlaWdodCB8fCBERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuICB9XG4gIHByaXZhdGUgX2hlaWdodCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl93aWR0aC52YWx1ZTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3dpZHRoLm5leHQod2lkdGggfHwgREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuICB9XG4gIHByaXZhdGUgX3dpZHRoID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX1dJRFRIKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RhcnQgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgc3RhcnRTZWNvbmRzKHN0YXJ0U2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLm5leHQoc3RhcnRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIF9zdGFydFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RvcCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBlbmRTZWNvbmRzKGVuZFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2VuZFNlY29uZHMubmV4dChlbmRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIF9lbmRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBvZiB0aGUgcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdWdnZXN0ZWRRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkubmV4dChzdWdnZXN0ZWRRdWFsaXR5KTtcbiAgfVxuICBwcml2YXRlIF9zdWdnZXN0ZWRRdWFsaXR5ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGlmcmFtZSB3aWxsIGF0dGVtcHQgdG8gbG9hZCByZWdhcmRsZXNzIG9mIHRoZSBzdGF0dXMgb2YgdGhlIGFwaSBvbiB0aGVcbiAgICogcGFnZS4gU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3UgZG9uJ3Qgd2FudCB0aGUgYG9uWW91VHViZUlmcmFtZUFQSVJlYWR5YCBmaWVsZCB0byBiZVxuICAgKiBzZXQgb24gdGhlIGdsb2JhbCB3aW5kb3cuXG4gICAqL1xuICBASW5wdXQoKSBzaG93QmVmb3JlSWZyYW1lQXBpTG9hZHM6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqIE91dHB1dHMgYXJlIGRpcmVjdCBwcm94aWVzIGZyb20gdGhlIHBsYXllciBpdHNlbGYuICovXG4gIEBPdXRwdXQoKSByZWFkeTogT2JzZXJ2YWJsZTxZVC5QbGF5ZXJFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCdvblJlYWR5Jyk7XG5cbiAgQE91dHB1dCgpIHN0YXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uU3RhdGVDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50Pignb25TdGF0ZUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSBlcnJvcjogT2JzZXJ2YWJsZTxZVC5PbkVycm9yRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uRXJyb3JFdmVudD4oJ29uRXJyb3InKTtcblxuICBAT3V0cHV0KCkgYXBpQ2hhbmdlOiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uQXBpQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIHBsYXliYWNrUXVhbGl0eUNoYW5nZTogT2JzZXJ2YWJsZTxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblBsYXliYWNrUXVhbGl0eUNoYW5nZUV2ZW50Pignb25QbGF5YmFja1F1YWxpdHlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcGxheWJhY2tSYXRlQ2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUmF0ZUNoYW5nZScpO1xuXG4gIC8qKiBUaGUgZWxlbWVudCB0aGF0IHdpbGwgYmUgcmVwbGFjZWQgYnkgdGhlIGlmcmFtZS4gKi9cbiAgQFZpZXdDaGlsZCgneW91dHViZUNvbnRhaW5lcicpXG4gIHlvdXR1YmVDb250YWluZXI6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgX25nWm9uZTogTmdab25lLFxuICAgIC8qKlxuICAgICAqIEBkZXByZWNhdGVkIGBwbGF0Zm9ybUlkYCBwYXJhbWV0ZXIgdG8gYmVjb21lIHJlcXVpcmVkLlxuICAgICAqIEBicmVha2luZy1jaGFuZ2UgMTAuMC4wXG4gICAgICovXG4gICAgQE9wdGlvbmFsKCkgQEluamVjdChQTEFURk9STV9JRCkgcGxhdGZvcm1JZD86IE9iamVjdCkge1xuXG4gICAgLy8gQGJyZWFraW5nLWNoYW5nZSAxMC4wLjAgUmVtb3ZlIG51bGwgY2hlY2sgZm9yIGBwbGF0Zm9ybUlkYC5cbiAgICB0aGlzLl9pc0Jyb3dzZXIgPVxuICAgICAgICBwbGF0Zm9ybUlkID8gaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCkgOiB0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiAhIXdpbmRvdztcbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIHdlJ3JlIG5vdCBpbiBhIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+ID0gb2JzZXJ2YWJsZU9mKHRydWUpO1xuICAgIGlmICghd2luZG93LllUKSB7XG4gICAgICBpZiAodGhpcy5zaG93QmVmb3JlSWZyYW1lQXBpTG9hZHMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOYW1lc3BhY2UgWVQgbm90IGZvdW5kLCBjYW5ub3QgY29uc3RydWN0IGVtYmVkZGVkIHlvdXR1YmUgcGxheWVyLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgaW5zdGFsbCB0aGUgWW91VHViZSBQbGF5ZXIgQVBJIFJlZmVyZW5jZSBmb3IgaWZyYW1lIEVtYmVkczogJyArXG4gICAgICAgICAgICAnaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0ID0gbmV3IFN1YmplY3Q8Ym9vbGVhbj4oKTtcbiAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjayA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcblxuICAgICAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbmdab25lLnJ1bigoKSA9PiBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0Lm5leHQodHJ1ZSkpO1xuICAgICAgfTtcbiAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyA9IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QucGlwZSh0YWtlKDEpLCBzdGFydFdpdGgoZmFsc2UpKTtcbiAgICB9XG5cbiAgICAvLyBBbiBvYnNlcnZhYmxlIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHBsYXllci5cbiAgICBjb25zdCBwbGF5ZXJPYnMgPVxuICAgICAgY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgICAgICAgdGhpcy5feW91dHViZUNvbnRhaW5lcixcbiAgICAgICAgdGhpcy5fdmlkZW9JZCxcbiAgICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzLFxuICAgICAgICB0aGlzLl93aWR0aCxcbiAgICAgICAgdGhpcy5faGVpZ2h0LFxuICAgICAgICB0aGlzLl9uZ1pvbmVcbiAgICAgICkucGlwZSh0YXAocGxheWVyID0+IHtcbiAgICAgICAgLy8gRW1pdCB0aGlzIGJlZm9yZSB0aGUgYHdhaXRVbnRpbFJlYWR5YCBjYWxsIHNvIHRoYXQgd2UgY2FuIGJpbmQgdG9cbiAgICAgICAgLy8gZXZlbnRzIHRoYXQgaGFwcGVuIGFzIHRoZSBwbGF5ZXIgaXMgYmVpbmcgaW5pdGlhbGl6ZWQgKGUuZy4gYG9uUmVhZHlgKS5cbiAgICAgICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5uZXh0KHBsYXllcik7XG4gICAgICB9KSwgd2FpdFVudGlsUmVhZHkocGxheWVyID0+IHtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgcGxheWVyIGlmIGxvYWRpbmcgd2FzIGFib3J0ZWQgc28gdGhhdCB3ZSBkb24ndCBlbmQgdXAgbGVha2luZyBtZW1vcnkuXG4gICAgICAgIGlmICghcGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfSksIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95ZWQpLCBwdWJsaXNoKCkpO1xuXG4gICAgLy8gU2V0IHVwIHNpZGUgZWZmZWN0cyB0byBiaW5kIGlucHV0cyB0byB0aGUgcGxheWVyLlxuICAgIHBsYXllck9icy5zdWJzY3JpYmUocGxheWVyID0+IHtcbiAgICAgIHRoaXMuX3BsYXllciA9IHBsYXllcjtcblxuICAgICAgaWYgKHBsYXllciAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZVBsYXllcihwbGF5ZXIsIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIGJpbmRTaXplVG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5KTtcblxuICAgIGJpbmRDdWVWaWRlb0NhbGwoXG4gICAgICBwbGF5ZXJPYnMsXG4gICAgICB0aGlzLl92aWRlb0lkLFxuICAgICAgdGhpcy5fc3RhcnRTZWNvbmRzLFxuICAgICAgdGhpcy5fZW5kU2Vjb25kcyxcbiAgICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHksXG4gICAgICB0aGlzLl9kZXN0cm95ZWQpO1xuXG4gICAgLy8gQWZ0ZXIgYWxsIG9mIHRoZSBzdWJzY3JpcHRpb25zIGFyZSBzZXQgdXAsIGNvbm5lY3QgdGhlIG9ic2VydmFibGUuXG4gICAgKHBsYXllck9icyBhcyBDb25uZWN0YWJsZU9ic2VydmFibGU8UGxheWVyPikuY29ubmVjdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIE5vIGxvbmdlciBiZWluZyB1c2VkLiBUbyBiZSByZW1vdmVkLlxuICAgKiBAYnJlYWtpbmctY2hhbmdlIDExLjAuMFxuICAgKi9cbiAgY3JlYXRlRXZlbnRzQm91bmRJblpvbmUoKTogWVQuRXZlbnRzIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5uZXh0KHRoaXMueW91dHViZUNvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5kZXN0cm95KCk7XG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s7XG4gICAgfVxuXG4gICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3ZpZGVvSWQuY29tcGxldGUoKTtcbiAgICB0aGlzLl9oZWlnaHQuY29tcGxldGUoKTtcbiAgICB0aGlzLl93aWR0aC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N0YXJ0U2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2VuZFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5uZXh0KCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLmNvbXBsZXRlKCk7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGxheVZpZGVvICovXG4gIHBsYXlWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwYXVzZVZpZGVvICovXG4gIHBhdXNlVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBhdXNlVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBBVVNFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc3RvcFZpZGVvICovXG4gIHN0b3BWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEl0IHNlZW1zIGxpa2UgWW91VHViZSBzZXRzIHRoZSBwbGF5ZXIgdG8gQ1VFRCB3aGVuIGl0J3Mgc3RvcHBlZC5cbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZWVrVG8gKi9cbiAgc2Vla1RvKHNlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2Vla1RvKHNlY29uZHMsIGFsbG93U2Vla0FoZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkuc2VlayA9IHtzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI211dGUgKi9cbiAgbXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIubXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3VuTXV0ZSAqL1xuICB1bk11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnVuTXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNpc011dGVkICovXG4gIGlzTXV0ZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5pc011dGVkKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLm11dGVkO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRWb2x1bWUgKi9cbiAgc2V0Vm9sdW1lKHZvbHVtZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS52b2x1bWUgPSB2b2x1bWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZvbHVtZSAqL1xuICBnZXRWb2x1bWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFZvbHVtZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRQbGF5YmFja1JhdGUgKi9cbiAgc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tSYXRlID0gcGxheWJhY2tSYXRlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1JhdGUgKi9cbiAgZ2V0UGxheWJhY2tSYXRlKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1JhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcyAqL1xuICBnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvTG9hZGVkRnJhY3Rpb24gKi9cbiAgZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5ZXJTdGF0ZSAqL1xuICBnZXRQbGF5ZXJTdGF0ZSgpOiBZVC5QbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIgfHwgIXdpbmRvdy5ZVCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFlULlBsYXllclN0YXRlLlVOU1RBUlRFRDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRDdXJyZW50VGltZSAqL1xuICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWsuc2Vjb25kcztcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1F1YWxpdHkgKi9cbiAgZ2V0UGxheWJhY2tRdWFsaXR5KCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1F1YWxpdHkoKSA6ICdkZWZhdWx0JztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzICovXG4gIGdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5W10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0RHVyYXRpb24gKi9cbiAgZ2V0RHVyYXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldER1cmF0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvVXJsICovXG4gIGdldFZpZGVvVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb1VybCgpIDogJyc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9FbWJlZENvZGUgKi9cbiAgZ2V0VmlkZW9FbWJlZENvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvRW1iZWRDb2RlKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSB1c2VkIHRvIHN0b3JlIHRoZSB0ZW1wb3JhcnkgQVBJIHN0YXRlLiAqL1xuICBwcml2YXRlIF9nZXRQZW5kaW5nU3RhdGUoKTogUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgICBpZiAoIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZTtcbiAgfVxuXG4gIC8qKiBJbml0aWFsaXplcyBhIHBsYXllciBmcm9tIGEgdGVtcG9yYXJ5IHN0YXRlLiAqL1xuICBwcml2YXRlIF9pbml0aWFsaXplUGxheWVyKHBsYXllcjogWVQuUGxheWVyLCBzdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlKTogdm9pZCB7XG4gICAgY29uc3Qge3BsYXliYWNrU3RhdGUsIHBsYXliYWNrUmF0ZSwgdm9sdW1lLCBtdXRlZCwgc2Vla30gPSBzdGF0ZTtcblxuICAgIHN3aXRjaCAocGxheWJhY2tTdGF0ZSkge1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HOiBwbGF5ZXIucGxheVZpZGVvKCk7IGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ6IHBsYXllci5wYXVzZVZpZGVvKCk7IGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5DVUVEOiBwbGF5ZXIuc3RvcFZpZGVvKCk7IGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH1cblxuICAgIGlmICh2b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH1cblxuICAgIGlmIChtdXRlZCAhPSBudWxsKSB7XG4gICAgICBtdXRlZCA/IHBsYXllci5tdXRlKCkgOiBwbGF5ZXIudW5NdXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlZWsgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNlZWtUbyhzZWVrLnNlY29uZHMsIHNlZWsuYWxsb3dTZWVrQWhlYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9ic2VydmFibGUgdGhhdCBhZGRzIGFuIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBwbGF5ZXIgd2hlbiBhIHVzZXIgc3Vic2NyaWJlcyB0byBpdC4gKi9cbiAgcHJpdmF0ZSBfZ2V0TGF6eUVtaXR0ZXI8VCBleHRlbmRzIFlULlBsYXllckV2ZW50PihuYW1lOiBrZXlvZiBZVC5FdmVudHMpOiBPYnNlcnZhYmxlPFQ+IHtcbiAgICAvLyBTdGFydCB3aXRoIHRoZSBzdHJlYW0gb2YgcGxheWVycy4gVGhpcyB3YXkgdGhlIGV2ZW50cyB3aWxsIGJlIHRyYW5zZmVycmVkXG4gICAgLy8gb3ZlciB0byB0aGUgbmV3IHBsYXllciBpZiBpdCBnZXRzIHN3YXBwZWQgb3V0IHVuZGVyLXRoZS1ob29kLlxuICAgIHJldHVybiB0aGlzLl9wbGF5ZXJDaGFuZ2VzLnBpcGUoXG4gICAgICAvLyBTd2l0Y2ggdG8gdGhlIGJvdW5kIGV2ZW50LiBgc3dpdGNoTWFwYCBlbnN1cmVzIHRoYXQgdGhlIG9sZCBldmVudCBpcyByZW1vdmVkIHdoZW4gdGhlXG4gICAgICAvLyBwbGF5ZXIgaXMgY2hhbmdlZC4gSWYgdGhlcmUncyBubyBwbGF5ZXIsIHJldHVybiBhbiBvYnNlcnZhYmxlIHRoYXQgbmV2ZXIgZW1pdHMuXG4gICAgICBzd2l0Y2hNYXAocGxheWVyID0+IHtcbiAgICAgICAgcmV0dXJuIHBsYXllciA/IGZyb21FdmVudFBhdHRlcm48VD4oKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgIH0sIChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgLy8gVGhlIEFQSSBzZWVtcyB0byB0aHJvdyB3aGVuIHdlIHRyeSB0byB1bmJpbmQgZnJvbSBhIGRlc3Ryb3llZCBwbGF5ZXIgYW5kIGl0IGRvZXNuJ3RcbiAgICAgICAgICAvLyBleHBvc2Ugd2hldGhlciB0aGUgcGxheWVyIGhhcyBiZWVuIGRlc3Ryb3llZCBzbyB3ZSBoYXZlIHRvIHdyYXAgaXQgaW4gYSB0cnkvY2F0Y2ggdG9cbiAgICAgICAgICAvLyBwcmV2ZW50IHRoZSBlbnRpcmUgc3RyZWFtIGZyb20gZXJyb3Jpbmcgb3V0LlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoKHBsYXllciBhcyBQbGF5ZXIpLnJlbW92ZUV2ZW50TGlzdGVuZXIhKSB7XG4gICAgICAgICAgICAgIChwbGF5ZXIgYXMgUGxheWVyKS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIH0pIDogb2JzZXJ2YWJsZU9mPFQ+KCk7XG4gICAgICB9KSxcbiAgICAgIC8vIEJ5IGRlZmF1bHQgd2UgcnVuIGFsbCB0aGUgQVBJIGludGVyYWN0aW9ucyBvdXRzaWRlIHRoZSB6b25lXG4gICAgICAvLyBzbyB3ZSBoYXZlIHRvIGJyaW5nIHRoZSBldmVudHMgYmFjayBpbiBtYW51YWxseSB3aGVuIHRoZXkgZW1pdC5cbiAgICAgIChzb3VyY2U6IE9ic2VydmFibGU8VD4pID0+IG5ldyBPYnNlcnZhYmxlPFQ+KG9ic2VydmVyID0+IHNvdXJjZS5zdWJzY3JpYmUoe1xuICAgICAgICBuZXh0OiB2YWx1ZSA9PiB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IG9ic2VydmVyLm5leHQodmFsdWUpKSxcbiAgICAgICAgZXJyb3I6IGVycm9yID0+IG9ic2VydmVyLmVycm9yKGVycm9yKSxcbiAgICAgICAgY29tcGxldGU6ICgpID0+IG9ic2VydmVyLmNvbXBsZXRlKClcbiAgICAgIH0pKSxcbiAgICAgIC8vIEVuc3VyZXMgdGhhdCBldmVyeXRoaW5nIGlzIGNsZWFyZWQgb3V0IG9uIGRlc3Ryb3kuXG4gICAgICB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKVxuICAgICk7XG4gIH1cbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyB0byB0aGUgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCBhbmQgc2V0cyBpdCBvbiB0aGUgcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFNpemVUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgd2lkdGhPYnMsIGhlaWdodE9ic10pXG4gICAgICAuc3Vic2NyaWJlKChbcGxheWVyLCB3aWR0aCwgaGVpZ2h0XSkgPT4gcGxheWVyICYmIHBsYXllci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpKTtcbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyBmcm9tIHRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBhbmQgc2V0cyBpdCBvbiB0aGUgZ2l2ZW4gcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFN1Z2dlc3RlZFF1YWxpdHlUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHN1Z2dlc3RlZFF1YWxpdHlPYnM6IE9ic2VydmFibGU8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPlxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtcbiAgICBwbGF5ZXJPYnMsXG4gICAgc3VnZ2VzdGVkUXVhbGl0eU9ic1xuICBdKS5zdWJzY3JpYmUoXG4gICAgKFtwbGF5ZXIsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PlxuICAgICAgICBwbGF5ZXIgJiYgc3VnZ2VzdGVkUXVhbGl0eSAmJiBwbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHkpKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgbG9hZGVkIHBsYXllciBvbmNlIGl0J3MgcmVhZHkuIENlcnRhaW4gcHJvcGVydGllcy9tZXRob2RzXG4gKiB3b24ndCBiZSBhdmFpbGFibGUgdW50aWwgdGhlIGlmcmFtZSBmaW5pc2hlcyBsb2FkaW5nLlxuICogQHBhcmFtIG9uQWJvcnQgQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGludm9rZWQgaWYgdGhlIHBsYXllciBsb2FkaW5nIHdhcyBhYm9ydGVkIGJlZm9yZVxuICogaXQgd2FzIGFibGUgdG8gY29tcGxldGUuIENhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueSBsb29zZSByZWZlcmVuY2VzLlxuICovXG5mdW5jdGlvbiB3YWl0VW50aWxSZWFkeShvbkFib3J0OiAocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKSA9PiB2b2lkKTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLCBQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcbiAgcmV0dXJuIGZsYXRNYXAocGxheWVyID0+IHtcbiAgICBpZiAoIXBsYXllcikge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZjxQbGF5ZXJ8dW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mKHBsYXllciBhcyBQbGF5ZXIpO1xuICAgIH1cblxuICAgIC8vIFNpbmNlIHJlbW92ZUV2ZW50TGlzdGVuZXIgaXMgbm90IG9uIFBsYXllciB3aGVuIGl0J3MgaW5pdGlhbGl6ZWQsIHdlIGNhbid0IHVzZSBmcm9tRXZlbnQuXG4gICAgLy8gVGhlIHBsYXllciBpcyBub3QgaW5pdGlhbGl6ZWQgZnVsbHkgdW50aWwgdGhlIHJlYWR5IGlzIGNhbGxlZC5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGxheWVyPihlbWl0dGVyID0+IHtcbiAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG4gICAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IFlULlBsYXllckV2ZW50KSA9PiB7XG4gICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIWFib3J0ZWQpIHtcbiAgICAgICAgICBldmVudC50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuICAgICAgICAgIGVtaXR0ZXIubmV4dChldmVudC50YXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgb25BYm9ydChwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKHVuZGVmaW5lZCkpO1xuICB9KTtcbn1cblxuLyoqIENyZWF0ZSBhbiBvYnNlcnZhYmxlIGZvciB0aGUgcGxheWVyIGJhc2VkIG9uIHRoZSBnaXZlbiBvcHRpb25zLiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgeW91dHViZUNvbnRhaW5lcjogT2JzZXJ2YWJsZTxIVE1MRWxlbWVudD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgbmdab25lOiBOZ1pvbmVcbik6IE9ic2VydmFibGU8VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZD4ge1xuXG4gIGNvbnN0IHBsYXllck9wdGlvbnMgPVxuICAgIHZpZGVvSWRPYnNcbiAgICAucGlwZShcbiAgICAgIHdpdGhMYXRlc3RGcm9tKGNvbWJpbmVMYXRlc3QoW3dpZHRoT2JzLCBoZWlnaHRPYnNdKSksXG4gICAgICBtYXAoKFt2aWRlb0lkLCBbd2lkdGgsIGhlaWdodF1dKSA9PiB2aWRlb0lkID8gKHt2aWRlb0lkLCB3aWR0aCwgaGVpZ2h0fSkgOiB1bmRlZmluZWQpLFxuICAgICk7XG5cbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3lvdXR1YmVDb250YWluZXIsIHBsYXllck9wdGlvbnMsIG9mKG5nWm9uZSldKVxuICAgICAgLnBpcGUoXG4gICAgICAgIHNraXBVbnRpbFJlbWVtYmVyTGF0ZXN0KGlmcmFtZUFwaUF2YWlsYWJsZU9icyksXG4gICAgICAgIHNjYW4oc3luY1BsYXllclN0YXRlLCB1bmRlZmluZWQpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpKTtcbn1cblxuLyoqIFNraXBzIHRoZSBnaXZlbiBvYnNlcnZhYmxlIHVudGlsIHRoZSBvdGhlciBvYnNlcnZhYmxlIGVtaXRzIHRydWUsIHRoZW4gZW1pdCB0aGUgbGF0ZXN0LiAqL1xuZnVuY3Rpb24gc2tpcFVudGlsUmVtZW1iZXJMYXRlc3Q8VD4obm90aWZpZXI6IE9ic2VydmFibGU8Ym9vbGVhbj4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICByZXR1cm4gcGlwZShcbiAgICBjb21iaW5lTGF0ZXN0T3Aobm90aWZpZXIpLFxuICAgIHNraXBXaGlsZSgoW18sIGRvbmVTa2lwcGluZ10pID0+ICFkb25lU2tpcHBpbmcpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpKTtcbn1cblxuLyoqIERlc3Ryb3kgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgbm8gb3B0aW9ucywgb3IgY3JlYXRlIHRoZSBwbGF5ZXIgaWYgdGhlcmUgYXJlIG9wdGlvbnMuICovXG5mdW5jdGlvbiBzeW5jUGxheWVyU3RhdGUoXG4gIHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCxcbiAgW2NvbnRhaW5lciwgdmlkZW9PcHRpb25zLCBuZ1pvbmVdOiBbSFRNTEVsZW1lbnQsIFlULlBsYXllck9wdGlvbnMgfCB1bmRlZmluZWQsIE5nWm9uZV0sXG4pOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF2aWRlb09wdGlvbnMpIHtcbiAgICBpZiAocGxheWVyKSB7XG4gICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHBsYXllcikge1xuICAgIHJldHVybiBwbGF5ZXI7XG4gIH1cblxuICAvLyBJbXBvcnRhbnQhIFdlIG5lZWQgdG8gY3JlYXRlIHRoZSBQbGF5ZXIgb2JqZWN0IG91dHNpZGUgb2YgdGhlIGBOZ1pvbmVgLCBiZWNhdXNlIGl0IGtpY2tzXG4gIC8vIG9mZiBhIDI1MG1zIHNldEludGVydmFsIHdoaWNoIHdpbGwgY29udGludWFsbHkgdHJpZ2dlciBjaGFuZ2UgZGV0ZWN0aW9uIGlmIHdlIGRvbid0LlxuICBjb25zdCBuZXdQbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPVxuICAgICAgbmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IG5ldyBZVC5QbGF5ZXIoY29udGFpbmVyLCB2aWRlb09wdGlvbnMpKTtcbiAgLy8gQmluZCB2aWRlb0lkIGZvciBmdXR1cmUgdXNlLlxuICBuZXdQbGF5ZXIudmlkZW9JZCA9IHZpZGVvT3B0aW9ucy52aWRlb0lkO1xuICByZXR1cm4gbmV3UGxheWVyO1xufVxuXG4vKipcbiAqIENhbGwgY3VlVmlkZW9CeUlkIGlmIHRoZSB2aWRlb0lkIGNoYW5nZXMsIG9yIHdoZW4gc3RhcnQgb3IgZW5kIHNlY29uZHMgY2hhbmdlLiBjdWVWaWRlb0J5SWQgd2lsbFxuICogY2hhbmdlIHRoZSBsb2FkZWQgdmlkZW8gaWQgdG8gdGhlIGdpdmVuIHZpZGVvSWQsIGFuZCBzZXQgdGhlIHN0YXJ0IGFuZCBlbmQgdGltZXMgdG8gdGhlIGdpdmVuXG4gKiBzdGFydC9lbmQgc2Vjb25kcy5cbiAqL1xuZnVuY3Rpb24gYmluZEN1ZVZpZGVvQ2FsbChcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgc3RhcnRTZWNvbmRzT2JzOiBPYnNlcnZhYmxlPG51bWJlciB8IHVuZGVmaW5lZD4sXG4gIGVuZFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+LFxuICBkZXN0cm95ZWQ6IE9ic2VydmFibGU8dm9pZD4sXG4pIHtcbiAgY29uc3QgY3VlT3B0aW9uc09icyA9IGNvbWJpbmVMYXRlc3QoW3N0YXJ0U2Vjb25kc09icywgZW5kU2Vjb25kc09ic10pXG4gICAgLnBpcGUobWFwKChbc3RhcnRTZWNvbmRzLCBlbmRTZWNvbmRzXSkgPT4gKHtzdGFydFNlY29uZHMsIGVuZFNlY29uZHN9KSkpO1xuXG4gIC8vIE9ubHkgcmVzcG9uZCB0byBjaGFuZ2VzIGluIGN1ZSBvcHRpb25zIGlmIHRoZSBwbGF5ZXIgaXMgbm90IHJ1bm5pbmcuXG4gIGNvbnN0IGZpbHRlcmVkQ3VlT3B0aW9ucyA9IGN1ZU9wdGlvbnNPYnNcbiAgICAucGlwZShmaWx0ZXJPbk90aGVyKHBsYXllck9icywgcGxheWVyID0+ICEhcGxheWVyICYmICFoYXNQbGF5ZXJTdGFydGVkKHBsYXllcikpKTtcblxuICAvLyBJZiB0aGUgdmlkZW8gaWQgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGUgcGxheWVyXG4gIC8vIHdhcyBpbml0aWFsaXplZCB3aXRoIGEgZGlmZmVyZW50IHZpZGVvIGlkLlxuICBjb25zdCBjaGFuZ2VkVmlkZW9JZCA9IHZpZGVvSWRPYnNcbiAgICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCAocGxheWVyLCB2aWRlb0lkKSA9PiAhIXBsYXllciAmJiBwbGF5ZXIudmlkZW9JZCAhPT0gdmlkZW9JZCkpO1xuXG4gIC8vIElmIHRoZSBwbGF5ZXIgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGVyZSBhcmUgY3VlIG9wdGlvbnMuXG4gIGNvbnN0IGNoYW5nZWRQbGF5ZXIgPSBwbGF5ZXJPYnMucGlwZShcbiAgICBmaWx0ZXJPbk90aGVyKFxuICAgICAgY29tYmluZUxhdGVzdChbdmlkZW9JZE9icywgY3VlT3B0aW9uc09ic10pLFxuICAgICAgKFt2aWRlb0lkLCBjdWVPcHRpb25zXSwgcGxheWVyKSA9PlxuICAgICAgICAgICEhcGxheWVyICYmXG4gICAgICAgICAgICAodmlkZW9JZCAhPSBwbGF5ZXIudmlkZW9JZCB8fCAhIWN1ZU9wdGlvbnMuc3RhcnRTZWNvbmRzIHx8ICEhY3VlT3B0aW9ucy5lbmRTZWNvbmRzKSkpO1xuXG4gIG1lcmdlKGNoYW5nZWRQbGF5ZXIsIGNoYW5nZWRWaWRlb0lkLCBmaWx0ZXJlZEN1ZU9wdGlvbnMpXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHZpZGVvSWRPYnMsIGN1ZU9wdGlvbnNPYnMsIHN1Z2dlc3RlZFF1YWxpdHlPYnNdKSksXG4gICAgICBtYXAoKFtfLCB2YWx1ZXNdKSA9PiB2YWx1ZXMpLFxuICAgICAgdGFrZVVudGlsKGRlc3Ryb3llZCksXG4gICAgKVxuICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHZpZGVvSWQsIGN1ZU9wdGlvbnMsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PiB7XG4gICAgICBpZiAoIXZpZGVvSWQgfHwgIXBsYXllcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwbGF5ZXIudmlkZW9JZCA9IHZpZGVvSWQ7XG4gICAgICBwbGF5ZXIuY3VlVmlkZW9CeUlkKHtcbiAgICAgICAgdmlkZW9JZCxcbiAgICAgICAgc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgICAgLi4uY3VlT3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNQbGF5ZXJTdGFydGVkKHBsYXllcjogWVQuUGxheWVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHN0YXRlID0gcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gIHJldHVybiBzdGF0ZSAhPT0gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEICYmIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xufVxuXG5mdW5jdGlvbiBwbGF5ZXJJc1JlYWR5KHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcik6IHBsYXllciBpcyBQbGF5ZXIge1xuICByZXR1cm4gJ2dldFBsYXllclN0YXR1cycgaW4gcGxheWVyO1xufVxuXG4vKiogQ29tYmluZXMgdGhlIHR3byBvYnNlcnZhYmxlcyB0ZW1wb3JhcmlseSBmb3IgdGhlIGZpbHRlciBmdW5jdGlvbi4gKi9cbmZ1bmN0aW9uIGZpbHRlck9uT3RoZXI8UiwgVD4oXG4gIG90aGVyT2JzOiBPYnNlcnZhYmxlPFQ+LFxuICBmaWx0ZXJGbjogKHQ6IFQsIHI/OiBSKSA9PiBib29sZWFuLFxuKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFI+IHtcbiAgcmV0dXJuIHBpcGUoXG4gICAgd2l0aExhdGVzdEZyb20ob3RoZXJPYnMpLFxuICAgIGZpbHRlcigoW3ZhbHVlLCBvdGhlcl0pID0+IGZpbHRlckZuKG90aGVyLCB2YWx1ZSkpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpLFxuICApO1xufVxuIl19