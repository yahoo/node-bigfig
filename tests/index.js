/*
MIT License

Copyright 2015, Yahoo Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/* jshint: node=true */
/* global describe,it */


var assert = require('assert');


function loadTestee() {
    delete require.cache[require.resolve('../index.js')];
    return require('../index.js');
}


describe('matcher()', function() {
    var testee = loadTestee();

    it('matches the root config', function() {
        var configCtx = {},
            runCtx = { env: 'dev' },
            options = {},
            have;
        have = testee.matcher(configCtx, runCtx, options);
        assert.equal(have, true);
    });

    it('matches a single dim', function() {
        var configCtx = { env: 'dev' },
            runCtx = { env: 'dev' },
            options = {},
            have;
        have = testee.matcher(configCtx, runCtx, options);
        assert.equal(have, true);
    });

    it('skips a single dim', function() {
        var configCtx = { env: 'dev' },
            runCtx = { env: 'prod' },
            options = {},
            have;
        have = testee.matcher(configCtx, runCtx, options);
        assert.equal(have, false);
    });

    it('matches a simple config ctx from a complex run ctx', function() {
        var configCtx = { env: 'dev' },
            runCtx = { env: 'dev', colo: 'east', runtime: 'server' },
            options = {},
            have;
        have = testee.matcher(configCtx, runCtx, options);
        assert.equal(have, true);
    });

    it('skips a partial run ctx', function() {
        var configCtx = { env: 'dev', colo: 'east', runtime: 'server' },
            runCtx = { env: 'dev' },
            options = {},
            have;
        have = testee.matcher(configCtx, runCtx, options);
        assert.equal(have, false);
    });
});


describe('cloner()', function() {
    var testee = loadTestee();

    it('clones scalars', function() {
        var vals = [
                'L',
                12.33,
                null,
                '',
                undefined,
                Infinity,
                -Infinity,
            ];
        vals.forEach(function(val) {
            assert(testee.cloner(val) === val);
        });
        assert(Number.isNaN(testee.cloner(NaN)));
    });

    it('clones arrays', function() {
        var vals = [
                [],
                ['a', 'b', 'c'],
            ];
        vals.forEach(function(val) {
            assert.deepEqual(testee.cloner(val), val);
        });
    });

    it('clones objects', function() {
        var vals = [
                {},
                { color: 'red' },
                { color: 'red', side: 'left' },
            ];
        vals.forEach(function(val) {
            assert.deepEqual(testee.cloner(val), val);
        });
    });

    it('clones recursively', function() {
        var val = {
                a: {
                    color: 'red',
                    side: 'left',
                    foo: [ 'b', 'ba', 'bar' ],
                },
                b: [ 'a', 'b', 'c' ],
                c: [
                    { x: 12, y: 22 },
                    [ [], [[], 3] ],
                ],
            };
        assert.deepEqual(testee.cloner(val), val);
    });
});


describe('merger()', function() {
    var testee = loadTestee();

    it('merges simple objects', function() {
        var a = {
                a: 'a-aaa',
                b: 'b-aaa',
            },
            b = {
                b: 'b-bbb',
                c: 'c-bbb',
            },
            options = {},
            want = {
                a: 'a-aaa',
                b: 'b-bbb',
                c: 'c-bbb',
            },
            have;
        have = testee.merger(a, b, options);
        assert.deepEqual(have, want);
    });

    it('merges recursively', function() {
        var a = {
                a: {
                    a: 'a-a-aaa',
                    b: 'a-b-aaa',
                },
                b: {
                    a: 'b-a-aaa',
                },
            },
            b = {
                a: {
                    b: 'a-b-bbb',
                },
                b: {
                    b: 'b-b-bbb',
                },
            },
            options = {},
            want = {
                a: {
                    a: 'a-a-aaa',
                    b: 'a-b-bbb',
                },
                b: {
                    a: 'b-a-aaa',
                    b: 'b-b-bbb',
                },
            },
            have;
        have = testee.merger(a, b, options);
        assert.deepEqual(have, want);
    });

    it('clobbers arrays', function() {
        var a = {
                a: [ 'x', 'y', 'z' ],
            },
            b = {
                a: [ 'm', 'n', 'o' ],
            },
            options = {},
            want = {
                a: [ 'm', 'n', 'o' ],
            },
            have;
        have = testee.merger(a, b, options);
        assert.deepEqual(have, want);
    });

    it('clobbers false-y scalars', function() {
        var a = {
                a: 'aaa',
                b: 'bbb',
                c: 'ccc',
                d: 'ddd',
                e: 'eee',
            },
            b = {
                a: null,
                b: undefined,
                c: false,
                d: 0,
                e: '',
            },
            options = {},
            want = {
                a: null,
                b: undefined,
                c: false,
                d: 0,
                e: '',
            },
            have;
        have = testee.merger(a, b, options);
        assert.deepEqual(have, want);
    });
});


