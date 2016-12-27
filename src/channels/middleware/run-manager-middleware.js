var RunChannel = require('./run-middleware');

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
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
    $creationPromise = $creationPromise.then(function () {
        return rm.run;
    });
    var currentRunChannel = new RunChannel({ serviceOptions: $creationPromise }, notifier);

    return currentRunChannel;
    // var handlers = [
    //     $.extend(variableschannel, { name: 'curren', prefix: 'variable:' }),
    //     $.extend(metaChannel, { name: 'meta', prefix: 'meta:' }),
    //     $.extend(operationsChannel, { name: 'operations', prefix: 'operation:' }),
    // ];

    // return {
    //     subscribeInterceptor: function (topics) {
            
    //     },
    //     publishInterceptor: function () {

    //     },
    // };
};
