'use strict';
var config = require('../config');

module.exports = function(options) {
    var defaults = {
        refresh: {
            /**
             * Determine when to trigger the refresh event. This is useful if you know before-hand which variables need to update dependencies in the UI
             * @type {String | Array }  Possible options are
             *       - all: Trigger a refresh when any variable changes
             *       - none: Never trigger a refresh
             *       - variableName: trigger a refresh when specific variable changes
             *       - [variableNames..]: trigger a refresh when the following variables change
             */
            on: 'all',

            /**
             * Exclude the following variables from triggering a refresh operation
             * @type {Array} List of variable names to exclude
             */
            except: []
        }
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    var vs = channelOptions.run.variables();
    var vent = channelOptions.vent;

    var currentData = {};

    //TODO: actually compare objects and so on
    var isEqual = function(a, b) {
        return false;
    };

    var getInnerVariables = function(str) {
        var inner = str.match(/<(.*?)>/g);
        inner = _.map(inner, function(val){
            return val.substring(1, val.length - 1);
        });
        return inner;
    };

    //Replaces stubbed out keynames in variablestointerpolate with their corresponding calues
    var interpolate = function(variablesToInterpolate, values) {
        var interpolationMap = {};
        var interpolated = {};

        _.each(variablesToInterpolate, function (val, outerVariable) {
            var inner = getInnerVariables(outerVariable);
            var originalOuter = outerVariable;
            $.each(inner, function(index, innerVariable) {
                var thisval = values[innerVariable];
                if (thisval !== null && thisval !== undefined) {
                    if (_.isArray(thisval)) {
                        //For arrayed things get the last one for interpolation purposes
                        thisval = thisval[thisval.length -1];
                    }
                    outerVariable = outerVariable.replace('<' + innerVariable + '>', thisval);
                }
            });
            interpolationMap[outerVariable] = originalOuter;
            interpolated[outerVariable] = val;
        });

        return {
            interpolated: interpolated,
            interpolationMap: interpolationMap
        };
    };

    var publicAPI = {
        //for testing
        private: {
            getInnerVariables: getInnerVariables,
            interpolate: interpolate,
            options: channelOptions
        },

        //Interpolated variables which need to be resolved before the outer ones can be
        innerVariablesList: [],
        variableListenerMap: {},

        /**
         * Check and notify all listeners
         * @param  {Object} changeObj key-value pairs of changed variables
         */
        refresh: function(changeObj) {
            var me = this;
            var refreshOn = channelOptions.refresh.on;
            var refreshExcept= channelOptions.refresh.except;

            var changedVariables = _.keys(changeObj);
            var isStringRefreshMatch = changedVariables && _.isString(refreshOn) && _.contains(changedVariables, refreshOn);
            var isArrayRefreshMatch = changedVariables && _.isArray(refreshOn) && _.intersection(refreshOn, changedVariables).length >= 1;

            var isExcluded = changeObj && (_.intersection(refreshExcept, changedVariables).length === changedVariables.length);
            var needsRefresh = (!isExcluded && (refreshOn === 'all' || isStringRefreshMatch || isArrayRefreshMatch));

            if (!needsRefresh) {
                return $.Deferred().resolve().promise();
            }

            var getVariables = function(vars, ip) {
                return vs.query(vars).then(function(variables) {
                    // console.log('Got variables', variables);
                    _.each(variables, function(value, vname) {
                        var oldValue = currentData[vname];
                        if (!isEqual(value, oldValue)) {
                            currentData[vname] = value;

                            var vn = (ip && ip[vname]) ? ip[vname] : vname;
                            me.notify(vn, value);
                        }
                    });
                });
            };
            if (me.innerVariablesList.length) {
                return vs.query(me.innerVariablesList).then(function (innerVariables) {
                    //console.log('inner', innerVariables);
                    $.extend(currentData, innerVariables);
                    var ip =  interpolate(me.variableListenerMap, innerVariables);
                    var outer = _.keys(ip.interpolated);
                    getVariables(outer, ip.interpolationMap);
                });
            }
            else {
                return getVariables(_.keys(me.variableListenerMap));
            }

        },

        notify: function (variable, value) {
            var listeners = this.variableListenerMap[variable];
            var params = {};
            params[variable] = value;

            _.each(listeners, function (listener){
                listener.target.trigger(config.events.react, params);
            });
        },

        publish: function(variable, value) {
            // console.log('publish', arguments);
            // TODO: check if interpolated
            var attrs;
            if ($.isPlainObject(variable)) {
                attrs = variable;
            } else {
                (attrs = {})[variable] = value;
            }
            var interpolated = interpolate(attrs, currentData).interpolated;

            var me = this;
            vs.save.call(vs, interpolated)
                .then(function () {
                    me.refresh.call(me, attrs);
                });
        },

        subscribe: function(properties, subscriber) {
            // console.log('subscribing', properties, subscriber);

            properties = [].concat(properties);
            //use jquery to make event sink
            //TODO: subscriber can be a function
            if (!subscriber.on) {
                subscriber = $(subscriber);
            }

            var id  = _.uniqueId('epichannel.variable');
            var data = {
                id: id,
                target: subscriber
            };

            var me = this;
            $.each(properties, function(index, property) {
                var inner = getInnerVariables(property);
                if (inner.length) {
                    me.innerVariablesList = me.innerVariablesList.concat(inner);
                }
                me.innerVariablesList = _.uniq(me.innerVariablesList);

                if (!me.variableListenerMap[property]) {
                    me.variableListenerMap[property] = [];
                }
                me.variableListenerMap[property] = me.variableListenerMap[property].concat(data);
            });

            return id;
        },
        unsubscribe: function(variable, token) {
            this.variableListenerMap[variable] = _.reject(this.variableListenerMap[variable], function(subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function() {
            this.variableListenerMap = {};
            this.innerVariablesList = [];
        }
    };

    $.extend(this, publicAPI);
    var me = this;
    $(vent).on('dirty', function () {
        me.refresh.call(me);
    });
};