describe('sectionsFromSource()', function() {
    var testee = loadTestee();

    it('works with a simple section', function() {
        var source = {
                color: 'red',
                side: 'left'
            },
            options = {},
            context = {
                env: 'prod'
            },
            have;
        have = testee.TEST.sectionsFromSource(source, options, context);
        assert.deepEqual(have, [
            {
                context: {env: 'prod'},
                config: {
                    color: 'red',
                    side: 'left'
                }
            }
        ]);
    });

    it('supports deeply nested objects', function() {
        var source = {
                color: 'red',
                side: 'left',
                db: {
                    host: 'localhost',
                    port: 1234,
                    settings: {
                        timeout: 11
                    }
                },
                there: {
                    is: {
                        an: {
                            old: 'lady',
                            who: 'lived',
                            in: [ 'a', 'shoe' ]
                        }
                    }
                }
            },
            options = {},
            context = {
                env: 'prod'
            },
            have;
        have = testee.TEST.sectionsFromSource(source, options, context);
        assert.deepEqual(have, [
            {
                context: {env: 'prod'},
                config: {
                    color: 'red',
                    side: 'left',
                    db: {
                        host: 'localhost',
                        port: 1234,
                        settings: {
                            timeout: 11
                        }
                    },
                    there: {
                        is: {
                            an: {
                                old: 'lady',
                                who: 'lived',
                                in: [ 'a', 'shoe' ]
                            }
                        }
                    }
                }
            }
        ]);
    });

    it('supports direct child contexts', function() {
        var source = {
                color: 'red',
                '__context?env=dev': {
                    color: 'blue'
                },
                '__context?env=prod': {
                    color: 'green'
                },
                '__context?env=prod&colo=east': {
                    color: 'yellow'
                },
            },
            options = {},
            have;
        have = testee.TEST.sectionsFromSource(source, options);
        assert.deepEqual(have, [
            {
                context: {},
                config: {color: 'red'}
            },
            {
                context: {env: 'dev'},
                config: {color: 'blue'}
            },
            {
                context: {env: 'prod' },
                config: {color: 'green'}
            },
            {
                context: {env: 'prod', colo: 'east'},
                config: {color: 'yellow'}
            }
        ]);
    });

    it('supports encoded characters', function() {
        var source = {
                color: 'red',
                '__context?colo=boca%20raton': {
                    color: 'blue'
                },
            },
            options = {},
            context = {env: 'prod'},
            have;
        have = testee.TEST.sectionsFromSource(source, options, context);
        assert.deepEqual(have, [
            {
                context: {env: 'prod'},
                config: {color: 'red'}
            },
            {
                context: {env: 'prod', colo: 'boca raton'},
                config: {color: 'blue'}
            },
        ]);
    });

    it('supports deeply nested contexts', function() {
        var source = {
                color: 'red',
                '__context?env=dev': {
                    db: {
                        host: 'localhost',
                        port: 1234,
                        settings: {
                            timeout: 11
                        }
                    }
                },
                '__context?env=prod': {
                    '__context?colo=west': {
                        color: 'blue',
                    }
                },
                '__context?env=prod&colo=east': {
                    color: 'yellow'
                },
            },
            options = {},
            have;
        have = testee.TEST.sectionsFromSource(source, options);
        assert.deepEqual(have, [
            {
                context: {},
                config: {color: 'red'}
            },
            {
                context: {env: 'dev'},
                config: {
                    db: {
                        host: 'localhost',
                        port: 1234,
                        settings: {
                            timeout: 11
                        }
                    }
                }
            },
            {
                context: {env: 'prod', colo: 'west'},
                config: {color: 'blue'}
            },
            {
                context: {env: 'prod', colo: 'east'},
                config: {color: 'yellow'}
            }
        ]);
    });

    it('supports both deeply nested objects and deeply nested contexts', function() {
        var source = {
                apiURL: "http://localhost:3001/",
                assetURL: "http://localhost:3000/static",
                "__context?runtime=server": {
                    listenPort: 3000,
                    memcache: {
                        host: "localhost",
                        port: 11211
                    },
                },
                "__context?env=staging": {
                    listenPort: 80,
                    apiURL: "http://staging.mysite.com:4080/",
                    assetURL: "http://staging.mysite.com/static",
                    memcache: {
                        host: "memcache.staging.mysite.com"
                    }
                },
                "__context?env=production": {
                    apiURL: "http://api.mysite.com/",
                    assetURL: "http://cdn.provider.com/mysite/",
                    "__context?secure=true": {
                        assetURL: "https://cdn.provider.com/mysite/"
                    }
                },
                "__context?env=production&runtime=server": {
                    listenPort: 80,
                    "__context?colo=east": {
                        apiURL: "http://api.east.mysite.com:4080/",
                        memcache: {
                            host: "memcache.east.mysite.com",
                            port: 11666
                        }
                    },
                    "__context?colo=west": {
                        apiURL: "http:/api.west.mysite.com:4080/",
                        memcache: {
                            host: "memcache.west.mysite.com"
                        }
                    }
                },
                foo: {
                    bar: 12,
                    "__context?alien=mork": {
                        bar: 333
                    }
                }
            },
            options = {},
            have;
        have = testee.TEST.sectionsFromSource(source, options);
        assert.deepEqual(have, [
            {
                context: {},
                config: {
                    apiURL: "http://localhost:3001/",
                    assetURL: "http://localhost:3000/static",
                    foo: {
                        bar: 12
                    }
                }
            },
            {
                context: {runtime: 'server'},
                config: {
                    listenPort: 3000,
                    memcache: {
                        host: "localhost",
                        port: 11211
                    },
                }
            },
            {
                context: {env: 'staging'},
                config: {
                    listenPort: 80,
                    apiURL: "http://staging.mysite.com:4080/",
                    assetURL: "http://staging.mysite.com/static",
                    memcache: {
                        host: "memcache.staging.mysite.com"
                    }
                }
            },
            {
                context: {env: 'production'},
                config: {
                    apiURL: "http://api.mysite.com/",
                    assetURL: "http://cdn.provider.com/mysite/",
                }
            },
            {
                context: {env: 'production', secure: 'true'},
                config: {
                    assetURL: "https://cdn.provider.com/mysite/"
                }
            },
            {
                context: {env: 'production', runtime: 'server'},
                config: {
                    listenPort: 80,
                }
            },
            {
                context: {env: 'production', runtime: 'server', colo: 'east'},
                config: {
                    apiURL: "http://api.east.mysite.com:4080/",
                    memcache: {
                        host: "memcache.east.mysite.com",
                        port: 11666
                    }
                }
            },
            {
                context: {env: 'production', runtime: 'server', colo: 'west'},
                config: {
                    apiURL: "http:/api.west.mysite.com:4080/",
                    memcache: {
                        host: "memcache.west.mysite.com"
                    }
                }
            },
            {
                context: {alien: 'mork'},
                config: {
                    foo: {
                        bar: 333
                    }
                }
            }
        ]);
    });
});


