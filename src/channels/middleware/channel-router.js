var channelUtils = require('channels/channel-utils');
var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;
var unprefix = require('channels/middleware/utils').unprefix;

/**
 * Router
 * @param  {Array} handlers Array of the form [{ subscribeHandler, unsubscribeHandler, publishHandler }]
 * @return {Router}
 */
module.exports = function Router(handlers) {
    var publicAPI = {
        /**
         * [subscribeHandler description]
         * @param  {Array} topics [<String>] of subscribed topics
         */
        subscribeHandler: function (topics) {
            var grouped = channelUtils.groupByHandlers(topics, handlers);
            grouped.forEach(function (handler) {
                if (handler.subscribeHandler) {
                    var unprefixed = unprefix(handler.data, handler.match);
                    handler.subscribeHandler(unprefixed, handler.match);
                }
            });
        },
        unsubscribeHandler: function (remainingTopics) {
            var grouped = channelUtils.groupByHandlers(remainingTopics, handlers);

            grouped.forEach(function (handler) {
                if (handler && handler.unsubscribeHandler) {
                    var unprefixed = unprefix(handler.data, handler.match);
                    handler.unsubscribeHandler(unprefixed);
                }
            });
        },

        publishHandler: function (publishData) {
            var grouped = channelUtils.groupSequentiallyByHandlers(publishData, handlers);
            var $initialProm = $.Deferred().resolve({}).promise();
            grouped.forEach(function (handler) {
                $initialProm = $initialProm.then(function (dataSoFar) {
                    var unprefixed = unprefix(handler.data, handler.match);
                    return handler.publishHandler(unprefixed, handler.match).then(function (published) {
                        var mapped = mapWithPrefix(published, handler.match);
                        return mapped;
                    }).then(function (mapped) {
                        return $.extend(dataSoFar, mapped);
                    });
                });
            });
            return $initialProm;
        }
    };

    return $.extend(this, publicAPI);
}; 
