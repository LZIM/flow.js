'use strict';

var domManager = require('./dom/dom-manager');
var Channel = require('./channels/run-channel');

module.exports = {
    dom: domManager,

    initialize: function (config) {
        var model = $('body').data('f-model');

        var defaults = {
            channel: {
                run: {
                    account: '',
                    project: '',
                    model: model,

                    operations: {
                    },
                    variables: {
                        autoFetch: {
                            startOnLoad: false
                        }
                    }
                }
            },
            dom: {
                root: 'body',
                plugins: {
                    autoUpdateBindings: true
                }
            }
        };

        var options = $.extend(true, {}, defaults, config);
        var $root = $(options.dom.root);
        var initFn = $root.data('f-on-init');
        var opnSilent = options.channel.run.operations.silent;
        var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
        var preFetchVariables = !initFn || isInitOperationSilent;
        var me = this;

        if (preFetchVariables) {
            options.channel.run.variables.autoFetch.startOnLoad = true;
        }

        if (config && config.channel && (config.channel instanceof Channel)) {
            this.channel = config.channel;
        } else {
            this.channel = new Channel(options.channel);
        }

        if (preFetchVariables) {
            $root.off('f.domready').on('f.domready', function () {
                // me.channel.variables.startAutoFetch([], { leading: true });
            });
        } else {

        }

        domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));
    }
};