describe('Config()', function() {
    var testee = loadTestee();

    describe('constructor', function() {
        it('throws on non-object input', function() {
            var sources = [
                    null,
                    undefined,
                    'orange',
                    [ 'potato' ],
                    function() {},
                ];
            sources.forEach(function(source) {
                var err;
                try {
                    new testee.Config(source);
                } catch (e) {
                    err = e;
                }
                assert.equal(err.message, 'bigfig only supports object configs');
            });
        });

        it('throws if subsection clobbers path context', function() {
            var source, fig, err;
            source = {
                db: {
                    host: 'red'
                },
                "__context?env=production": {
                    db: {
                        host: 'green',
                        "__context?colo=east&env=development": {
                            host: 'blue',
                        }
                    }
                }
            };
            try {
                fig = new testee.Config(source);
            }
            catch (e) {
                err = e;
            }
            assert.equal(err.message, 'subsection redefines "env" in existing context: __context?env=production -> db -> __context?colo=east&env=development');
        });

        it('works', function() {
            var options = { color: 'blue' },
                fig = new testee.Config({}, options);
            assert.deepEqual(fig.options, options);
            assert.deepEqual(fig.sections, [
                {
                    context: {},
                    config: {}
                }
            ]);
        });
    });

    describe('read()', function() {
        it('runs the algorithm', function() {
            var fig = new testee.Config({}),
                matchCalled = false,
                mergeCalled = false,
                have;
            fig.match = function(ctx, opts) {
                matchCalled = true;
                assert.deepEqual(ctx, {env: 'dev'});
                assert.deepEqual(opts, {setting: 'on'});
                return 'potato';
            };
            fig.merge = function(sections, opts) {
                mergeCalled = true;
                assert.equal(sections, 'potato');
                assert.deepEqual(opts, {setting: 'on'});
                return 'olives';
            };
            have = fig.read({env: 'dev'}, {setting: 'on'});
            assert.equal(have, 'olives');
        });
    });

    describe('match()', function() {
        it('runs the algorithm', function() {
            var fig = new testee.Config({
                    color: 'red',
                    '__context?env=dev': {
                        color: 'green',
                    },
                    '__context?env=prod': {
                        color: 'blue',
                    },
                }),
                matcherCalled = false,
                have;
            testee.matcher = function(a, b, opts) {
                assert.deepEqual(b, {env: 'dev'});
                assert.deepEqual(opts, {setting: 'on'});
                matcherCalled = true;
                return a.env !== 'prod';
            };
            have = fig.match({env: 'dev'}, {setting: 'on'});
            assert(matcherCalled);
            assert.deepEqual(have, [
                {color: 'red'},
                {color: 'green'},
            ]);
        });
    });

    describe('merge()', function() {
        it('runs the algorithm', function() {
            var fig = new testee.Config({}),
                mergerCalled = false,
                have;
            testee.merger = function(a, b, opts) {
                mergerCalled = true;
                // shallow merge, just for testing
                Object.keys(b).forEach(function(key) {
                    a[key] = b[key];
                });
                return b;
            };
            have = fig.merge([
                {color: 'red'},
                {color: 'green'},
            ], {setting: 'on'});
            assert(mergerCalled);
            assert.deepEqual(have, {color: 'green'});
        });
    });
});


