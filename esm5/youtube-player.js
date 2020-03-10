/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { __assign, __read, __spread } from "tslib";
// Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1265
/// <reference types="youtube" />
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, Output, ViewChild, ViewEncapsulation, Optional, Inject, PLATFORM_ID, } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { combineLatest, merge, Observable, of as observableOf, pipe, Subject, of, BehaviorSubject, } from 'rxjs';
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, } from 'rxjs/operators';
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
        this._videoId = new BehaviorSubject(undefined);
        this._height = new BehaviorSubject(DEFAULT_PLAYER_HEIGHT);
        this._width = new BehaviorSubject(DEFAULT_PLAYER_WIDTH);
        this._startSeconds = new BehaviorSubject(undefined);
        this._endSeconds = new BehaviorSubject(undefined);
        this._suggestedQuality = new BehaviorSubject(undefined);
        /** Outputs are direct proxies from the player itself. */
        this.ready = new EventEmitter();
        this.stateChange = new EventEmitter();
        this.error = new EventEmitter();
        this.apiChange = new EventEmitter();
        this.playbackQualityChange = new EventEmitter();
        this.playbackRateChange = new EventEmitter();
        this._youtubeContainer = new Subject();
        this._destroyed = new Subject();
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
        var playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this.createEventsBoundInZone(), this._ngZone).pipe(waitUntilReady(function (player) {
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
    YouTubePlayer.prototype.createEventsBoundInZone = function () {
        var _this = this;
        var output = {};
        var events = new Map([
            ['onReady', this.ready],
            ['onStateChange', this.stateChange],
            ['onPlaybackQualityChange', this.playbackQualityChange],
            ['onPlaybackRateChange', this.playbackRateChange],
            ['onError', this.error],
            ['onApiChange', this.apiChange]
        ]);
        events.forEach(function (emitter, name) {
            // Since these events all trigger change detection, only bind them if something is subscribed.
            if (emitter.observers.length) {
                output[name] = _this._runInZone(function (event) { return emitter.emit(event); });
            }
        });
        return output;
    };
    YouTubePlayer.prototype.ngAfterViewInit = function () {
        this._youtubeContainer.next(this.youtubeContainer.nativeElement);
    };
    YouTubePlayer.prototype.ngOnDestroy = function () {
        if (this._player) {
            this._player.destroy();
            window.onYouTubeIframeAPIReady = this._existingApiReadyCallback;
        }
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
    YouTubePlayer.prototype._runInZone = function (callback) {
        var _this = this;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return _this._ngZone.run(function () { return callback.apply(void 0, __spread(args)); });
        };
    };
    /** Proxied methods. */
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
function createPlayerObservable(youtubeContainer, videoIdObs, iframeApiAvailableObs, widthObs, heightObs, events, ngZone) {
    var playerOptions = videoIdObs
        .pipe(withLatestFrom(combineLatest([widthObs, heightObs])), map(function (_a) {
        var _b = __read(_a, 2), videoId = _b[0], _c = __read(_b[1], 2), width = _c[0], height = _c[1];
        return videoId ? ({ videoId: videoId, width: width, height: height, events: events }) : undefined;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLFlBQVksRUFDWixLQUFLLEVBQ0wsTUFBTSxFQUdOLE1BQU0sRUFDTixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLFFBQVEsRUFDUixNQUFNLEVBQ04sV0FBVyxHQUNaLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRWxELE9BQU8sRUFDTCxhQUFhLEVBRWIsS0FBSyxFQUVMLFVBQVUsRUFDVixFQUFFLElBQUksWUFBWSxFQUVsQixJQUFJLEVBQ0osT0FBTyxFQUNQLEVBQUUsRUFDRixlQUFlLEdBQ2hCLE1BQU0sTUFBTSxDQUFDO0FBRWQsT0FBTyxFQUNMLGFBQWEsSUFBSSxlQUFlLEVBQ2hDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sT0FBTyxFQUNQLEdBQUcsRUFDSCxPQUFPLEVBQ1AsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxjQUFjLEdBQ2YsTUFBTSxnQkFBZ0IsQ0FBQztBQVN4QixNQUFNLENBQUMsSUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7QUFDeEMsTUFBTSxDQUFDLElBQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDO0FBd0J6Qzs7OztHQUlHO0FBQ0g7SUFnRkUsdUJBQ1UsT0FBZTtJQUN2Qjs7O09BR0c7SUFDOEIsVUFBbUI7UUFMNUMsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQW5FakIsYUFBUSxHQUFHLElBQUksZUFBZSxDQUFxQixTQUFTLENB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QUFJLEtBQUssaUJBQXdCLENBQUM7QUFDN0UsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLE1BQTJCO0lBQ2hELE9BQU8saUJBQWlCLElBQUksTUFBTSxDQUFDO0FBQ3JDLENBQUM7QUFFRCx3RUFBd0U7QUFDeEUsU0FBUyxhQUFhLENBQ3BCLFFBQXVCLEVBQ3ZCLFFBQWtDO0lBRWxDLE9BQU8sSUFBSSxDQUNULGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFDeEIsTUFBTSxDQUFDLFVBQUMsRUFBYztZQUFkLGtCQUFjLEVBQWIsYUFBSyxFQUFFLGFBQUs7UUFBTSxPQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO0lBQXRCLENBQXNCLENBQUMsRUFDbEQsR0FBRyxDQUFDLFVBQUMsRUFBTztZQUFQLGtCQUFPLEVBQU4sYUFBSztRQUFNLE9BQUEsS0FBSztJQUFMLENBQUssQ0FBQyxDQUN4QixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBXb3JrYXJvdW5kIGZvcjogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy8xMjY1XG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cInlvdXR1YmVcIiAvPlxuXG5pbXBvcnQge1xuICBBZnRlclZpZXdJbml0LFxuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ29tcG9uZW50LFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uRGVzdHJveSxcbiAgT25Jbml0LFxuICBPdXRwdXQsXG4gIFZpZXdDaGlsZCxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIE9wdGlvbmFsLFxuICBJbmplY3QsXG4gIFBMQVRGT1JNX0lELFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7aXNQbGF0Zm9ybUJyb3dzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmltcG9ydCB7XG4gIGNvbWJpbmVMYXRlc3QsXG4gIENvbm5lY3RhYmxlT2JzZXJ2YWJsZSxcbiAgbWVyZ2UsXG4gIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbixcbiAgT2JzZXJ2YWJsZSxcbiAgb2YgYXMgb2JzZXJ2YWJsZU9mLFxuICBPcGVyYXRvckZ1bmN0aW9uLFxuICBwaXBlLFxuICBTdWJqZWN0LFxuICBvZixcbiAgQmVoYXZpb3JTdWJqZWN0LFxufSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCBhcyBjb21iaW5lTGF0ZXN0T3AsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBmaWx0ZXIsXG4gIGZsYXRNYXAsXG4gIG1hcCxcbiAgcHVibGlzaCxcbiAgc2NhbixcbiAgc2tpcFdoaWxlLFxuICBzdGFydFdpdGgsXG4gIHRha2UsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBZVDogdHlwZW9mIFlUIHwgdW5kZWZpbmVkO1xuICAgIG9uWW91VHViZUlmcmFtZUFQSVJlYWR5OiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX1dJRFRIID0gNjQwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBWUVSX0hFSUdIVCA9IDM5MDtcblxuLy8gVGhlIG5hdGl2ZSBZVC5QbGF5ZXIgZG9lc24ndCBleHBvc2UgdGhlIHNldCB2aWRlb0lkLCBidXQgd2UgbmVlZCBpdCBmb3Jcbi8vIGNvbnZlbmllbmNlLlxuaW50ZXJmYWNlIFBsYXllciBleHRlbmRzIFlULlBsYXllciB7XG4gIHZpZGVvSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFRoZSBwbGF5ZXIgaXNuJ3QgZnVsbHkgaW5pdGlhbGl6ZWQgd2hlbiBpdCdzIGNvbnN0cnVjdGVkLlxuLy8gVGhlIG9ubHkgZmllbGQgYXZhaWxhYmxlIGlzIGRlc3Ryb3kgYW5kIGFkZEV2ZW50TGlzdGVuZXIuXG50eXBlIFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPSBQaWNrPFBsYXllciwgJ3ZpZGVvSWQnIHwgJ2Rlc3Ryb3knIHwgJ2FkZEV2ZW50TGlzdGVuZXInPjtcblxuLyoqXG4gKiBPYmplY3QgdXNlZCB0byBzdG9yZSB0aGUgc3RhdGUgb2YgdGhlIHBsYXllciBpZiB0aGVcbiAqIHVzZXIgdHJpZXMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgQVBJIGJlZm9yZSBpdCBoYXMgYmVlbiBsb2FkZWQuXG4gKi9cbmludGVyZmFjZSBQZW5kaW5nUGxheWVyU3RhdGUge1xuICBwbGF5YmFja1N0YXRlPzogWVQuUGxheWVyU3RhdGUuUExBWUlORyB8IFlULlBsYXllclN0YXRlLlBBVVNFRCB8IFlULlBsYXllclN0YXRlLkNVRUQ7XG4gIHBsYXliYWNrUmF0ZT86IG51bWJlcjtcbiAgdm9sdW1lPzogbnVtYmVyO1xuICBtdXRlZD86IGJvb2xlYW47XG4gIHNlZWs/OiB7c2Vjb25kczogbnVtYmVyLCBhbGxvd1NlZWtBaGVhZDogYm9vbGVhbn07XG59XG5cbi8qKlxuICogQW5ndWxhciBjb21wb25lbnQgdGhhdCByZW5kZXJzIGEgWW91VHViZSBwbGF5ZXIgdmlhIHRoZSBZb3VUdWJlIHBsYXllclxuICogaWZyYW1lIEFQSS5cbiAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZVxuICovXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICd5b3V0dWJlLXBsYXllcicsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAvLyBUaGlzIGRpdiBpcyAqcmVwbGFjZWQqIGJ5IHRoZSBZb3VUdWJlIHBsYXllciBlbWJlZC5cbiAgdGVtcGxhdGU6ICc8ZGl2ICN5b3V0dWJlQ29udGFpbmVyPjwvZGl2PicsXG59KVxuZXhwb3J0IGNsYXNzIFlvdVR1YmVQbGF5ZXIgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3ksIE9uSW5pdCB7XG4gIC8qKiBZb3VUdWJlIFZpZGVvIElEIHRvIHZpZXcgKi9cbiAgQElucHV0KClcbiAgZ2V0IHZpZGVvSWQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3ZpZGVvSWQudmFsdWU7IH1cbiAgc2V0IHZpZGVvSWQodmlkZW9JZDogc3RyaW5nIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fdmlkZW9JZC5uZXh0KHZpZGVvSWQpO1xuICB9XG4gIHByaXZhdGUgX3ZpZGVvSWQgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PHN0cmluZyB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogSGVpZ2h0IG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgaGVpZ2h0KCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl9oZWlnaHQudmFsdWU7IH1cbiAgc2V0IGhlaWdodChoZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2hlaWdodC5uZXh0KGhlaWdodCB8fCBERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuICB9XG4gIHByaXZhdGUgX2hlaWdodCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyPihERUZBVUxUX1BMQVlFUl9IRUlHSFQpO1xuXG4gIC8qKiBXaWR0aCBvZiB2aWRlbyBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgZ2V0IHdpZHRoKCk6IG51bWJlciB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl93aWR0aC52YWx1ZTsgfVxuICBzZXQgd2lkdGgod2lkdGg6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3dpZHRoLm5leHQod2lkdGggfHwgREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuICB9XG4gIHByaXZhdGUgX3dpZHRoID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX1dJRFRIKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RhcnQgcGxheWluZyAqL1xuICBASW5wdXQoKVxuICBzZXQgc3RhcnRTZWNvbmRzKHN0YXJ0U2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLm5leHQoc3RhcnRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIF9zdGFydFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIG1vbWVudCB3aGVuIHRoZSBwbGF5ZXIgaXMgc3VwcG9zZWQgdG8gc3RvcCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBlbmRTZWNvbmRzKGVuZFNlY29uZHM6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX2VuZFNlY29uZHMubmV4dChlbmRTZWNvbmRzKTtcbiAgfVxuICBwcml2YXRlIF9lbmRTZWNvbmRzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBvZiB0aGUgcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdWdnZXN0ZWRRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkubmV4dChzdWdnZXN0ZWRRdWFsaXR5KTtcbiAgfVxuICBwcml2YXRlIF9zdWdnZXN0ZWRRdWFsaXR5ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGlmcmFtZSB3aWxsIGF0dGVtcHQgdG8gbG9hZCByZWdhcmRsZXNzIG9mIHRoZSBzdGF0dXMgb2YgdGhlIGFwaSBvbiB0aGVcbiAgICogcGFnZS4gU2V0IHRoaXMgdG8gdHJ1ZSBpZiB5b3UgZG9uJ3Qgd2FudCB0aGUgYG9uWW91VHViZUlmcmFtZUFQSVJlYWR5YCBmaWVsZCB0byBiZVxuICAgKiBzZXQgb24gdGhlIGdsb2JhbCB3aW5kb3cuXG4gICAqL1xuICBASW5wdXQoKSBzaG93QmVmb3JlSWZyYW1lQXBpTG9hZHM6IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqIE91dHB1dHMgYXJlIGRpcmVjdCBwcm94aWVzIGZyb20gdGhlIHBsYXllciBpdHNlbGYuICovXG4gIEBPdXRwdXQoKSByZWFkeSA9IG5ldyBFdmVudEVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCk7XG4gIEBPdXRwdXQoKSBzdGF0ZUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8WVQuT25TdGF0ZUNoYW5nZUV2ZW50PigpO1xuICBAT3V0cHV0KCkgZXJyb3IgPSBuZXcgRXZlbnRFbWl0dGVyPFlULk9uRXJyb3JFdmVudD4oKTtcbiAgQE91dHB1dCgpIGFwaUNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8WVQuUGxheWVyRXZlbnQ+KCk7XG4gIEBPdXRwdXQoKSBwbGF5YmFja1F1YWxpdHlDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+KCk7XG4gIEBPdXRwdXQoKSBwbGF5YmFja1JhdGVDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPFlULk9uUGxheWJhY2tSYXRlQ2hhbmdlRXZlbnQ+KCk7XG5cbiAgLyoqIFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSByZXBsYWNlZCBieSB0aGUgaWZyYW1lLiAqL1xuICBAVmlld0NoaWxkKCd5b3V0dWJlQ29udGFpbmVyJylcbiAgeW91dHViZUNvbnRhaW5lcjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cbiAgLyoqIFdoZXRoZXIgd2UncmUgY3VycmVudGx5IHJlbmRlcmluZyBpbnNpZGUgYSBicm93c2VyLiAqL1xuICBwcml2YXRlIF9pc0Jyb3dzZXI6IGJvb2xlYW47XG4gIHByaXZhdGUgX3lvdXR1YmVDb250YWluZXIgPSBuZXcgU3ViamVjdDxIVE1MRWxlbWVudD4oKTtcbiAgcHJpdmF0ZSBfZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcbiAgcHJpdmF0ZSBfcGxheWVyOiBQbGF5ZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjazogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wZW5kaW5nUGxheWVyU3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBgcGxhdGZvcm1JZGAgcGFyYW1ldGVyIHRvIGJlY29tZSByZXF1aXJlZC5cbiAgICAgKiBAYnJlYWtpbmctY2hhbmdlIDEwLjAuMFxuICAgICAqL1xuICAgIEBPcHRpb25hbCgpIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ/OiBPYmplY3QpIHtcblxuICAgIC8vIEBicmVha2luZy1jaGFuZ2UgMTAuMC4wIFJlbW92ZSBudWxsIGNoZWNrIGZvciBgcGxhdGZvcm1JZGAuXG4gICAgdGhpcy5faXNCcm93c2VyID1cbiAgICAgICAgcGxhdGZvcm1JZCA/IGlzUGxhdGZvcm1Ccm93c2VyKHBsYXRmb3JtSWQpIDogdHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgISF3aW5kb3c7XG4gIH1cblxuICBuZ09uSW5pdCgpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB3ZSdyZSBub3QgaW4gYSBicm93c2VyIGVudmlyb25tZW50LlxuICAgIGlmICghdGhpcy5faXNCcm93c2VyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGlmcmFtZUFwaUF2YWlsYWJsZU9iczogT2JzZXJ2YWJsZTxib29sZWFuPiA9IG9ic2VydmFibGVPZih0cnVlKTtcbiAgICBpZiAoIXdpbmRvdy5ZVCkge1xuICAgICAgaWYgKHRoaXMuc2hvd0JlZm9yZUlmcmFtZUFwaUxvYWRzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTmFtZXNwYWNlIFlUIG5vdCBmb3VuZCwgY2Fubm90IGNvbnN0cnVjdCBlbWJlZGRlZCB5b3V0dWJlIHBsYXllci4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIGluc3RhbGwgdGhlIFlvdVR1YmUgUGxheWVyIEFQSSBSZWZlcmVuY2UgZm9yIGlmcmFtZSBFbWJlZHM6ICcgK1xuICAgICAgICAgICAgJ2h0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdCA9IG5ldyBTdWJqZWN0PGJvb2xlYW4+KCk7XG4gICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2sgPSB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHk7XG5cbiAgICAgIHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuX2V4aXN0aW5nQXBpUmVhZHlDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdC5uZXh0KHRydWUpKTtcbiAgICAgIH07XG4gICAgICBpZnJhbWVBcGlBdmFpbGFibGVPYnMgPSBpZnJhbWVBcGlBdmFpbGFibGVTdWJqZWN0LnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKGZhbHNlKSk7XG4gICAgfVxuXG4gICAgLy8gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBwbGF5ZXIuXG4gICAgY29uc3QgcGxheWVyT2JzID1cbiAgICAgIGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gICAgICAgIHRoaXMuX3lvdXR1YmVDb250YWluZXIsXG4gICAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICAgIGlmcmFtZUFwaUF2YWlsYWJsZU9icyxcbiAgICAgICAgdGhpcy5fd2lkdGgsXG4gICAgICAgIHRoaXMuX2hlaWdodCxcbiAgICAgICAgdGhpcy5jcmVhdGVFdmVudHNCb3VuZEluWm9uZSgpLFxuICAgICAgICB0aGlzLl9uZ1pvbmVcbiAgICAgICkucGlwZSh3YWl0VW50aWxSZWFkeShwbGF5ZXIgPT4ge1xuICAgICAgICAvLyBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgbG9hZGluZyB3YXMgYWJvcnRlZCBzbyB0aGF0IHdlIGRvbid0IGVuZCB1cCBsZWFraW5nIG1lbW9yeS5cbiAgICAgICAgaWYgKCFwbGF5ZXJJc1JlYWR5KHBsYXllcikpIHtcbiAgICAgICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9KSwgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZCksIHB1Ymxpc2goKSk7XG5cbiAgICAvLyBTZXQgdXAgc2lkZSBlZmZlY3RzIHRvIGJpbmQgaW5wdXRzIHRvIHRoZSBwbGF5ZXIuXG4gICAgcGxheWVyT2JzLnN1YnNjcmliZShwbGF5ZXIgPT4ge1xuICAgICAgdGhpcy5fcGxheWVyID0gcGxheWVyO1xuXG4gICAgICBpZiAocGxheWVyICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgICB0aGlzLl9pbml0aWFsaXplUGxheWVyKHBsYXllciwgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0gdW5kZWZpbmVkO1xuICAgIH0pO1xuXG4gICAgYmluZFNpemVUb1BsYXllcihwbGF5ZXJPYnMsIHRoaXMuX3dpZHRoLCB0aGlzLl9oZWlnaHQpO1xuXG4gICAgYmluZFN1Z2dlc3RlZFF1YWxpdHlUb1BsYXllcihwbGF5ZXJPYnMsIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkpO1xuXG4gICAgYmluZEN1ZVZpZGVvQ2FsbChcbiAgICAgIHBsYXllck9icyxcbiAgICAgIHRoaXMuX3ZpZGVvSWQsXG4gICAgICB0aGlzLl9zdGFydFNlY29uZHMsXG4gICAgICB0aGlzLl9lbmRTZWNvbmRzLFxuICAgICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgIHRoaXMuX2Rlc3Ryb3llZCk7XG5cbiAgICAvLyBBZnRlciBhbGwgb2YgdGhlIHN1YnNjcmlwdGlvbnMgYXJlIHNldCB1cCwgY29ubmVjdCB0aGUgb2JzZXJ2YWJsZS5cbiAgICAocGxheWVyT2JzIGFzIENvbm5lY3RhYmxlT2JzZXJ2YWJsZTxQbGF5ZXI+KS5jb25uZWN0KCk7XG4gIH1cblxuICBjcmVhdGVFdmVudHNCb3VuZEluWm9uZSgpOiBZVC5FdmVudHMge1xuICAgIGNvbnN0IG91dHB1dDogWVQuRXZlbnRzID0ge307XG4gICAgY29uc3QgZXZlbnRzID0gbmV3IE1hcDxrZXlvZiBZVC5FdmVudHMsIEV2ZW50RW1pdHRlcjxhbnk+PihbXG4gICAgICBbJ29uUmVhZHknLCB0aGlzLnJlYWR5XSxcbiAgICAgIFsnb25TdGF0ZUNoYW5nZScsIHRoaXMuc3RhdGVDaGFuZ2VdLFxuICAgICAgWydvblBsYXliYWNrUXVhbGl0eUNoYW5nZScsIHRoaXMucGxheWJhY2tRdWFsaXR5Q2hhbmdlXSxcbiAgICAgIFsnb25QbGF5YmFja1JhdGVDaGFuZ2UnLCB0aGlzLnBsYXliYWNrUmF0ZUNoYW5nZV0sXG4gICAgICBbJ29uRXJyb3InLCB0aGlzLmVycm9yXSxcbiAgICAgIFsnb25BcGlDaGFuZ2UnLCB0aGlzLmFwaUNoYW5nZV1cbiAgICBdKTtcblxuICAgIGV2ZW50cy5mb3JFYWNoKChlbWl0dGVyLCBuYW1lKSA9PiB7XG4gICAgICAvLyBTaW5jZSB0aGVzZSBldmVudHMgYWxsIHRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbiwgb25seSBiaW5kIHRoZW0gaWYgc29tZXRoaW5nIGlzIHN1YnNjcmliZWQuXG4gICAgICBpZiAoZW1pdHRlci5vYnNlcnZlcnMubGVuZ3RoKSB7XG4gICAgICAgIG91dHB1dFtuYW1lXSA9IHRoaXMuX3J1bkluWm9uZShldmVudCA9PiBlbWl0dGVyLmVtaXQoZXZlbnQpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5uZXh0KHRoaXMueW91dHViZUNvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5kZXN0cm95KCk7XG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s7XG4gICAgfVxuXG4gICAgdGhpcy5fdmlkZW9JZC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2hlaWdodC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3dpZHRoLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fc3RhcnRTZWNvbmRzLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHkuY29tcGxldGUoKTtcbiAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLm5leHQoKTtcbiAgICB0aGlzLl9kZXN0cm95ZWQuY29tcGxldGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgX3J1bkluWm9uZTxUIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkPihjYWxsYmFjazogVCk6XG4gICAgICAoLi4uYXJnczogUGFyYW1ldGVyczxUPikgPT4gdm9pZCB7XG4gICAgcmV0dXJuICguLi5hcmdzOiBQYXJhbWV0ZXJzPFQ+KSA9PiB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcbiAgfVxuXG4gIC8qKiBQcm94aWVkIG1ldGhvZHMuICovXG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3BsYXlWaWRlbyAqL1xuICBwbGF5VmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBsYXlWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuUExBWUlORztcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGF1c2VWaWRlbyAqL1xuICBwYXVzZVZpZGVvKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3N0b3BWaWRlbyAqL1xuICBzdG9wVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnN0b3BWaWRlbygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJdCBzZWVtcyBsaWtlIFlvdVR1YmUgc2V0cyB0aGUgcGxheWVyIHRvIENVRUQgd2hlbiBpdCdzIHN0b3BwZWQuXG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5wbGF5YmFja1N0YXRlID0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2Vla1RvICovXG4gIHNlZWtUbyhzZWNvbmRzOiBudW1iZXIsIGFsbG93U2Vla0FoZWFkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNlZWtUbyhzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnNlZWsgPSB7c2Vjb25kcywgYWxsb3dTZWVrQWhlYWR9O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNtdXRlICovXG4gIG11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLm11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSN1bk11dGUgKi9cbiAgdW5NdXRlKCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci51bk11dGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkubXV0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjaXNNdXRlZCAqL1xuICBpc011dGVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuaXNNdXRlZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5tdXRlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0Vm9sdW1lICovXG4gIHNldFZvbHVtZSh2b2x1bWU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkudm9sdW1lID0gdm9sdW1lO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWb2x1bWUgKi9cbiAgZ2V0Vm9sdW1lKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRWb2x1bWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS52b2x1bWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc2V0UGxheWJhY2tSYXRlICovXG4gIHNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGU6IG51bWJlcikge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrUmF0ZSA9IHBsYXliYWNrUmF0ZTtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tSYXRlICovXG4gIGdldFBsYXliYWNrUmF0ZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tSYXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tSYXRlO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMgKi9cbiAgZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcygpOiBudW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCkgOiBbXTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb0xvYWRlZEZyYWN0aW9uICovXG4gIGdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvTG9hZGVkRnJhY3Rpb24oKSA6IDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWVyU3RhdGUgKi9cbiAgZ2V0UGxheWVyU3RhdGUoKTogWVQuUGxheWVyU3RhdGUgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5faXNCcm93c2VyIHx8ICF3aW5kb3cuWVQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1N0YXRlO1xuICAgIH1cblxuICAgIHJldHVybiBZVC5QbGF5ZXJTdGF0ZS5VTlNUQVJURUQ7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0Q3VycmVudFRpbWUgKi9cbiAgZ2V0Q3VycmVudFRpbWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldEN1cnJlbnRUaW1lKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUuc2Vlaykge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrLnNlY29uZHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0UGxheWJhY2tRdWFsaXR5ICovXG4gIGdldFBsYXliYWNrUXVhbGl0eSgpOiBZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0UGxheWJhY2tRdWFsaXR5KCkgOiAnZGVmYXVsdCc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscyAqL1xuICBnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzKCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eVtdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldER1cmF0aW9uICovXG4gIGdldER1cmF0aW9uKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXREdXJhdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRWaWRlb1VybCAqL1xuICBnZXRWaWRlb1VybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9VcmwoKSA6ICcnO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvRW1iZWRDb2RlICovXG4gIGdldFZpZGVvRW1iZWRDb2RlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb0VtYmVkQ29kZSgpIDogJyc7XG4gIH1cblxuICAvKiogR2V0cyBhbiBvYmplY3QgdGhhdCBzaG91bGQgYmUgdXNlZCB0byBzdG9yZSB0aGUgdGVtcG9yYXJ5IEFQSSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfZ2V0UGVuZGluZ1N0YXRlKCk6IFBlbmRpbmdQbGF5ZXJTdGF0ZSB7XG4gICAgaWYgKCF0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGU7XG4gIH1cblxuICAvKiogSW5pdGlhbGl6ZXMgYSBwbGF5ZXIgZnJvbSBhIHRlbXBvcmFyeSBzdGF0ZS4gKi9cbiAgcHJpdmF0ZSBfaW5pdGlhbGl6ZVBsYXllcihwbGF5ZXI6IFlULlBsYXllciwgc3RhdGU6IFBlbmRpbmdQbGF5ZXJTdGF0ZSk6IHZvaWQge1xuICAgIGNvbnN0IHtwbGF5YmFja1N0YXRlLCBwbGF5YmFja1JhdGUsIHZvbHVtZSwgbXV0ZWQsIHNlZWt9ID0gc3RhdGU7XG5cbiAgICBzd2l0Y2ggKHBsYXliYWNrU3RhdGUpIHtcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUExBWUlORzogcGxheWVyLnBsYXlWaWRlbygpOyBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuUEFVU0VEOiBwbGF5ZXIucGF1c2VWaWRlbygpOyBicmVhaztcbiAgICAgIGNhc2UgWVQuUGxheWVyU3RhdGUuQ1VFRDogcGxheWVyLnN0b3BWaWRlbygpOyBicmVhaztcbiAgICB9XG5cbiAgICBpZiAocGxheWJhY2tSYXRlICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9XG5cbiAgICBpZiAodm9sdW1lICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZXRWb2x1bWUodm9sdW1lKTtcbiAgICB9XG5cbiAgICBpZiAobXV0ZWQgIT0gbnVsbCkge1xuICAgICAgbXV0ZWQgPyBwbGF5ZXIubXV0ZSgpIDogcGxheWVyLnVuTXV0ZSgpO1xuICAgIH1cblxuICAgIGlmIChzZWVrICE9IG51bGwpIHtcbiAgICAgIHBsYXllci5zZWVrVG8oc2Vlay5zZWNvbmRzLCBzZWVrLmFsbG93U2Vla0FoZWFkKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyB0byB0aGUgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCBhbmQgc2V0cyBpdCBvbiB0aGUgcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFNpemVUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHdpZHRoT2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIGhlaWdodE9iczogT2JzZXJ2YWJsZTxudW1iZXI+XG4pIHtcbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3BsYXllck9icywgd2lkdGhPYnMsIGhlaWdodE9ic10pXG4gICAgICAuc3Vic2NyaWJlKChbcGxheWVyLCB3aWR0aCwgaGVpZ2h0XSkgPT4gcGxheWVyICYmIHBsYXllci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpKTtcbn1cblxuLyoqIExpc3RlbnMgdG8gY2hhbmdlcyBmcm9tIHRoZSBzdWdnZXN0ZWQgcXVhbGl0eSBhbmQgc2V0cyBpdCBvbiB0aGUgZ2l2ZW4gcGxheWVyLiAqL1xuZnVuY3Rpb24gYmluZFN1Z2dlc3RlZFF1YWxpdHlUb1BsYXllcihcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFlULlBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHN1Z2dlc3RlZFF1YWxpdHlPYnM6IE9ic2VydmFibGU8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPlxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtcbiAgICBwbGF5ZXJPYnMsXG4gICAgc3VnZ2VzdGVkUXVhbGl0eU9ic1xuICBdKS5zdWJzY3JpYmUoXG4gICAgKFtwbGF5ZXIsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PlxuICAgICAgICBwbGF5ZXIgJiYgc3VnZ2VzdGVkUXVhbGl0eSAmJiBwbGF5ZXIuc2V0UGxheWJhY2tRdWFsaXR5KHN1Z2dlc3RlZFF1YWxpdHkpKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgbG9hZGVkIHBsYXllciBvbmNlIGl0J3MgcmVhZHkuIENlcnRhaW4gcHJvcGVydGllcy9tZXRob2RzXG4gKiB3b24ndCBiZSBhdmFpbGFibGUgdW50aWwgdGhlIGlmcmFtZSBmaW5pc2hlcyBsb2FkaW5nLlxuICogQHBhcmFtIG9uQWJvcnQgQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGludm9rZWQgaWYgdGhlIHBsYXllciBsb2FkaW5nIHdhcyBhYm9ydGVkIGJlZm9yZVxuICogaXQgd2FzIGFibGUgdG8gY29tcGxldGUuIENhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueSBsb29zZSByZWZlcmVuY2VzLlxuICovXG5mdW5jdGlvbiB3YWl0VW50aWxSZWFkeShvbkFib3J0OiAocGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyKSA9PiB2b2lkKTpcbiAgT3BlcmF0b3JGdW5jdGlvbjxVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkLCBQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcbiAgcmV0dXJuIGZsYXRNYXAocGxheWVyID0+IHtcbiAgICBpZiAoIXBsYXllcikge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZjxQbGF5ZXJ8dW5kZWZpbmVkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocGxheWVySXNSZWFkeShwbGF5ZXIpKSB7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZU9mKHBsYXllciBhcyBQbGF5ZXIpO1xuICAgIH1cblxuICAgIC8vIFNpbmNlIHJlbW92ZUV2ZW50TGlzdGVuZXIgaXMgbm90IG9uIFBsYXllciB3aGVuIGl0J3MgaW5pdGlhbGl6ZWQsIHdlIGNhbid0IHVzZSBmcm9tRXZlbnQuXG4gICAgLy8gVGhlIHBsYXllciBpcyBub3QgaW5pdGlhbGl6ZWQgZnVsbHkgdW50aWwgdGhlIHJlYWR5IGlzIGNhbGxlZC5cbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8UGxheWVyPihlbWl0dGVyID0+IHtcbiAgICAgIGxldCBhYm9ydGVkID0gZmFsc2U7XG4gICAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IFlULlBsYXllckV2ZW50KSA9PiB7XG4gICAgICAgIHJlc29sdmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIWFib3J0ZWQpIHtcbiAgICAgICAgICBldmVudC50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuICAgICAgICAgIGVtaXR0ZXIubmV4dChldmVudC50YXJnZXQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignb25SZWFkeScsIG9uUmVhZHkpO1xuXG4gICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICBhYm9ydGVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgb25BYm9ydChwbGF5ZXIpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pLnBpcGUodGFrZSgxKSwgc3RhcnRXaXRoKHVuZGVmaW5lZCkpO1xuICB9KTtcbn1cblxuLyoqIENyZWF0ZSBhbiBvYnNlcnZhYmxlIGZvciB0aGUgcGxheWVyIGJhc2VkIG9uIHRoZSBnaXZlbiBvcHRpb25zLiAqL1xuZnVuY3Rpb24gY3JlYXRlUGxheWVyT2JzZXJ2YWJsZShcbiAgeW91dHViZUNvbnRhaW5lcjogT2JzZXJ2YWJsZTxIVE1MRWxlbWVudD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzOiBPYnNlcnZhYmxlPGJvb2xlYW4+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgZXZlbnRzOiBZVC5FdmVudHMsXG4gIG5nWm9uZTogTmdab25lXG4pOiBPYnNlcnZhYmxlPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcblxuICBjb25zdCBwbGF5ZXJPcHRpb25zID1cbiAgICB2aWRlb0lkT2JzXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFt3aWR0aE9icywgaGVpZ2h0T2JzXSkpLFxuICAgICAgbWFwKChbdmlkZW9JZCwgW3dpZHRoLCBoZWlnaHRdXSkgPT4gdmlkZW9JZCA/ICh7dmlkZW9JZCwgd2lkdGgsIGhlaWdodCwgZXZlbnRzfSkgOiB1bmRlZmluZWQpLFxuICAgICk7XG5cbiAgcmV0dXJuIGNvbWJpbmVMYXRlc3QoW3lvdXR1YmVDb250YWluZXIsIHBsYXllck9wdGlvbnMsIG9mKG5nWm9uZSldKVxuICAgICAgLnBpcGUoXG4gICAgICAgIHNraXBVbnRpbFJlbWVtYmVyTGF0ZXN0KGlmcmFtZUFwaUF2YWlsYWJsZU9icyksXG4gICAgICAgIHNjYW4oc3luY1BsYXllclN0YXRlLCB1bmRlZmluZWQpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpKTtcbn1cblxuLyoqIFNraXBzIHRoZSBnaXZlbiBvYnNlcnZhYmxlIHVudGlsIHRoZSBvdGhlciBvYnNlcnZhYmxlIGVtaXRzIHRydWUsIHRoZW4gZW1pdCB0aGUgbGF0ZXN0LiAqL1xuZnVuY3Rpb24gc2tpcFVudGlsUmVtZW1iZXJMYXRlc3Q8VD4obm90aWZpZXI6IE9ic2VydmFibGU8Ym9vbGVhbj4pOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICByZXR1cm4gcGlwZShcbiAgICBjb21iaW5lTGF0ZXN0T3Aobm90aWZpZXIpLFxuICAgIHNraXBXaGlsZSgoW18sIGRvbmVTa2lwcGluZ10pID0+ICFkb25lU2tpcHBpbmcpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpKTtcbn1cblxuLyoqIERlc3Ryb3kgdGhlIHBsYXllciBpZiB0aGVyZSBhcmUgbm8gb3B0aW9ucywgb3IgY3JlYXRlIHRoZSBwbGF5ZXIgaWYgdGhlcmUgYXJlIG9wdGlvbnMuICovXG5mdW5jdGlvbiBzeW5jUGxheWVyU3RhdGUoXG4gIHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCxcbiAgW2NvbnRhaW5lciwgdmlkZW9PcHRpb25zLCBuZ1pvbmVdOiBbSFRNTEVsZW1lbnQsIFlULlBsYXllck9wdGlvbnMgfCB1bmRlZmluZWQsIE5nWm9uZV0sXG4pOiBVbmluaXRpYWxpemVkUGxheWVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKCF2aWRlb09wdGlvbnMpIHtcbiAgICBpZiAocGxheWVyKSB7XG4gICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHBsYXllcikge1xuICAgIHJldHVybiBwbGF5ZXI7XG4gIH1cblxuICAvLyBJbXBvcnRhbnQhIFdlIG5lZWQgdG8gY3JlYXRlIHRoZSBQbGF5ZXIgb2JqZWN0IG91dHNpZGUgb2YgdGhlIGBOZ1pvbmVgLCBiZWNhdXNlIGl0IGtpY2tzXG4gIC8vIG9mZiBhIDI1MG1zIHNldEludGVydmFsIHdoaWNoIHdpbGwgY29udGludWFsbHkgdHJpZ2dlciBjaGFuZ2UgZGV0ZWN0aW9uIGlmIHdlIGRvbid0LlxuICBjb25zdCBuZXdQbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgPVxuICAgICAgbmdab25lLnJ1bk91dHNpZGVBbmd1bGFyKCgpID0+IG5ldyBZVC5QbGF5ZXIoY29udGFpbmVyLCB2aWRlb09wdGlvbnMpKTtcbiAgLy8gQmluZCB2aWRlb0lkIGZvciBmdXR1cmUgdXNlLlxuICBuZXdQbGF5ZXIudmlkZW9JZCA9IHZpZGVvT3B0aW9ucy52aWRlb0lkO1xuICByZXR1cm4gbmV3UGxheWVyO1xufVxuXG4vKipcbiAqIENhbGwgY3VlVmlkZW9CeUlkIGlmIHRoZSB2aWRlb0lkIGNoYW5nZXMsIG9yIHdoZW4gc3RhcnQgb3IgZW5kIHNlY29uZHMgY2hhbmdlLiBjdWVWaWRlb0J5SWQgd2lsbFxuICogY2hhbmdlIHRoZSBsb2FkZWQgdmlkZW8gaWQgdG8gdGhlIGdpdmVuIHZpZGVvSWQsIGFuZCBzZXQgdGhlIHN0YXJ0IGFuZCBlbmQgdGltZXMgdG8gdGhlIGdpdmVuXG4gKiBzdGFydC9lbmQgc2Vjb25kcy5cbiAqL1xuZnVuY3Rpb24gYmluZEN1ZVZpZGVvQ2FsbChcbiAgcGxheWVyT2JzOiBPYnNlcnZhYmxlPFBsYXllciB8IHVuZGVmaW5lZD4sXG4gIHZpZGVvSWRPYnM6IE9ic2VydmFibGU8c3RyaW5nIHwgdW5kZWZpbmVkPixcbiAgc3RhcnRTZWNvbmRzT2JzOiBPYnNlcnZhYmxlPG51bWJlciB8IHVuZGVmaW5lZD4sXG4gIGVuZFNlY29uZHNPYnM6IE9ic2VydmFibGU8bnVtYmVyIHwgdW5kZWZpbmVkPixcbiAgc3VnZ2VzdGVkUXVhbGl0eU9iczogT2JzZXJ2YWJsZTxZVC5TdWdnZXN0ZWRWaWRlb1F1YWxpdHkgfCB1bmRlZmluZWQ+LFxuICBkZXN0cm95ZWQ6IE9ic2VydmFibGU8dm9pZD4sXG4pIHtcbiAgY29uc3QgY3VlT3B0aW9uc09icyA9IGNvbWJpbmVMYXRlc3QoW3N0YXJ0U2Vjb25kc09icywgZW5kU2Vjb25kc09ic10pXG4gICAgLnBpcGUobWFwKChbc3RhcnRTZWNvbmRzLCBlbmRTZWNvbmRzXSkgPT4gKHtzdGFydFNlY29uZHMsIGVuZFNlY29uZHN9KSkpO1xuXG4gIC8vIE9ubHkgcmVzcG9uZCB0byBjaGFuZ2VzIGluIGN1ZSBvcHRpb25zIGlmIHRoZSBwbGF5ZXIgaXMgbm90IHJ1bm5pbmcuXG4gIGNvbnN0IGZpbHRlcmVkQ3VlT3B0aW9ucyA9IGN1ZU9wdGlvbnNPYnNcbiAgICAucGlwZShmaWx0ZXJPbk90aGVyKHBsYXllck9icywgcGxheWVyID0+ICEhcGxheWVyICYmICFoYXNQbGF5ZXJTdGFydGVkKHBsYXllcikpKTtcblxuICAvLyBJZiB0aGUgdmlkZW8gaWQgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGUgcGxheWVyXG4gIC8vIHdhcyBpbml0aWFsaXplZCB3aXRoIGEgZGlmZmVyZW50IHZpZGVvIGlkLlxuICBjb25zdCBjaGFuZ2VkVmlkZW9JZCA9IHZpZGVvSWRPYnNcbiAgICAgIC5waXBlKGZpbHRlck9uT3RoZXIocGxheWVyT2JzLCAocGxheWVyLCB2aWRlb0lkKSA9PiAhIXBsYXllciAmJiBwbGF5ZXIudmlkZW9JZCAhPT0gdmlkZW9JZCkpO1xuXG4gIC8vIElmIHRoZSBwbGF5ZXIgY2hhbmdlZCwgdGhlcmUncyBubyByZWFzb24gdG8gcnVuICdjdWUnIHVubGVzcyB0aGVyZSBhcmUgY3VlIG9wdGlvbnMuXG4gIGNvbnN0IGNoYW5nZWRQbGF5ZXIgPSBwbGF5ZXJPYnMucGlwZShcbiAgICBmaWx0ZXJPbk90aGVyKFxuICAgICAgY29tYmluZUxhdGVzdChbdmlkZW9JZE9icywgY3VlT3B0aW9uc09ic10pLFxuICAgICAgKFt2aWRlb0lkLCBjdWVPcHRpb25zXSwgcGxheWVyKSA9PlxuICAgICAgICAgICEhcGxheWVyICYmXG4gICAgICAgICAgICAodmlkZW9JZCAhPSBwbGF5ZXIudmlkZW9JZCB8fCAhIWN1ZU9wdGlvbnMuc3RhcnRTZWNvbmRzIHx8ICEhY3VlT3B0aW9ucy5lbmRTZWNvbmRzKSkpO1xuXG4gIG1lcmdlKGNoYW5nZWRQbGF5ZXIsIGNoYW5nZWRWaWRlb0lkLCBmaWx0ZXJlZEN1ZU9wdGlvbnMpXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHZpZGVvSWRPYnMsIGN1ZU9wdGlvbnNPYnMsIHN1Z2dlc3RlZFF1YWxpdHlPYnNdKSksXG4gICAgICBtYXAoKFtfLCB2YWx1ZXNdKSA9PiB2YWx1ZXMpLFxuICAgICAgdGFrZVVudGlsKGRlc3Ryb3llZCksXG4gICAgKVxuICAgIC5zdWJzY3JpYmUoKFtwbGF5ZXIsIHZpZGVvSWQsIGN1ZU9wdGlvbnMsIHN1Z2dlc3RlZFF1YWxpdHldKSA9PiB7XG4gICAgICBpZiAoIXZpZGVvSWQgfHwgIXBsYXllcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwbGF5ZXIudmlkZW9JZCA9IHZpZGVvSWQ7XG4gICAgICBwbGF5ZXIuY3VlVmlkZW9CeUlkKHtcbiAgICAgICAgdmlkZW9JZCxcbiAgICAgICAgc3VnZ2VzdGVkUXVhbGl0eSxcbiAgICAgICAgLi4uY3VlT3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBoYXNQbGF5ZXJTdGFydGVkKHBsYXllcjogWVQuUGxheWVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHN0YXRlID0gcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gIHJldHVybiBzdGF0ZSAhPT0gWVQuUGxheWVyU3RhdGUuVU5TVEFSVEVEICYmIHN0YXRlICE9PSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xufVxuXG5mdW5jdGlvbiBwbGF5ZXJJc1JlYWR5KHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcik6IHBsYXllciBpcyBQbGF5ZXIge1xuICByZXR1cm4gJ2dldFBsYXllclN0YXR1cycgaW4gcGxheWVyO1xufVxuXG4vKiogQ29tYmluZXMgdGhlIHR3byBvYnNlcnZhYmxlcyB0ZW1wb3JhcmlseSBmb3IgdGhlIGZpbHRlciBmdW5jdGlvbi4gKi9cbmZ1bmN0aW9uIGZpbHRlck9uT3RoZXI8UiwgVD4oXG4gIG90aGVyT2JzOiBPYnNlcnZhYmxlPFQ+LFxuICBmaWx0ZXJGbjogKHQ6IFQsIHI/OiBSKSA9PiBib29sZWFuLFxuKTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFI+IHtcbiAgcmV0dXJuIHBpcGUoXG4gICAgd2l0aExhdGVzdEZyb20ob3RoZXJPYnMpLFxuICAgIGZpbHRlcigoW3ZhbHVlLCBvdGhlcl0pID0+IGZpbHRlckZuKG90aGVyLCB2YWx1ZSkpLFxuICAgIG1hcCgoW3ZhbHVlXSkgPT4gdmFsdWUpLFxuICApO1xufVxuIl19