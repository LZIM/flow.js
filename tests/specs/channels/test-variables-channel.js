'use strict';
(function () {

    var Channel = require('../../../src/channels/variables-channel');

    describe('Variables Channel', function () {
        var core, channel, server, mockVariables, mockRun;

        before(function () {
            server = sinon.fakeServer.create();
            server.respondWith('PATCH',  /(.*)\/run\/(.*)\/(.*)/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url }));
            });
            server.respondWith('GET',  /(.*)\/run\/(.*)\/variables/, function (xhr, id) {
                xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ url: xhr.url,
                    price: 23,
                    sales: 30,
                    priceArray: [20, 30]
                }));
            });
            server.respondWith('POST',  /(.*)\/run\/(.*)\/(.*)/,  function (xhr, id) {
                var resp = {
                    'id': '065dfe50-d29d-4b55-a0fd-30868d7dd26c',
                    'model': 'model.vmf',
                    'account': 'mit',
                    'project': 'afv',
                    'saved': false,
                    'lastModified': '2014-06-20T04:09:45.738Z',
                    'created': '2014-06-20T04:09:45.738Z'
                };
                xhr.respond(201, { 'Content-Type': 'application/json' }, JSON.stringify(resp));
            });

            mockVariables = {
                query: sinon.spy(function () {
                    return $.Deferred().resolve({
                        price: 23,
                        sales: 30,
                        priceArray: [20, 30]
                    }).promise();
                }),
                save: sinon.spy(function () {
                    return $.Deferred().resolve().promise();
                })
            };
            mockRun = {
                variables: function () {
                    return mockVariables;
                }
            };
            channel = new Channel({ vent: {}, run: mockRun });
            core = channel.private;
        });

        after(function () {
            server.restore();
        });

        describe('#getInnerVariables', function () {
            it('should extract single variable within limiters', function () {
                var result = core.getInnerVariables('price[<time>]');
                result.should.eql(['time']);
            });

            it('should extract multiple variable within limiters', function () {
                var result = core.getInnerVariables('price[<time>,<step>]');
                result.should.eql(['time', 'step']);
            });

            it('should return nothing if nothing to interpolate', function () {
                var result = core.getInnerVariables('price');
                result.should.eql([]);
            });
        });

        describe('#interpolate', function () {
            describe('.interpolated', function () {
                it('should interpolate single variable', function () {
                    var result = core.interpolate({ 'price[<time>]': 1 }, { time: 1 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1]': 1 });
                });
                it('should interpolate multiple variables', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, { time: 1, step: 4 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1,2,4]': 1 });
                });
                it('should not interpolate if it finds nothing', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, {});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[<time>,2,<step>]': 1 });
                });

                it('should not interpolate if there\'s nothing to interpolate', function () {
                    var result = core.interpolate({ 'price[<time>]': 1, 'sales[1]': 1, 'cost[<x>]': 2 }, { time: 1 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1]': 1, 'sales[1]': 1, 'cost[<x>]': 2 });
                });
                it('should not do substrings', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1 }, { time: 1, times: 2 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1,2,2]': 1 });
                });
                it('should do multiples', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1, 'sales[<time>]': 1 }, { time: 1, times: 2 });
                    var interpolated = result.interpolated;

                    interpolated.should.eql({ 'price[1,2,2]': 1, 'sales[1]': 1 });
                });
            });
            describe('.interpolationMap', function () {
                it('should interpolate single variable', function () {
                    var result = core.interpolate({ 'price[<time>]': 1 }, { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]' });
                });
                it('should interpolate multiple variables', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, { time: 1, step: 4 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,4]': 'price[<time>,2,<step>]' });
                });
                it('should not interpolate if it finds nothing', function () {
                    var result = core.interpolate({ 'price[<time>,2,<step>]': 1 }, {});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[<time>,2,<step>]': 'price[<time>,2,<step>]' });
                });
                it('should not interpolate if there\'s nothing to interpolate', function () {
                    var result = core.interpolate({ 'price[<time>]': 1, 'sales[1]': 1, 'cost[<x>]': 2 }, { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]', 'cost[<x>]': 'cost[<x>]' });
                });

                it('should not do substrings', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1 }, { time: 1, times: 2 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,2]': 'price[<time>,2,<times>]' });
                });
                it('should do multiples', function () {
                    var result = core.interpolate({ 'price[<time>,2,<times>]': 1, 'sales[<time>]': 1 }, { time: 1, times: 2 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1,2,2]': 'price[<time>,2,<times>]', 'sales[1]': 'sales[<time>]' });
                });

                it('should handle mixed items', function () {
                    var result = core.interpolate({ 'price[<time>]': 1, 'price[1]': 1 }, { time: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': 'price[<time>]' });
                });

                it('should handle a variable being interpolated with different items with same value', function () {
                    var result = core.interpolate({ 'price[<time>]': 1, 'price[1]': 1, 'price[<stuff>]': 1 }, { time: 1, stuff: 1 });
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({ 'price[1]': ['price[<stuff>]', 'price[<time>]'] });
                });

            });

        });

        describe('#unsubscribeAll', function () {
            it('should clear out state variables', function () {
                channel.subscribe(['price'], {});
                channel.subscribe(['target'], {});

                channel.unsubscribeAll();
                channel.variableListenerMap.should.eql({});
                channel.innerVariablesList.should.eql([]);

            });

        });

        describe('#subscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });
            it('should update variable listeners', function () {
                channel.subscribe(['price'], {});
                channel.variableListenerMap.should.have.key('price');
            });
            it('should update inner variable dependencies for single items', function () {
                channel.subscribe(['price[<time>]'], {});

                channel.variableListenerMap.should.have.key('price[<time>]');
                channel.innerVariablesList.should.eql(['time']);
            });

            it('should update inner variable dependencies for multiple items', function () {
                channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], {});

                channel.variableListenerMap.should.have.keys('price[<time>]', 'apples', 'sales[<step>]');
                channel.innerVariablesList.should.eql(['time', 'step']);
            });
            it('should generate a token', function () {
                var dummyObject = {  a: 1  };
                var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
                token.should.exist;
            });

        });

        describe('#publish', function () {
            it('should publish values to the variables service', function () {
                channel.publish({ price: 23 });
                mockVariables.save.should.have.been.calledWith({ price: 23 });

            });
            it('should call refresh after publish', function () {
                var originalRefresh = channel.refresh;
                var refSpy = sinon.spy(originalRefresh);
                channel.refresh = refSpy;

                channel.publish({ price: 23 });
                refSpy.should.have.been.called;

                channel.refresh = originalRefresh;
            });
            it('should not call refresh if silenced', function () {
                var originalRefresh = channel.refresh;
                var refSpy = sinon.spy(originalRefresh);
                channel.refresh = refSpy;

                channel.publish({ price: 23 }, { silent: true });
                refSpy.should.not.have.been.called;

                channel.refresh = originalRefresh;
            });
        });

        describe('#refresh', function () {
            it('should call if no rules are specified', function () {
                var channel = new Channel({ vent: {}, run: mockRun });
                var modelChangeSpy = sinon.spy();

                var $sink = $({  a:1  });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });

                modelChangeSpy.should.have.been.called;
            });

            it('should not call refresh if silent is true', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: true });
                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.not.have.been.called;
            });

            it('should call refresh if forced', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: true });
                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.not.have.been.called;

                channel.refresh({ price: 23 }, true);
                modelChangeSpy.should.have.been.calledOnce;
            });


            it('should call refresh if silent is false', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: false });

                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.have.been.calledOnce;

                channel.publish({ stuff: 24 });
                modelChangeSpy.should.have.been.calledTwice;

            });

            it('should not call refresh if silent whitelist match', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: ['price'] });

                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                channel.subscribe('stuff', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.not.have.been.called;

                channel.publish({ stuff: 24 });
                modelChangeSpy.should.have.been.calledOnce;
            });

            it('should call refresh if silent blacklist match', function () {
                var channel = new Channel({ vent: {}, run: mockRun, silent: {
                    except: ['price']
                } });

                var modelChangeSpy = sinon.spy();

                var $sink = $({ a:1 });
                channel.subscribe('price', $sink);
                channel.subscribe('stuff', $sink);
                $sink.on('update.f.model', modelChangeSpy);

                channel.publish({ price: 24 });
                modelChangeSpy.should.have.been.calledOnce;

                channel.publish({ stuff: 24 });
                modelChangeSpy.should.have.been.calledOnce;
            });
        });

        describe('#unsubscribe', function () {
            afterEach(function () {
                channel.unsubscribeAll();
            });

            it('should use the token to unsubscribe', function () {
                var dummyObject = { a: 1 };
                var token = channel.subscribe(['price[<time>]', 'apples', 'sales[<step>]'], dummyObject);
                channel.variableListenerMap.apples.length.should.eql(1);

                channel.unsubscribe('apples', token);
                channel.variableListenerMap.apples.should.eql([]);
            });
        });
    });
}());
