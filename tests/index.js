

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

    it('recursively merges', function() {
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


describe('sectionsFromRaw()', function() {
    var testee = loadTestee();

    it('works for an empty config', function() {
        var raw = {},
            options = {},
            want = [
                [ {}, {} ],
            ],
            have;
        have = testee.TEST.sectionsFromRaw(raw, options);
        assert.deepEqual(have, want);
    });

    it('works for a simple config', function() {
        var raw = {
                color: 'red'
            },
            options = {},
            want = [
                [
                    {},
                    {
                        color: 'red'
                    }
                ],
            ],
            have;
        have = testee.TEST.sectionsFromRaw(raw, options);
        assert.deepEqual(have, want);
    });

    it('works for a config with one section', function() {
        var raw = {
                "color": "red",
                "__context?env=dev": {
                    "color": "blue"
                }
            },
            options = {},
            want = [
                [
                    {},
                    {
                        color: 'red'
                    }
                ],
                [
                    { env: 'dev' },
                    {
                        color: 'blue'
                    }
                ],
            ],
            have;
        have = testee.TEST.sectionsFromRaw(raw, options);
        assert.deepEqual(have, want);
    });

    it('works for a config with several section', function() {
        var raw = {
                "color": "red",
                "__context?env=dev": {
                    "color": "blue"
                },
                "__context?env=prod": {
                    "color": "green"
                },
                "__context?env=prod&colo=east": {
                    "color": "yellow"
                },
            },
            options = {},
            want = [
                [
                    {},
                    {
                        color: 'red'
                    }
                ],
                [
                    { env: 'dev' },
                    {
                        color: 'blue'
                    }
                ],
                [
                    { env: 'prod' },
                    {
                        color: 'green'
                    }
                ],
                [
                    { env: 'prod', colo: 'east' },
                    {
                        color: 'yellow'
                    }
                ],
            ],
            have;
        have = testee.TEST.sectionsFromRaw(raw, options);
        assert.deepEqual(have, want);
    });
});


describe('Config()', function() {
    var testee = loadTestee();

    describe('constructor', function() {
        it('throws on bad input', function() {
            var raws = [
                    null,
                    undefined,
                    'orange',
                    [ 'potato' ],
                    function() {},
                ];
            raws.forEach(function(raw) {
                var err;
                try {
                    new testee.Config(raw);
                } catch (e) {
                    err = e;
                }
                assert.equal(err.message, 'bigfig only supports object configs');
            });
        });

        it('works', function() {
            var options = { color: 'blue' },
                fig = new testee.Config({}, options);
            assert.deepEqual(fig.options, options);
            assert.deepEqual(fig.sections, [[{}, {}]]);
        });
    });

    describe('contextualize()', function() {
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
            have = fig.contextualize({env: 'dev'}, {setting: 'on'});
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
                mergerCalled = false;
            testee.merger = function(a, b, opts) {
                mergerCalled = true;
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


