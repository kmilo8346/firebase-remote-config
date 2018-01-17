(function() {
    'use strict';
    
    angular
        .module('remote-config', [])
        .run(_run)
        .provider('remoteConfig', _provider);

        _run.$inject = ['remoteConfig'];

        function _run (remoteConfig) {
            var strategy = remoteConfig.getFecthStrategy();

            switch(strategy) {
                case 'load-for-next': 
                    remoteConfig.loadForNext();
                    break;
                case 'interval': 
                    remoteConfig.startInterval();
                    break;
                default:
                    break;    
            }
        }

        function _provider() {
            var TAG = 'REMOTE CONFIG SERVICE: ';
            var DEFAULT_CACHE_DURATION = 2 * 60 * 60; // two hours
            var MIN_CACHE_DURATION = 60; // 60 seconds
            var DEFAULT_DELAY_INTERVAL = 60 * 60 * 1000; // one hour
            var MIN_DELAY_INTERVAL = 60 * 1000; // 60 seconds
            
            var strategies = ['none', 'load-for-next', 'interval'];
            var strategy = strategies[0];
            var cacheDuration = DEFAULT_CACHE_DURATION;
            var delayInterval = DEFAULT_DELAY_INTERVAL;
            
            
            this.setFetchStrategy = function(_strategy) {
                var s = typeof _strategy === 'string' ? _strategy : '';
                s = s.toLowerCase().trim();
                var index = strategies.indexOf(s);
                if (index !== -1) {
                    strategy = strategies[index]; 
                    return this;
                }
                strategy = strategies[0]; // default
                return this;
            }

            this.setCacheDuration = function(duration) {
                var d = typeof duration === 'number' ? duration : DEFAULT_CACHE_DURATION;
                if (d < MIN_CACHE_DURATION) {
                    console.log(TAG + 'Cache duration can\'t be lower than ' + MIN_CACHE_DURATION +
                    ', default cache duration is set to '
                        + DEFAULT_CACHE_DURATION  + ' instead');
                    d = DEFAULT_CACHE_DURATION;
                }
                cacheDuration = d;
                return this;
            }

            this.setDelayInterval = function(interval) {
                var i = typeof interval === 'number' ? interval : DEFAULT_DELAY_INTERVAL;
                if (i < MIN_DELAY_INTERVAL) {
                    console.log(TAG + 'Delay interval can\'t be lower than ' + MIN_DELAY_INTERVAL
                        + ', default delay interval is set to ' + DEFAULT_DELAY_INTERVAL + ' instead');
                    i = DEFAULT_DELAY_INTERVAL;
                }
                delayInterval = i;
                return this;
            }

            this.$get = function($ionicPlatform, $q, $interval) {
                
                return {
                    getFecthStrategy: _getFetchStrategy,
                    getCacheDuration: _getCacheDuration, // TODO implement set cache duration in service level
                    getValue: _getValue,
                    loadForNext: _loadForNext,
                    startInterval: _startInterval,
                    loadAndActivate: _loadAndActivate,
                };

                function _getFetchStrategy() {
                    return strategy;
                }

                function _getCacheDuration() {
                    return cacheDuration;
                }

                // TODO implement namespace
                function _getValue(key) {
                    return $ionicPlatform.ready()
                        .then(function() {
                            var defer = $q.defer();
                            if (window.FirebasePlugin) {
                                window.FirebasePlugin.getValue(key, function(value) {
                                    defer.resolve(value);
                                }, function(error) {
                                    defer.reject(error);
                                });
                            } else {
                                defer.reject(new Error('Firebase plugin must be installed'));
                            }
                            return defer.promise;
                        });
                }

                function _loadForNext() {
                    return $ionicPlatform.ready()
                        .then(function() {
                            _checkPluginIsInstalled();
                            window.FirebasePlugin.activateFetched(function(activated) {
                                // activated will be true if there was a fetched config activated,
                                // or false if no fetched config was found, or the fetched config was already activated.
                                console.log(TAG + 'Config activated: ' + activated);
                                window.FirebasePlugin.fetch(cacheDuration, function () {
                                    console.log(TAG + 'Config was fetched');
                                }, function (err) {
                                    console.error(TAG + 'Error fetching ' + err);
                                });
                            }, function(error) {
                                console.error(TAG + 'Error activating ' + err);
                            });
                        });
                }

                // used to test
                function _startInterval() {
                    $interval(function() {
                        _loadAndActivate();
                    }, delayInterval);
                }

                function _loadAndActivate() {
                    return $ionicPlatform.ready()
                        .then(function() {
                            var defer = $q.defer();
                            _checkPluginIsInstalled();
                            window.FirebasePlugin.fetch(cacheDuration, function () {
                                console.log(TAG + 'Config was fetched');
                                window.FirebasePlugin.activateFetched(function(activated) {
                                    // activated will be true if there was a fetched config activated,
                                    // or false if no fetched config was found, or the fetched config was already activated.
                                    console.log(TAG + 'Config activated: ' + activated);
                                    defer.resolve(activated);
                                }, function(err) {
                                    console.error(TAG + 'Error activating ' + err);
                                    defer.reject(err);
                                });
                            }, function (err) {
                                console.error(TAG + 'Error fetching ' + err);
                                defer.reject(err);
                            });
                            return defer.promise;
                        });
                }

                // private

                function _checkPluginIsInstalled() {
                    if (!window.FirebasePlugin) {
                        throw new Error('Firebase plugin must be installed');
                    }
                }

            };

            this.$get.$inject = ['$ionicPlatform', '$q', '$interval'];
        };
})();