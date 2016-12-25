var debounceAndMerge = require('utils/general').debounceAndMerge;

var metaChannel = require('./run-meta-channel');
var variablesChannel = require('./run-variables-channel');
var operationsChannel = require('./run-operations-channel');
var silencable = require('./silencable');

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        variables: {
            autoFetch: true,
            silent: false,
            readOnly: false,
        },
        operations: {
            readOnly: false,
            silent: false,
        },
        meta: {
            silent: true,
            autoFetch: true,
            readOnly: false
        },
        initialOperation: '',
    };
    var opts = $.extend(true, {}, defaults, config);
    var rm = new window.F.manager.RunManager(opts.serviceOptions);

    var $creationPromise = rm.getRun();
    if (opts.initialOperation) { //TODO: Only do this for newly created runs;
        $creationPromise = $creationPromise.then(function (rundata) {
            return rm.run.do(opts.initialOperation).then(function () {
                return rundata;
            });
        });
    }

    var VARIABLES_PREFIX = 'variable:';

    var debouncedFetch = debounceAndMerge(function (variables, runService, notifyCallback) {
        runService.variables().query(variables).then(function (result) {
            var toNotify = _.reduce(result, function (accum, value, variable) {
                var key = VARIABLES_PREFIX + variable;
                accum[key] = value;
                return accum;
            }, {});
            notifyCallback(toNotify);
        });
    }, 200, [function mergeVariables(accum, newval) {
        if (!accum) {
            accum = [];
        }
        return _.uniq(accum.concat(newval));
    }]);

    var subscribedVariables = {};

    var handlers = [
        {
            name: 'variables',
            prefix: 'variables:',
            subscribe: variablesChannel.subscribeHandler,
            publish: variablesChannel.publishHander
        },
        {
            name: 'meta',
            prefix: 'meta:',
            subscribe: metaChannel.subscribeHandler,
            publish: metaChannel.publishHander
        },
        {
            name: 'operations',
            prefix: 'operations:',
            publish: operationsChannel.publishHander
        },
    ];

    var publicAPI = {
        subscribeInterceptor: function (topics) {
            $creationPromise.then(function (runData) {
                handlers.forEach(function (ph) {
                    var toFetch = ([].concat(topics)).reduce(function (accum, topic) {
                        if (topic.indexOf(ph.prefix) === 0) {
                            var metaName = topic.replace(ph.prefix, '');
                            accum.push(metaName);
                        }
                        return accum;
                    }, []);

                    var handlerOptions = opts[ph.name];
                    var shouldFetch = _.result(handlerOptions, 'autoFetch');
                    if (toFetch.length && ph.subscribe && shouldFetch) {
                        ph.subscribe(toFetch, opts[ph.nam], rm.run, runData, notifier);
                    }
                });
            });
        },

        //TODO: Break this into multiple middlewares?
        publishInterceptor: function (inputObj) {
            return $creationPromise.then(function (runData) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
                var promises = handlers.reduce(function (promisesSoFar, ph) {
                    var topicsToHandle = Object.keys(inputObj).reduce(function (accum, inputKey) {
                        if (inputKey.indexOf(ph.prefix) !== -1) {
                            var cleanedKey = inputKey.replace(ph.prefix, '');
                            accum[cleanedKey] = inputObj[inputKey];
                        }
                        return accum;
                    }, {});

                    if (!Object.keys(topicsToHandle).length) {
                        return promisesSoFar;
                    }

                    var handlerOptions = opts[ph.name];
                    if (_.result(handlerOptions, 'readOnly')) {
                        var msg = 'Tried to publish to a read-only operations channel';
                        console.warn(msg, topicsToHandle);
                        return promisesSoFar;
                    } 

                    var thisProm = ph.publish(rm.run, topicsToHandle, opts[ph.name]).then(function (resultObj) {
                        Object.keys(resultObj).forEach(function (key) {
                            inputObj[ph.prefix + key] = resultObj[key];
                        });
                        var changed = Object.keys(resultObj);
                        var shouldSilence = silencable(changed, opts[ph.name]);
                        if (!shouldSilence) {
                            var variables = Object.keys(subscribedVariables);
                            debouncedFetch(variables, rm.run, notifier);
                        }
                        
                    });
                    promisesSoFar.push(thisProm);
                    return promisesSoFar;
                }, []);

                return $.when.apply(null, promises);
            });
        }
    };

    $.extend(this, publicAPI);
};
