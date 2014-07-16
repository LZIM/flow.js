'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function(config) {
    if (!config) {
        config = {};
    }

    var runparams = config;

    var rs = new F.service.Run(runparams);

    //TODO: store runid in token etc
    var $creationPromise = rs.create({model: 'pdasim.vmf'});

    var createAndThen = function(value) {
        return _.wrap(value, function(func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return $creationPromise.done(function (){
                return func.apply(rs, passedInParams);
            });
        });
    };

    //Make sure nothing happens before the run is created
    _.each(rs, function(value, name) {
        if ($.isFunction(value) && name !== 'variables') {
            rs[name] = createAndThen(value);
        }
    });
    var vs = rs.variables();
    _.each(vs, function(value, name) {
        if ($.isFunction(value)) {
            vs[name] = createAndThen(value);
        }
    });

    this.run = rs;
    this.variables = new VarsChannel({variables: vs});
    this.operations = new OperationsChannel({run: rs});
};