describe('README.md', function() {
    var testee = loadTestee();

    it('example', function() {
        var source, fig, have;
        source = {
            // default (development)
            apiURL: "http://localhost:3001/",
            assetURL: "http://localhost:3000/static",

            // don't expose this config to the client!
            "__context?runtime=server": {
                listenPort: 3000,
                memcache: {
                    host: "localhost",
                    port: 11211
                },
            },

            // stand-alone staging environment for validation testing
            "__context?env=staging": {
                listenPort: 80,
                apiURL: "http://staging.mysite.com:4080/",
                assetURL: "http://staging.mysite.com/static",
                memcache: {
                    host: "memcache.staging.mysite.com"
                }
            },

            // adjust the config for production hosts
            "__context?env=production": {
                apiURL: "http://api.mysite.com/",
                assetURL: "http://cdn.provider.com/mysite/",
                "__context?secure=true": {
                    assetURL: "https://cdn.provider.com/mysite/"
                }
            },

            "__context?env=production&runtime=server": {
                listenPort: 80,
                // perhaps you have more than one type of production host
                "__context?colo=east": {
                    apiURL: "http://api.east.mysite.com:4080/",
                    memcache: {
                        host: "memcache.east.mysite.com",
                        // for some legacy reason the eastern memcached is on a weird port
                        port: 11666
                    }
                },
                "__context?colo=west": {
                    apiURL: "http:/api.west.mysite.com:4080/",
                    memcache: {
                        host: "memcache.west.mysite.com"
                    }
                }
            }
        };
        fig = new testee.Config(source);
        have = fig.read({
            runtime: "server",
            env: "production",  // might come from process.env.NODE_ENV
            colo: "east"        // might be interpreted from the hostname
        });
        assert.deepEqual(have, {
            apiURL: 'http://api.east.mysite.com:4080/',
            assetURL: 'http://cdn.provider.com/mysite/',
            listenPort: 80,
            memcache: {
                host: 'memcache.east.mysite.com',
                port: 11666
            }
        });
        have = fig.read({
            runtime: "client",
            env: "production",  // might come from process.env.NODE_ENV
            secure: "true",     // might come from req.protocol === "https"
        });
        assert.deepEqual(have, {
            apiURL: 'http://api.mysite.com/',
            assetURL: 'https://cdn.provider.com/mysite/'
        });
    });
});


