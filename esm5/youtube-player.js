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
import { combineLatest as combineLatestOp, distinctUntilChanged, filter, flatMap, map, publish, scan, skipWhile, startWith, take, takeUntil, withLatestFrom, switchMap, } from 'rxjs/operators';
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
        var playerObs = createPlayerObservable(this._youtubeContainer, this._videoId, iframeApiAvailableObs, this._width, this._height, this._ngZone).pipe(waitUntilReady(function (player) {
            // Destroy the player if loading was aborted so that we don't end up leaking memory.
            if (!playerIsReady(player)) {
                player.destroy();
            }
        }), takeUntil(this._destroyed), publish());
        // Set up side effects to bind inputs to the player.
        playerObs.subscribe(function (player) {
            _this._player = player;
            _this._playerChanges.next(player);
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
                    player.removeEventListener(name, listener);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieW91dHViZS1wbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMveW91dHViZS1wbGF5ZXIveW91dHViZS1wbGF5ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOztBQUVILHlFQUF5RTtBQUN6RSxpQ0FBaUM7QUFFakMsT0FBTyxFQUVMLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsVUFBVSxFQUNWLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsUUFBUSxFQUNSLE1BQU0sRUFDTixXQUFXLEdBQ1osTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFDLGlCQUFpQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFbEQsT0FBTyxFQUNMLGFBQWEsRUFFYixLQUFLLEVBRUwsVUFBVSxFQUNWLEVBQUUsSUFBSSxZQUFZLEVBRWxCLElBQUksRUFDSixPQUFPLEVBQ1AsRUFBRSxFQUNGLGVBQWUsRUFDZixnQkFBZ0IsR0FDakIsTUFBTSxNQUFNLENBQUM7QUFFZCxPQUFPLEVBQ0wsYUFBYSxJQUFJLGVBQWUsRUFDaEMsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixPQUFPLEVBQ1AsR0FBRyxFQUNILE9BQU8sRUFDUCxJQUFJLEVBQ0osU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osU0FBUyxFQUNULGNBQWMsRUFDZCxTQUFTLEdBQ1YsTUFBTSxnQkFBZ0IsQ0FBQztBQVN4QixNQUFNLENBQUMsSUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7QUFDeEMsTUFBTSxDQUFDLElBQU0scUJBQXFCLEdBQUcsR0FBRyxDQUFDO0FBd0J6Qzs7OztHQUlHO0FBQ0g7SUE0RkUsdUJBQ1UsT0FBZTtJQUN2Qjs7O09BR0c7SUFDOEIsVUFBbUI7UUFMNUMsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQW5GakIsc0JBQWlCLEdBQUcsSUFBSSxPQUFP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L0Msa0JBQStDLEVBQTlDLGNBQU0sRUFBRSxlQUFPLEVBQUUsa0JBQVUsRUFBRSx3QkFBZ0I7UUFDeEQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUN2QixPQUFPO1NBQ1I7UUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN6QixNQUFNLENBQUMsWUFBWSxZQUNqQixPQUFPLFNBQUE7WUFDUCxnQkFBZ0Isa0JBQUEsSUFDYixVQUFVLEVBQ2IsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsTUFBaUI7SUFDekMsSUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3RDLE9BQU8sS0FBSyx1QkFBNkIsSUFBSSxLQUFLLGlCQUF3QixDQUFDO0FBQzdFLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxNQUEyQjtJQUNoRCxPQUFPLGlCQUFpQixJQUFJLE1BQU0sQ0FBQztBQUNyQyxDQUFDO0FBRUQsd0VBQXdFO0FBQ3hFLFNBQVMsYUFBYSxDQUNwQixRQUF1QixFQUN2QixRQUFrQztJQUVsQyxPQUFPLElBQUksQ0FDVCxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQ3hCLE1BQU0sQ0FBQyxVQUFDLEVBQWM7WUFBZCxrQkFBYyxFQUFiLGFBQUssRUFBRSxhQUFLO1FBQU0sT0FBQSxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztJQUF0QixDQUFzQixDQUFDLEVBQ2xELEdBQUcsQ0FBQyxVQUFDLEVBQU87WUFBUCxrQkFBTyxFQUFOLGFBQUs7UUFBTSxPQUFBLEtBQUs7SUFBTCxDQUFLLENBQUMsQ0FDeEIsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8gV29ya2Fyb3VuZCBmb3I6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvMTI2NVxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ5b3V0dWJlXCIgLz5cblxuaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgSW5wdXQsXG4gIE5nWm9uZSxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIE91dHB1dCxcbiAgVmlld0NoaWxkLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgT3B0aW9uYWwsXG4gIEluamVjdCxcbiAgUExBVEZPUk1fSUQsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtpc1BsYXRmb3JtQnJvd3Nlcn0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcblxuaW1wb3J0IHtcbiAgY29tYmluZUxhdGVzdCxcbiAgQ29ubmVjdGFibGVPYnNlcnZhYmxlLFxuICBtZXJnZSxcbiAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLFxuICBPYnNlcnZhYmxlLFxuICBvZiBhcyBvYnNlcnZhYmxlT2YsXG4gIE9wZXJhdG9yRnVuY3Rpb24sXG4gIHBpcGUsXG4gIFN1YmplY3QsXG4gIG9mLFxuICBCZWhhdmlvclN1YmplY3QsXG4gIGZyb21FdmVudFBhdHRlcm4sXG59IGZyb20gJ3J4anMnO1xuXG5pbXBvcnQge1xuICBjb21iaW5lTGF0ZXN0IGFzIGNvbWJpbmVMYXRlc3RPcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIGZpbHRlcixcbiAgZmxhdE1hcCxcbiAgbWFwLFxuICBwdWJsaXNoLFxuICBzY2FuLFxuICBza2lwV2hpbGUsXG4gIHN0YXJ0V2l0aCxcbiAgdGFrZSxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgc3dpdGNoTWFwLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgaW50ZXJmYWNlIFdpbmRvdyB7XG4gICAgWVQ6IHR5cGVvZiBZVCB8IHVuZGVmaW5lZDtcbiAgICBvbllvdVR1YmVJZnJhbWVBUElSZWFkeTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9XSURUSCA9IDY0MDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQVlFUl9IRUlHSFQgPSAzOTA7XG5cbi8vIFRoZSBuYXRpdmUgWVQuUGxheWVyIGRvZXNuJ3QgZXhwb3NlIHRoZSBzZXQgdmlkZW9JZCwgYnV0IHdlIG5lZWQgaXQgZm9yXG4vLyBjb252ZW5pZW5jZS5cbmludGVyZmFjZSBQbGF5ZXIgZXh0ZW5kcyBZVC5QbGF5ZXIge1xuICB2aWRlb0lkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuXG4vLyBUaGUgcGxheWVyIGlzbid0IGZ1bGx5IGluaXRpYWxpemVkIHdoZW4gaXQncyBjb25zdHJ1Y3RlZC5cbi8vIFRoZSBvbmx5IGZpZWxkIGF2YWlsYWJsZSBpcyBkZXN0cm95IGFuZCBhZGRFdmVudExpc3RlbmVyLlxudHlwZSBVbmluaXRpYWxpemVkUGxheWVyID0gUGljazxQbGF5ZXIsICd2aWRlb0lkJyB8ICdkZXN0cm95JyB8ICdhZGRFdmVudExpc3RlbmVyJz47XG5cbi8qKlxuICogT2JqZWN0IHVzZWQgdG8gc3RvcmUgdGhlIHN0YXRlIG9mIHRoZSBwbGF5ZXIgaWYgdGhlXG4gKiB1c2VyIHRyaWVzIHRvIGludGVyYWN0IHdpdGggdGhlIEFQSSBiZWZvcmUgaXQgaGFzIGJlZW4gbG9hZGVkLlxuICovXG5pbnRlcmZhY2UgUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgcGxheWJhY2tTdGF0ZT86IFlULlBsYXllclN0YXRlLlBMQVlJTkcgfCBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQgfCBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICBwbGF5YmFja1JhdGU/OiBudW1iZXI7XG4gIHZvbHVtZT86IG51bWJlcjtcbiAgbXV0ZWQ/OiBib29sZWFuO1xuICBzZWVrPzoge3NlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW59O1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY29tcG9uZW50IHRoYXQgcmVuZGVycyBhIFlvdVR1YmUgcGxheWVyIHZpYSB0aGUgWW91VHViZSBwbGF5ZXJcbiAqIGlmcmFtZSBBUEkuXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2VcbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAneW91dHViZS1wbGF5ZXInLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgLy8gVGhpcyBkaXYgaXMgKnJlcGxhY2VkKiBieSB0aGUgWW91VHViZSBwbGF5ZXIgZW1iZWQuXG4gIHRlbXBsYXRlOiAnPGRpdiAjeW91dHViZUNvbnRhaW5lcj48L2Rpdj4nLFxufSlcbmV4cG9ydCBjbGFzcyBZb3VUdWJlUGxheWVyIGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95LCBPbkluaXQge1xuICAvKiogV2hldGhlciB3ZSdyZSBjdXJyZW50bHkgcmVuZGVyaW5nIGluc2lkZSBhIGJyb3dzZXIuICovXG4gIHByaXZhdGUgX2lzQnJvd3NlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfeW91dHViZUNvbnRhaW5lciA9IG5ldyBTdWJqZWN0PEhUTUxFbGVtZW50PigpO1xuICBwcml2YXRlIF9kZXN0cm95ZWQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xuICBwcml2YXRlIF9wbGF5ZXI6IFBsYXllciB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3BlbmRpbmdQbGF5ZXJTdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9wbGF5ZXJDaGFuZ2VzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxQbGF5ZXIgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbiAgLyoqIFlvdVR1YmUgVmlkZW8gSUQgdG8gdmlldyAqL1xuICBASW5wdXQoKVxuICBnZXQgdmlkZW9JZCgpOiBzdHJpbmcgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fdmlkZW9JZC52YWx1ZTsgfVxuICBzZXQgdmlkZW9JZCh2aWRlb0lkOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl92aWRlb0lkLm5leHQodmlkZW9JZCk7XG4gIH1cbiAgcHJpdmF0ZSBfdmlkZW9JZCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8c3RyaW5nIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBIZWlnaHQgb2YgdmlkZW8gcGxheWVyICovXG4gIEBJbnB1dCgpXG4gIGdldCBoZWlnaHQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX2hlaWdodC52YWx1ZTsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5faGVpZ2h0Lm5leHQoaGVpZ2h0IHx8IERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG4gIH1cbiAgcHJpdmF0ZSBfaGVpZ2h0ID0gbmV3IEJlaGF2aW9yU3ViamVjdDxudW1iZXI+KERFRkFVTFRfUExBWUVSX0hFSUdIVCk7XG5cbiAgLyoqIFdpZHRoIG9mIHZpZGVvIHBsYXllciAqL1xuICBASW5wdXQoKVxuICBnZXQgd2lkdGgoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuX3dpZHRoLnZhbHVlOyB9XG4gIHNldCB3aWR0aCh3aWR0aDogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fd2lkdGgubmV4dCh3aWR0aCB8fCBERUZBVUxUX1BMQVlFUl9XSURUSCk7XG4gIH1cbiAgcHJpdmF0ZSBfd2lkdGggPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlcj4oREVGQVVMVF9QTEFZRVJfV0lEVEgpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdGFydCBwbGF5aW5nICovXG4gIEBJbnB1dCgpXG4gIHNldCBzdGFydFNlY29uZHMoc3RhcnRTZWNvbmRzOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9zdGFydFNlY29uZHMubmV4dChzdGFydFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgX3N0YXJ0U2Vjb25kcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8bnVtYmVyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4gIC8qKiBUaGUgbW9tZW50IHdoZW4gdGhlIHBsYXllciBpcyBzdXBwb3NlZCB0byBzdG9wIHBsYXlpbmcgKi9cbiAgQElucHV0KClcbiAgc2V0IGVuZFNlY29uZHMoZW5kU2Vjb25kczogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fZW5kU2Vjb25kcy5uZXh0KGVuZFNlY29uZHMpO1xuICB9XG4gIHByaXZhdGUgX2VuZFNlY29uZHMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PG51bWJlciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKiogVGhlIHN1Z2dlc3RlZCBxdWFsaXR5IG9mIHRoZSBwbGF5ZXIgKi9cbiAgQElucHV0KClcbiAgc2V0IHN1Z2dlc3RlZFF1YWxpdHkoc3VnZ2VzdGVkUXVhbGl0eTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fc3VnZ2VzdGVkUXVhbGl0eS5uZXh0KHN1Z2dlc3RlZFF1YWxpdHkpO1xuICB9XG4gIHByaXZhdGUgX3N1Z2dlc3RlZFF1YWxpdHkgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgaWZyYW1lIHdpbGwgYXR0ZW1wdCB0byBsb2FkIHJlZ2FyZGxlc3Mgb2YgdGhlIHN0YXR1cyBvZiB0aGUgYXBpIG9uIHRoZVxuICAgKiBwYWdlLiBTZXQgdGhpcyB0byB0cnVlIGlmIHlvdSBkb24ndCB3YW50IHRoZSBgb25Zb3VUdWJlSWZyYW1lQVBJUmVhZHlgIGZpZWxkIHRvIGJlXG4gICAqIHNldCBvbiB0aGUgZ2xvYmFsIHdpbmRvdy5cbiAgICovXG4gIEBJbnB1dCgpIHNob3dCZWZvcmVJZnJhbWVBcGlMb2FkczogYm9vbGVhbiB8IHVuZGVmaW5lZDtcblxuICAvKiogT3V0cHV0cyBhcmUgZGlyZWN0IHByb3hpZXMgZnJvbSB0aGUgcGxheWVyIGl0c2VsZi4gKi9cbiAgQE91dHB1dCgpIHJlYWR5OiBPYnNlcnZhYmxlPFlULlBsYXllckV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5QbGF5ZXJFdmVudD4oJ29uUmVhZHknKTtcblxuICBAT3V0cHV0KCkgc3RhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25TdGF0ZUNoYW5nZUV2ZW50PiA9XG4gICAgICB0aGlzLl9nZXRMYXp5RW1pdHRlcjxZVC5PblN0YXRlQ2hhbmdlRXZlbnQ+KCdvblN0YXRlQ2hhbmdlJyk7XG5cbiAgQE91dHB1dCgpIGVycm9yOiBPYnNlcnZhYmxlPFlULk9uRXJyb3JFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25FcnJvckV2ZW50Pignb25FcnJvcicpO1xuXG4gIEBPdXRwdXQoKSBhcGlDaGFuZ2U6IE9ic2VydmFibGU8WVQuUGxheWVyRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULlBsYXllckV2ZW50Pignb25BcGlDaGFuZ2UnKTtcblxuICBAT3V0cHV0KCkgcGxheWJhY2tRdWFsaXR5Q2hhbmdlOiBPYnNlcnZhYmxlPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+ID1cbiAgICAgIHRoaXMuX2dldExhenlFbWl0dGVyPFlULk9uUGxheWJhY2tRdWFsaXR5Q2hhbmdlRXZlbnQ+KCdvblBsYXliYWNrUXVhbGl0eUNoYW5nZScpO1xuXG4gIEBPdXRwdXQoKSBwbGF5YmFja1JhdGVDaGFuZ2U6IE9ic2VydmFibGU8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4gPVxuICAgICAgdGhpcy5fZ2V0TGF6eUVtaXR0ZXI8WVQuT25QbGF5YmFja1JhdGVDaGFuZ2VFdmVudD4oJ29uUGxheWJhY2tSYXRlQ2hhbmdlJyk7XG5cbiAgLyoqIFRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSByZXBsYWNlZCBieSB0aGUgaWZyYW1lLiAqL1xuICBAVmlld0NoaWxkKCd5b3V0dWJlQ29udGFpbmVyJylcbiAgeW91dHViZUNvbnRhaW5lcjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfbmdab25lOiBOZ1pvbmUsXG4gICAgLyoqXG4gICAgICogQGRlcHJlY2F0ZWQgYHBsYXRmb3JtSWRgIHBhcmFtZXRlciB0byBiZWNvbWUgcmVxdWlyZWQuXG4gICAgICogQGJyZWFraW5nLWNoYW5nZSAxMC4wLjBcbiAgICAgKi9cbiAgICBAT3B0aW9uYWwoKSBASW5qZWN0KFBMQVRGT1JNX0lEKSBwbGF0Zm9ybUlkPzogT2JqZWN0KSB7XG5cbiAgICAvLyBAYnJlYWtpbmctY2hhbmdlIDEwLjAuMCBSZW1vdmUgbnVsbCBjaGVjayBmb3IgYHBsYXRmb3JtSWRgLlxuICAgIHRoaXMuX2lzQnJvd3NlciA9XG4gICAgICAgIHBsYXRmb3JtSWQgPyBpc1BsYXRmb3JtQnJvd3NlcihwbGF0Zm9ybUlkKSA6IHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmICEhd2luZG93O1xuICB9XG5cbiAgbmdPbkluaXQoKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgd2UncmUgbm90IGluIGEgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICBpZiAoIXRoaXMuX2lzQnJvd3Nlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBpZnJhbWVBcGlBdmFpbGFibGVPYnM6IE9ic2VydmFibGU8Ym9vbGVhbj4gPSBvYnNlcnZhYmxlT2YodHJ1ZSk7XG4gICAgaWYgKCF3aW5kb3cuWVQpIHtcbiAgICAgIGlmICh0aGlzLnNob3dCZWZvcmVJZnJhbWVBcGlMb2Fkcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05hbWVzcGFjZSBZVCBub3QgZm91bmQsIGNhbm5vdCBjb25zdHJ1Y3QgZW1iZWRkZWQgeW91dHViZSBwbGF5ZXIuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSBpbnN0YWxsIHRoZSBZb3VUdWJlIFBsYXllciBBUEkgUmVmZXJlbmNlIGZvciBpZnJhbWUgRW1iZWRzOiAnICtcbiAgICAgICAgICAgICdodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QgPSBuZXcgU3ViamVjdDxib29sZWFuPigpO1xuICAgICAgdGhpcy5fZXhpc3RpbmdBcGlSZWFkeUNhbGxiYWNrID0gd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5O1xuXG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2spIHtcbiAgICAgICAgICB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IGlmcmFtZUFwaUF2YWlsYWJsZVN1YmplY3QubmV4dCh0cnVlKSk7XG4gICAgICB9O1xuICAgICAgaWZyYW1lQXBpQXZhaWxhYmxlT2JzID0gaWZyYW1lQXBpQXZhaWxhYmxlU3ViamVjdC5waXBlKHRha2UoMSksIHN0YXJ0V2l0aChmYWxzZSkpO1xuICAgIH1cblxuICAgIC8vIEFuIG9ic2VydmFibGUgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgcGxheWVyLlxuICAgIGNvbnN0IHBsYXllck9icyA9XG4gICAgICBjcmVhdGVQbGF5ZXJPYnNlcnZhYmxlKFxuICAgICAgICB0aGlzLl95b3V0dWJlQ29udGFpbmVyLFxuICAgICAgICB0aGlzLl92aWRlb0lkLFxuICAgICAgICBpZnJhbWVBcGlBdmFpbGFibGVPYnMsXG4gICAgICAgIHRoaXMuX3dpZHRoLFxuICAgICAgICB0aGlzLl9oZWlnaHQsXG4gICAgICAgIHRoaXMuX25nWm9uZVxuICAgICAgKS5waXBlKHdhaXRVbnRpbFJlYWR5KHBsYXllciA9PiB7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIHBsYXllciBpZiBsb2FkaW5nIHdhcyBhYm9ydGVkIHNvIHRoYXQgd2UgZG9uJ3QgZW5kIHVwIGxlYWtpbmcgbWVtb3J5LlxuICAgICAgICBpZiAoIXBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgICAgIHBsYXllci5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLCB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSwgcHVibGlzaCgpKTtcblxuICAgIC8vIFNldCB1cCBzaWRlIGVmZmVjdHMgdG8gYmluZCBpbnB1dHMgdG8gdGhlIHBsYXllci5cbiAgICBwbGF5ZXJPYnMuc3Vic2NyaWJlKHBsYXllciA9PiB7XG4gICAgICB0aGlzLl9wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgICB0aGlzLl9wbGF5ZXJDaGFuZ2VzLm5leHQocGxheWVyKTtcblxuICAgICAgaWYgKHBsYXllciAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUpIHtcbiAgICAgICAgdGhpcy5faW5pdGlhbGl6ZVBsYXllcihwbGF5ZXIsIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB9KTtcblxuICAgIGJpbmRTaXplVG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIocGxheWVyT2JzLCB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5KTtcblxuICAgIGJpbmRDdWVWaWRlb0NhbGwoXG4gICAgICBwbGF5ZXJPYnMsXG4gICAgICB0aGlzLl92aWRlb0lkLFxuICAgICAgdGhpcy5fc3RhcnRTZWNvbmRzLFxuICAgICAgdGhpcy5fZW5kU2Vjb25kcyxcbiAgICAgIHRoaXMuX3N1Z2dlc3RlZFF1YWxpdHksXG4gICAgICB0aGlzLl9kZXN0cm95ZWQpO1xuXG4gICAgLy8gQWZ0ZXIgYWxsIG9mIHRoZSBzdWJzY3JpcHRpb25zIGFyZSBzZXQgdXAsIGNvbm5lY3QgdGhlIG9ic2VydmFibGUuXG4gICAgKHBsYXllck9icyBhcyBDb25uZWN0YWJsZU9ic2VydmFibGU8UGxheWVyPikuY29ubmVjdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBkZXByZWNhdGVkIE5vIGxvbmdlciBiZWluZyB1c2VkLiBUbyBiZSByZW1vdmVkLlxuICAgKiBAYnJlYWtpbmctY2hhbmdlIDExLjAuMFxuICAgKi9cbiAgY3JlYXRlRXZlbnRzQm91bmRJblpvbmUoKTogWVQuRXZlbnRzIHtcbiAgICByZXR1cm4ge307XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5uZXh0KHRoaXMueW91dHViZUNvbnRhaW5lci5uYXRpdmVFbGVtZW50KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHRoaXMuX3BsYXllci5kZXN0cm95KCk7XG4gICAgICB3aW5kb3cub25Zb3VUdWJlSWZyYW1lQVBJUmVhZHkgPSB0aGlzLl9leGlzdGluZ0FwaVJlYWR5Q2FsbGJhY2s7XG4gICAgfVxuXG4gICAgdGhpcy5fcGxheWVyQ2hhbmdlcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3ZpZGVvSWQuY29tcGxldGUoKTtcbiAgICB0aGlzLl9oZWlnaHQuY29tcGxldGUoKTtcbiAgICB0aGlzLl93aWR0aC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX3N0YXJ0U2Vjb25kcy5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2VuZFNlY29uZHMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9zdWdnZXN0ZWRRdWFsaXR5LmNvbXBsZXRlKCk7XG4gICAgdGhpcy5feW91dHViZUNvbnRhaW5lci5jb21wbGV0ZSgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5uZXh0KCk7XG4gICAgdGhpcy5fZGVzdHJveWVkLmNvbXBsZXRlKCk7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjcGxheVZpZGVvICovXG4gIHBsYXlWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNwYXVzZVZpZGVvICovXG4gIHBhdXNlVmlkZW8oKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnBhdXNlVmlkZW8oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tTdGF0ZSA9IFlULlBsYXllclN0YXRlLlBBVVNFRDtcbiAgICB9XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2Ujc3RvcFZpZGVvICovXG4gIHN0b3BWaWRlbygpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEl0IHNlZW1zIGxpa2UgWW91VHViZSBzZXRzIHRoZSBwbGF5ZXIgdG8gQ1VFRCB3aGVuIGl0J3Mgc3RvcHBlZC5cbiAgICAgIHRoaXMuX2dldFBlbmRpbmdTdGF0ZSgpLnBsYXliYWNrU3RhdGUgPSBZVC5QbGF5ZXJTdGF0ZS5DVUVEO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZWVrVG8gKi9cbiAgc2Vla1RvKHNlY29uZHM6IG51bWJlciwgYWxsb3dTZWVrQWhlYWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIuc2Vla1RvKHNlY29uZHMsIGFsbG93U2Vla0FoZWFkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkuc2VlayA9IHtzZWNvbmRzLCBhbGxvd1NlZWtBaGVhZH07XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI211dGUgKi9cbiAgbXV0ZSgpIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICB0aGlzLl9wbGF5ZXIubXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI3VuTXV0ZSAqL1xuICB1bk11dGUoKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnVuTXV0ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS5tdXRlZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNpc011dGVkICovXG4gIGlzTXV0ZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5pc011dGVkKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLm11dGVkO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRWb2x1bWUgKi9cbiAgc2V0Vm9sdW1lKHZvbHVtZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgdGhpcy5fcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9nZXRQZW5kaW5nU3RhdGUoKS52b2x1bWUgPSB2b2x1bWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZvbHVtZSAqL1xuICBnZXRWb2x1bWUoKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFZvbHVtZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUgJiYgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnZvbHVtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNzZXRQbGF5YmFja1JhdGUgKi9cbiAgc2V0UGxheWJhY2tSYXRlKHBsYXliYWNrUmF0ZTogbnVtYmVyKSB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5zZXRQbGF5YmFja1JhdGUocGxheWJhY2tSYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZ2V0UGVuZGluZ1N0YXRlKCkucGxheWJhY2tSYXRlID0gcGxheWJhY2tSYXRlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1JhdGUgKi9cbiAgZ2V0UGxheWJhY2tSYXRlKCk6IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX3BsYXllcikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1JhdGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5wbGF5YmFja1JhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0QXZhaWxhYmxlUGxheWJhY2tSYXRlcyAqL1xuICBnZXRBdmFpbGFibGVQbGF5YmFja1JhdGVzKCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldEF2YWlsYWJsZVBsYXliYWNrUmF0ZXMoKSA6IFtdO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvTG9hZGVkRnJhY3Rpb24gKi9cbiAgZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0VmlkZW9Mb2FkZWRGcmFjdGlvbigpIDogMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5ZXJTdGF0ZSAqL1xuICBnZXRQbGF5ZXJTdGF0ZSgpOiBZVC5QbGF5ZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLl9pc0Jyb3dzZXIgfHwgIXdpbmRvdy5ZVCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGxheWVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGxheWVyLmdldFBsYXllclN0YXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSAmJiB0aGlzLl9wZW5kaW5nUGxheWVyU3RhdGUucGxheWJhY2tTdGF0ZSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnBsYXliYWNrU3RhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIFlULlBsYXllclN0YXRlLlVOU1RBUlRFRDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRDdXJyZW50VGltZSAqL1xuICBnZXRDdXJyZW50VGltZSgpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLl9wbGF5ZXIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wbGF5ZXIuZ2V0Q3VycmVudFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGVuZGluZ1BsYXllclN0YXRlICYmIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZS5zZWVrKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlLnNlZWsuc2Vjb25kcztcbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRQbGF5YmFja1F1YWxpdHkgKi9cbiAgZ2V0UGxheWJhY2tRdWFsaXR5KCk6IFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRQbGF5YmFja1F1YWxpdHkoKSA6ICdkZWZhdWx0JztcbiAgfVxuXG4gIC8qKiBTZWUgaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20veW91dHViZS9pZnJhbWVfYXBpX3JlZmVyZW5jZSNnZXRBdmFpbGFibGVRdWFsaXR5TGV2ZWxzICovXG4gIGdldEF2YWlsYWJsZVF1YWxpdHlMZXZlbHMoKTogWVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5W10ge1xuICAgIHJldHVybiB0aGlzLl9wbGF5ZXIgPyB0aGlzLl9wbGF5ZXIuZ2V0QXZhaWxhYmxlUXVhbGl0eUxldmVscygpIDogW107XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0RHVyYXRpb24gKi9cbiAgZ2V0RHVyYXRpb24oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldER1cmF0aW9uKCkgOiAwO1xuICB9XG5cbiAgLyoqIFNlZSBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS95b3V0dWJlL2lmcmFtZV9hcGlfcmVmZXJlbmNlI2dldFZpZGVvVXJsICovXG4gIGdldFZpZGVvVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXllciA/IHRoaXMuX3BsYXllci5nZXRWaWRlb1VybCgpIDogJyc7XG4gIH1cblxuICAvKiogU2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3lvdXR1YmUvaWZyYW1lX2FwaV9yZWZlcmVuY2UjZ2V0VmlkZW9FbWJlZENvZGUgKi9cbiAgZ2V0VmlkZW9FbWJlZENvZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fcGxheWVyID8gdGhpcy5fcGxheWVyLmdldFZpZGVvRW1iZWRDb2RlKCkgOiAnJztcbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9iamVjdCB0aGF0IHNob3VsZCBiZSB1c2VkIHRvIHN0b3JlIHRoZSB0ZW1wb3JhcnkgQVBJIHN0YXRlLiAqL1xuICBwcml2YXRlIF9nZXRQZW5kaW5nU3RhdGUoKTogUGVuZGluZ1BsYXllclN0YXRlIHtcbiAgICBpZiAoIXRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZSkge1xuICAgICAgdGhpcy5fcGVuZGluZ1BsYXllclN0YXRlID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3BlbmRpbmdQbGF5ZXJTdGF0ZTtcbiAgfVxuXG4gIC8qKiBJbml0aWFsaXplcyBhIHBsYXllciBmcm9tIGEgdGVtcG9yYXJ5IHN0YXRlLiAqL1xuICBwcml2YXRlIF9pbml0aWFsaXplUGxheWVyKHBsYXllcjogWVQuUGxheWVyLCBzdGF0ZTogUGVuZGluZ1BsYXllclN0YXRlKTogdm9pZCB7XG4gICAgY29uc3Qge3BsYXliYWNrU3RhdGUsIHBsYXliYWNrUmF0ZSwgdm9sdW1lLCBtdXRlZCwgc2Vla30gPSBzdGF0ZTtcblxuICAgIHN3aXRjaCAocGxheWJhY2tTdGF0ZSkge1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HOiBwbGF5ZXIucGxheVZpZGVvKCk7IGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5QQVVTRUQ6IHBsYXllci5wYXVzZVZpZGVvKCk7IGJyZWFrO1xuICAgICAgY2FzZSBZVC5QbGF5ZXJTdGF0ZS5DVUVEOiBwbGF5ZXIuc3RvcFZpZGVvKCk7IGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChwbGF5YmFja1JhdGUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFBsYXliYWNrUmF0ZShwbGF5YmFja1JhdGUpO1xuICAgIH1cblxuICAgIGlmICh2b2x1bWUgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNldFZvbHVtZSh2b2x1bWUpO1xuICAgIH1cblxuICAgIGlmIChtdXRlZCAhPSBudWxsKSB7XG4gICAgICBtdXRlZCA/IHBsYXllci5tdXRlKCkgOiBwbGF5ZXIudW5NdXRlKCk7XG4gICAgfVxuXG4gICAgaWYgKHNlZWsgIT0gbnVsbCkge1xuICAgICAgcGxheWVyLnNlZWtUbyhzZWVrLnNlY29uZHMsIHNlZWsuYWxsb3dTZWVrQWhlYWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBHZXRzIGFuIG9ic2VydmFibGUgdGhhdCBhZGRzIGFuIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBwbGF5ZXIgd2hlbiBhIHVzZXIgc3Vic2NyaWJlcyB0byBpdC4gKi9cbiAgcHJpdmF0ZSBfZ2V0TGF6eUVtaXR0ZXI8VCBleHRlbmRzIFlULlBsYXllckV2ZW50PihuYW1lOiBrZXlvZiBZVC5FdmVudHMpOiBPYnNlcnZhYmxlPFQ+IHtcbiAgICAvLyBTdGFydCB3aXRoIHRoZSBzdHJlYW0gb2YgcGxheWVycy4gVGhpcyB3YXkgdGhlIGV2ZW50cyB3aWxsIGJlIHRyYW5zZmVycmVkXG4gICAgLy8gb3ZlciB0byB0aGUgbmV3IHBsYXllciBpZiBpdCBnZXRzIHN3YXBwZWQgb3V0IHVuZGVyLXRoZS1ob29kLlxuICAgIHJldHVybiB0aGlzLl9wbGF5ZXJDaGFuZ2VzLnBpcGUoXG4gICAgICAvLyBTd2l0Y2ggdG8gdGhlIGJvdW5kIGV2ZW50LiBgc3dpdGNoTWFwYCBlbnN1cmVzIHRoYXQgdGhlIG9sZCBldmVudCBpcyByZW1vdmVkIHdoZW4gdGhlXG4gICAgICAvLyBwbGF5ZXIgaXMgY2hhbmdlZC4gSWYgdGhlcmUncyBubyBwbGF5ZXIsIHJldHVybiBhbiBvYnNlcnZhYmxlIHRoYXQgbmV2ZXIgZW1pdHMuXG4gICAgICBzd2l0Y2hNYXAocGxheWVyID0+IHtcbiAgICAgICAgcmV0dXJuIHBsYXllciA/IGZyb21FdmVudFBhdHRlcm48VD4oKGxpc3RlbmVyOiAoZXZlbnQ6IFQpID0+IHZvaWQpID0+IHtcbiAgICAgICAgICBwbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgIH0sIChsaXN0ZW5lcjogKGV2ZW50OiBUKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgLy8gVGhlIEFQSSBzZWVtcyB0byB0aHJvdyB3aGVuIHdlIHRyeSB0byB1bmJpbmQgZnJvbSBhIGRlc3Ryb3llZCBwbGF5ZXIgYW5kIGl0IGRvZXNuJ3RcbiAgICAgICAgICAvLyBleHBvc2Ugd2hldGhlciB0aGUgcGxheWVyIGhhcyBiZWVuIGRlc3Ryb3llZCBzbyB3ZSBoYXZlIHRvIHdyYXAgaXQgaW4gYSB0cnkvY2F0Y2ggdG9cbiAgICAgICAgICAvLyBwcmV2ZW50IHRoZSBlbnRpcmUgc3RyZWFtIGZyb20gZXJyb3Jpbmcgb3V0LlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwbGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICB9KSA6IG9ic2VydmFibGVPZjxUPigpO1xuICAgICAgfSksXG4gICAgICAvLyBCeSBkZWZhdWx0IHdlIHJ1biBhbGwgdGhlIEFQSSBpbnRlcmFjdGlvbnMgb3V0c2lkZSB0aGUgem9uZVxuICAgICAgLy8gc28gd2UgaGF2ZSB0byBicmluZyB0aGUgZXZlbnRzIGJhY2sgaW4gbWFudWFsbHkgd2hlbiB0aGV5IGVtaXQuXG4gICAgICAoc291cmNlOiBPYnNlcnZhYmxlPFQ+KSA9PiBuZXcgT2JzZXJ2YWJsZTxUPihvYnNlcnZlciA9PiBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgbmV4dDogdmFsdWUgPT4gdGhpcy5fbmdab25lLnJ1bigoKSA9PiBvYnNlcnZlci5uZXh0KHZhbHVlKSksXG4gICAgICAgIGVycm9yOiBlcnJvciA9PiBvYnNlcnZlci5lcnJvcihlcnJvciksXG4gICAgICAgIGNvbXBsZXRlOiAoKSA9PiBvYnNlcnZlci5jb21wbGV0ZSgpXG4gICAgICB9KSksXG4gICAgICAvLyBFbnN1cmVzIHRoYXQgZXZlcnl0aGluZyBpcyBjbGVhcmVkIG91dCBvbiBkZXN0cm95LlxuICAgICAgdGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZClcbiAgICApO1xuICB9XG59XG5cbi8qKiBMaXN0ZW5zIHRvIGNoYW5nZXMgdG8gdGhlIGdpdmVuIHdpZHRoIGFuZCBoZWlnaHQgYW5kIHNldHMgaXQgb24gdGhlIHBsYXllci4gKi9cbmZ1bmN0aW9uIGJpbmRTaXplVG9QbGF5ZXIoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICB3aWR0aE9iczogT2JzZXJ2YWJsZTxudW1iZXI+LFxuICBoZWlnaHRPYnM6IE9ic2VydmFibGU8bnVtYmVyPlxuKSB7XG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFtwbGF5ZXJPYnMsIHdpZHRoT2JzLCBoZWlnaHRPYnNdKVxuICAgICAgLnN1YnNjcmliZSgoW3BsYXllciwgd2lkdGgsIGhlaWdodF0pID0+IHBsYXllciAmJiBwbGF5ZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KSk7XG59XG5cbi8qKiBMaXN0ZW5zIHRvIGNoYW5nZXMgZnJvbSB0aGUgc3VnZ2VzdGVkIHF1YWxpdHkgYW5kIHNldHMgaXQgb24gdGhlIGdpdmVuIHBsYXllci4gKi9cbmZ1bmN0aW9uIGJpbmRTdWdnZXN0ZWRRdWFsaXR5VG9QbGF5ZXIoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxZVC5QbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICBzdWdnZXN0ZWRRdWFsaXR5T2JzOiBPYnNlcnZhYmxlPFlULlN1Z2dlc3RlZFZpZGVvUXVhbGl0eSB8IHVuZGVmaW5lZD5cbikge1xuICByZXR1cm4gY29tYmluZUxhdGVzdChbXG4gICAgcGxheWVyT2JzLFxuICAgIHN1Z2dlc3RlZFF1YWxpdHlPYnNcbiAgXSkuc3Vic2NyaWJlKFxuICAgIChbcGxheWVyLCBzdWdnZXN0ZWRRdWFsaXR5XSkgPT5cbiAgICAgICAgcGxheWVyICYmIHN1Z2dlc3RlZFF1YWxpdHkgJiYgcGxheWVyLnNldFBsYXliYWNrUXVhbGl0eShzdWdnZXN0ZWRRdWFsaXR5KSk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYnNlcnZhYmxlIHRoYXQgZW1pdHMgdGhlIGxvYWRlZCBwbGF5ZXIgb25jZSBpdCdzIHJlYWR5LiBDZXJ0YWluIHByb3BlcnRpZXMvbWV0aG9kc1xuICogd29uJ3QgYmUgYXZhaWxhYmxlIHVudGlsIHRoZSBpZnJhbWUgZmluaXNoZXMgbG9hZGluZy5cbiAqIEBwYXJhbSBvbkFib3J0IENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBpbnZva2VkIGlmIHRoZSBwbGF5ZXIgbG9hZGluZyB3YXMgYWJvcnRlZCBiZWZvcmVcbiAqIGl0IHdhcyBhYmxlIHRvIGNvbXBsZXRlLiBDYW4gYmUgdXNlZCB0byBjbGVhbiB1cCBhbnkgbG9vc2UgcmVmZXJlbmNlcy5cbiAqL1xuZnVuY3Rpb24gd2FpdFVudGlsUmVhZHkob25BYm9ydDogKHBsYXllcjogVW5pbml0aWFsaXplZFBsYXllcikgPT4gdm9pZCk6XG4gIE9wZXJhdG9yRnVuY3Rpb248VW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCwgUGxheWVyIHwgdW5kZWZpbmVkPiB7XG4gIHJldHVybiBmbGF0TWFwKHBsYXllciA9PiB7XG4gICAgaWYgKCFwbGF5ZXIpIHtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlT2Y8UGxheWVyfHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcbiAgICB9XG4gICAgaWYgKHBsYXllcklzUmVhZHkocGxheWVyKSkge1xuICAgICAgcmV0dXJuIG9ic2VydmFibGVPZihwbGF5ZXIgYXMgUGxheWVyKTtcbiAgICB9XG5cbiAgICAvLyBTaW5jZSByZW1vdmVFdmVudExpc3RlbmVyIGlzIG5vdCBvbiBQbGF5ZXIgd2hlbiBpdCdzIGluaXRpYWxpemVkLCB3ZSBjYW4ndCB1c2UgZnJvbUV2ZW50LlxuICAgIC8vIFRoZSBwbGF5ZXIgaXMgbm90IGluaXRpYWxpemVkIGZ1bGx5IHVudGlsIHRoZSByZWFkeSBpcyBjYWxsZWQuXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFBsYXllcj4oZW1pdHRlciA9PiB7XG4gICAgICBsZXQgYWJvcnRlZCA9IGZhbHNlO1xuICAgICAgbGV0IHJlc29sdmVkID0gZmFsc2U7XG4gICAgICBjb25zdCBvblJlYWR5ID0gKGV2ZW50OiBZVC5QbGF5ZXJFdmVudCkgPT4ge1xuICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFhYm9ydGVkKSB7XG4gICAgICAgICAgZXZlbnQudGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCBvblJlYWR5KTtcbiAgICAgICAgICBlbWl0dGVyLm5leHQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ29uUmVhZHknLCBvblJlYWR5KTtcblxuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgYWJvcnRlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICAgIG9uQWJvcnQocGxheWVyKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5waXBlKHRha2UoMSksIHN0YXJ0V2l0aCh1bmRlZmluZWQpKTtcbiAgfSk7XG59XG5cbi8qKiBDcmVhdGUgYW4gb2JzZXJ2YWJsZSBmb3IgdGhlIHBsYXllciBiYXNlZCBvbiB0aGUgZ2l2ZW4gb3B0aW9ucy4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBsYXllck9ic2VydmFibGUoXG4gIHlvdXR1YmVDb250YWluZXI6IE9ic2VydmFibGU8SFRNTEVsZW1lbnQ+LFxuICB2aWRlb0lkT2JzOiBPYnNlcnZhYmxlPHN0cmluZyB8IHVuZGVmaW5lZD4sXG4gIGlmcmFtZUFwaUF2YWlsYWJsZU9iczogT2JzZXJ2YWJsZTxib29sZWFuPixcbiAgd2lkdGhPYnM6IE9ic2VydmFibGU8bnVtYmVyPixcbiAgaGVpZ2h0T2JzOiBPYnNlcnZhYmxlPG51bWJlcj4sXG4gIG5nWm9uZTogTmdab25lXG4pOiBPYnNlcnZhYmxlPFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQ+IHtcblxuICBjb25zdCBwbGF5ZXJPcHRpb25zID1cbiAgICB2aWRlb0lkT2JzXG4gICAgLnBpcGUoXG4gICAgICB3aXRoTGF0ZXN0RnJvbShjb21iaW5lTGF0ZXN0KFt3aWR0aE9icywgaGVpZ2h0T2JzXSkpLFxuICAgICAgbWFwKChbdmlkZW9JZCwgW3dpZHRoLCBoZWlnaHRdXSkgPT4gdmlkZW9JZCA/ICh7dmlkZW9JZCwgd2lkdGgsIGhlaWdodH0pIDogdW5kZWZpbmVkKSxcbiAgICApO1xuXG4gIHJldHVybiBjb21iaW5lTGF0ZXN0KFt5b3V0dWJlQ29udGFpbmVyLCBwbGF5ZXJPcHRpb25zLCBvZihuZ1pvbmUpXSlcbiAgICAgIC5waXBlKFxuICAgICAgICBza2lwVW50aWxSZW1lbWJlckxhdGVzdChpZnJhbWVBcGlBdmFpbGFibGVPYnMpLFxuICAgICAgICBzY2FuKHN5bmNQbGF5ZXJTdGF0ZSwgdW5kZWZpbmVkKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSk7XG59XG5cbi8qKiBTa2lwcyB0aGUgZ2l2ZW4gb2JzZXJ2YWJsZSB1bnRpbCB0aGUgb3RoZXIgb2JzZXJ2YWJsZSBlbWl0cyB0cnVlLCB0aGVuIGVtaXQgdGhlIGxhdGVzdC4gKi9cbmZ1bmN0aW9uIHNraXBVbnRpbFJlbWVtYmVyTGF0ZXN0PFQ+KG5vdGlmaWVyOiBPYnNlcnZhYmxlPGJvb2xlYW4+KTogTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uPFQ+IHtcbiAgcmV0dXJuIHBpcGUoXG4gICAgY29tYmluZUxhdGVzdE9wKG5vdGlmaWVyKSxcbiAgICBza2lwV2hpbGUoKFtfLCBkb25lU2tpcHBpbmddKSA9PiAhZG9uZVNraXBwaW5nKSxcbiAgICBtYXAoKFt2YWx1ZV0pID0+IHZhbHVlKSk7XG59XG5cbi8qKiBEZXN0cm95IHRoZSBwbGF5ZXIgaWYgdGhlcmUgYXJlIG5vIG9wdGlvbnMsIG9yIGNyZWF0ZSB0aGUgcGxheWVyIGlmIHRoZXJlIGFyZSBvcHRpb25zLiAqL1xuZnVuY3Rpb24gc3luY1BsYXllclN0YXRlKFxuICBwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIgfCB1bmRlZmluZWQsXG4gIFtjb250YWluZXIsIHZpZGVvT3B0aW9ucywgbmdab25lXTogW0hUTUxFbGVtZW50LCBZVC5QbGF5ZXJPcHRpb25zIHwgdW5kZWZpbmVkLCBOZ1pvbmVdLFxuKTogVW5pbml0aWFsaXplZFBsYXllciB8IHVuZGVmaW5lZCB7XG4gIGlmICghdmlkZW9PcHRpb25zKSB7XG4gICAgaWYgKHBsYXllcikge1xuICAgICAgcGxheWVyLmRlc3Ryb3koKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChwbGF5ZXIpIHtcbiAgICByZXR1cm4gcGxheWVyO1xuICB9XG5cbiAgLy8gSW1wb3J0YW50ISBXZSBuZWVkIHRvIGNyZWF0ZSB0aGUgUGxheWVyIG9iamVjdCBvdXRzaWRlIG9mIHRoZSBgTmdab25lYCwgYmVjYXVzZSBpdCBraWNrc1xuICAvLyBvZmYgYSAyNTBtcyBzZXRJbnRlcnZhbCB3aGljaCB3aWxsIGNvbnRpbnVhbGx5IHRyaWdnZXIgY2hhbmdlIGRldGVjdGlvbiBpZiB3ZSBkb24ndC5cbiAgY29uc3QgbmV3UGxheWVyOiBVbmluaXRpYWxpemVkUGxheWVyID1cbiAgICAgIG5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiBuZXcgWVQuUGxheWVyKGNvbnRhaW5lciwgdmlkZW9PcHRpb25zKSk7XG4gIC8vIEJpbmQgdmlkZW9JZCBmb3IgZnV0dXJlIHVzZS5cbiAgbmV3UGxheWVyLnZpZGVvSWQgPSB2aWRlb09wdGlvbnMudmlkZW9JZDtcbiAgcmV0dXJuIG5ld1BsYXllcjtcbn1cblxuLyoqXG4gKiBDYWxsIGN1ZVZpZGVvQnlJZCBpZiB0aGUgdmlkZW9JZCBjaGFuZ2VzLCBvciB3aGVuIHN0YXJ0IG9yIGVuZCBzZWNvbmRzIGNoYW5nZS4gY3VlVmlkZW9CeUlkIHdpbGxcbiAqIGNoYW5nZSB0aGUgbG9hZGVkIHZpZGVvIGlkIHRvIHRoZSBnaXZlbiB2aWRlb0lkLCBhbmQgc2V0IHRoZSBzdGFydCBhbmQgZW5kIHRpbWVzIHRvIHRoZSBnaXZlblxuICogc3RhcnQvZW5kIHNlY29uZHMuXG4gKi9cbmZ1bmN0aW9uIGJpbmRDdWVWaWRlb0NhbGwoXG4gIHBsYXllck9iczogT2JzZXJ2YWJsZTxQbGF5ZXIgfCB1bmRlZmluZWQ+LFxuICB2aWRlb0lkT2JzOiBPYnNlcnZhYmxlPHN0cmluZyB8IHVuZGVmaW5lZD4sXG4gIHN0YXJ0U2Vjb25kc09iczogT2JzZXJ2YWJsZTxudW1iZXIgfCB1bmRlZmluZWQ+LFxuICBlbmRTZWNvbmRzT2JzOiBPYnNlcnZhYmxlPG51bWJlciB8IHVuZGVmaW5lZD4sXG4gIHN1Z2dlc3RlZFF1YWxpdHlPYnM6IE9ic2VydmFibGU8WVQuU3VnZ2VzdGVkVmlkZW9RdWFsaXR5IHwgdW5kZWZpbmVkPixcbiAgZGVzdHJveWVkOiBPYnNlcnZhYmxlPHZvaWQ+LFxuKSB7XG4gIGNvbnN0IGN1ZU9wdGlvbnNPYnMgPSBjb21iaW5lTGF0ZXN0KFtzdGFydFNlY29uZHNPYnMsIGVuZFNlY29uZHNPYnNdKVxuICAgIC5waXBlKG1hcCgoW3N0YXJ0U2Vjb25kcywgZW5kU2Vjb25kc10pID0+ICh7c3RhcnRTZWNvbmRzLCBlbmRTZWNvbmRzfSkpKTtcblxuICAvLyBPbmx5IHJlc3BvbmQgdG8gY2hhbmdlcyBpbiBjdWUgb3B0aW9ucyBpZiB0aGUgcGxheWVyIGlzIG5vdCBydW5uaW5nLlxuICBjb25zdCBmaWx0ZXJlZEN1ZU9wdGlvbnMgPSBjdWVPcHRpb25zT2JzXG4gICAgLnBpcGUoZmlsdGVyT25PdGhlcihwbGF5ZXJPYnMsIHBsYXllciA9PiAhIXBsYXllciAmJiAhaGFzUGxheWVyU3RhcnRlZChwbGF5ZXIpKSk7XG5cbiAgLy8gSWYgdGhlIHZpZGVvIGlkIGNoYW5nZWQsIHRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJ1biAnY3VlJyB1bmxlc3MgdGhlIHBsYXllclxuICAvLyB3YXMgaW5pdGlhbGl6ZWQgd2l0aCBhIGRpZmZlcmVudCB2aWRlbyBpZC5cbiAgY29uc3QgY2hhbmdlZFZpZGVvSWQgPSB2aWRlb0lkT2JzXG4gICAgICAucGlwZShmaWx0ZXJPbk90aGVyKHBsYXllck9icywgKHBsYXllciwgdmlkZW9JZCkgPT4gISFwbGF5ZXIgJiYgcGxheWVyLnZpZGVvSWQgIT09IHZpZGVvSWQpKTtcblxuICAvLyBJZiB0aGUgcGxheWVyIGNoYW5nZWQsIHRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJ1biAnY3VlJyB1bmxlc3MgdGhlcmUgYXJlIGN1ZSBvcHRpb25zLlxuICBjb25zdCBjaGFuZ2VkUGxheWVyID0gcGxheWVyT2JzLnBpcGUoXG4gICAgZmlsdGVyT25PdGhlcihcbiAgICAgIGNvbWJpbmVMYXRlc3QoW3ZpZGVvSWRPYnMsIGN1ZU9wdGlvbnNPYnNdKSxcbiAgICAgIChbdmlkZW9JZCwgY3VlT3B0aW9uc10sIHBsYXllcikgPT5cbiAgICAgICAgICAhIXBsYXllciAmJlxuICAgICAgICAgICAgKHZpZGVvSWQgIT0gcGxheWVyLnZpZGVvSWQgfHwgISFjdWVPcHRpb25zLnN0YXJ0U2Vjb25kcyB8fCAhIWN1ZU9wdGlvbnMuZW5kU2Vjb25kcykpKTtcblxuICBtZXJnZShjaGFuZ2VkUGxheWVyLCBjaGFuZ2VkVmlkZW9JZCwgZmlsdGVyZWRDdWVPcHRpb25zKVxuICAgIC5waXBlKFxuICAgICAgd2l0aExhdGVzdEZyb20oY29tYmluZUxhdGVzdChbcGxheWVyT2JzLCB2aWRlb0lkT2JzLCBjdWVPcHRpb25zT2JzLCBzdWdnZXN0ZWRRdWFsaXR5T2JzXSkpLFxuICAgICAgbWFwKChbXywgdmFsdWVzXSkgPT4gdmFsdWVzKSxcbiAgICAgIHRha2VVbnRpbChkZXN0cm95ZWQpLFxuICAgIClcbiAgICAuc3Vic2NyaWJlKChbcGxheWVyLCB2aWRlb0lkLCBjdWVPcHRpb25zLCBzdWdnZXN0ZWRRdWFsaXR5XSkgPT4ge1xuICAgICAgaWYgKCF2aWRlb0lkIHx8ICFwbGF5ZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcGxheWVyLnZpZGVvSWQgPSB2aWRlb0lkO1xuICAgICAgcGxheWVyLmN1ZVZpZGVvQnlJZCh7XG4gICAgICAgIHZpZGVvSWQsXG4gICAgICAgIHN1Z2dlc3RlZFF1YWxpdHksXG4gICAgICAgIC4uLmN1ZU9wdGlvbnMsXG4gICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaGFzUGxheWVyU3RhcnRlZChwbGF5ZXI6IFlULlBsYXllcik6IGJvb2xlYW4ge1xuICBjb25zdCBzdGF0ZSA9IHBsYXllci5nZXRQbGF5ZXJTdGF0ZSgpO1xuICByZXR1cm4gc3RhdGUgIT09IFlULlBsYXllclN0YXRlLlVOU1RBUlRFRCAmJiBzdGF0ZSAhPT0gWVQuUGxheWVyU3RhdGUuQ1VFRDtcbn1cblxuZnVuY3Rpb24gcGxheWVySXNSZWFkeShwbGF5ZXI6IFVuaW5pdGlhbGl6ZWRQbGF5ZXIpOiBwbGF5ZXIgaXMgUGxheWVyIHtcbiAgcmV0dXJuICdnZXRQbGF5ZXJTdGF0dXMnIGluIHBsYXllcjtcbn1cblxuLyoqIENvbWJpbmVzIHRoZSB0d28gb2JzZXJ2YWJsZXMgdGVtcG9yYXJpbHkgZm9yIHRoZSBmaWx0ZXIgZnVuY3Rpb24uICovXG5mdW5jdGlvbiBmaWx0ZXJPbk90aGVyPFIsIFQ+KFxuICBvdGhlck9iczogT2JzZXJ2YWJsZTxUPixcbiAgZmlsdGVyRm46ICh0OiBULCByPzogUikgPT4gYm9vbGVhbixcbik6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxSPiB7XG4gIHJldHVybiBwaXBlKFxuICAgIHdpdGhMYXRlc3RGcm9tKG90aGVyT2JzKSxcbiAgICBmaWx0ZXIoKFt2YWx1ZSwgb3RoZXJdKSA9PiBmaWx0ZXJGbihvdGhlciwgdmFsdWUpKSxcbiAgICBtYXAoKFt2YWx1ZV0pID0+IHZhbHVlKSxcbiAgKTtcbn1cbiJdfQ==