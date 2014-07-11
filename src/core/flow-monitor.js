var config = require('../config');

module.exports = (function() {
    'use strict';

    // var rs = new F.service.Run();
    // var vs = rs.variables();

    var variableListenerMap = {};
    // var currentData;

    // var isEqual = function(a, b) {
    //     return a === b;
    // };

    // var updateAllvariableListenerMap = function() {
    //     // $.each(variableListenerMap, function(pro) {};)
    //     var variableNames = _.keys(variableListenerMap);
    //     rs.variables.query(variableNames).then(function(variables) {
    //         console.log('Got variables', variables);
    //         _(variables).each(function(vname) {
    //             var oldValue = currentData[vname];
    //             if (isEqual(variables[vname], oldValue)) {
    //                 currentData[vname] = variables[vname];

    //                 //let all variableListenerMap know
    //                 $(variableListenerMap).each(function(target) {
    //                     var fn = (target.trigger) ? target.trigger : $(target).trigger;
    //                     fn(config.event.react, vname, variables[vname]);
    //                 });
    //             }
    //         });
    //     });
    // };

    var publicAPI = {

        /**
         * @param  {String} property Model property to listen for changes on
         * @param  {Object|function} target If provided an object, it triggers a 'changed.flow' event on it. If a function, executes it when the property changes
         */
        bind: function(properties, target) {
            this.bindOneWay.apply(this, arguments);
            // $(target).on(config.events.trigger, function(evt, data) {
            //     if (rs.id) {
            //         vs.save(data).then(updateAllvariableListenerMap);
            //     }
            //     else {
            //         rs.create().then(function() {
            //             rs.variables().save(data).then(updateAllvariableListenerMap);
            //         });
            //     }
            // });
        },

        bindOneWay: function(properties, target) {
            properties = [].concat(properties);

            $.each(properties, function(index, property) {
                if (!variableListenerMap[property]) {
                    variableListenerMap[property] = [];
                }
                variableListenerMap[property] = variableListenerMap[property].concat(target);
            });
        },
        /**
         * @param  {String} property Model property to stop listening to
         * @param  {Object|function} context  The original context passed to bind
         */
        unbind: function() {

        },

        triggerUpdate: function(variable, value) {
            var listeners  = variableListenerMap[variable];

            var params = {};
            params[variable] = value;

            $.each(listeners, function(index, listener){
                listener.trigger.call(listener, config.events.react, params);
            });
        }
    };

    return publicAPI;
}());
