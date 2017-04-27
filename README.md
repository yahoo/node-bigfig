[![Build Status](https://travis-ci.org/yahoo/node-bigfig.svg)](https://travis-ci.org/yahoo/node-bigfig)

bigfig
======
configuration objects that vary based on multiple considerations

**Intended Audience:**
Applications which need to be configured in particular ways for different
environments.



Features <a name="features"></a>
--------

### customize configuration based on many concerns
* for some apps a single "development versus production" distinction might be
  too simple
* arbitrary set of names and values, which you define, to describe when the
  config should be customized
* library assumes no keys or values (not even based on `NODE_ENV`), so it
  doesn't dictate how you solve your problem
* the same source can be used to configure both the client (customized for
  each request) and the server (customized to the server environment), sharing
  details as appropriate and protecting details as appropriate

### works on JSON-like objects
* scalars and arrays and objects
* arbitrarily deeply nested objects

### focused on one problem
* allows you to use other libraries for their strengths
* can use other libraries for custom disk formats (yaml, cson, json5, etc)
* can use your own disk access algorithms (sync or async, cached reads, etc)

### customizable
* can use your own object merge algorithm (for example, to adjust how arrays
  are merged)
* can use your own match algorithm (for example, to match a dynamic range of
  values)

### optimized
* constructor studies source so that `read()` runs as fast a possible
* match and merge algorithms have been optimized for speed and low GC overhead



Example <a name="example"></a>
-------
This example is a bit complex to demonstrate some of the value/features of
this library. Your config can be as simple/complex as you need it to be 😀

```js
var bigfig = require("./index.js");
var fig, config;
fig = new bigfig.Config({
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
    });

config = fig.read({
    runtime: "server",
    env: "production",  // might come from process.env.NODE_ENV
    colo: "east"        // might be interpreted from the hostname
});
// {
//     apiURL: 'http://api.east.mysite.com:4080/',
//     assetURL: 'http://cdn.provider.com/mysite/',
//     listenPort: 80,
//     memcache: {
//         host: 'memcache.east.mysite.com',
//         port: 11666
//     }
// }

config = fig.read({
    runtime: "client",
    env: "production",  // might come from process.env.NODE_ENV
    secure: "true",     // might come from req.protocol === "https"
});
// {
//     apiURL: 'http://api.mysite.com/',
//     assetURL: 'https://cdn.provider.com/mysite/'
// }
```



Source Object Format <a name="source"></a>
--------------------
The source of the configuration is a JSON-like object -- an object with
scalars, and objects and arrays which can be nested arbitrarily deep.

```js
{
    port: 80,
    memcache: {
        host: "localhost",
        port: 11211,
        settings: {
            timeout: 1000
        }
    }
}
```

This simple config we call a **default** or **root**.

(If this simple approach meets your needs then you probably don't need this
library 😀)

You can add **sections**, each of which describes how the config should be
different for a different situation. The situation is described by a set of
keys and values we call a **context**.

```js
{
    port: 80,
    memcache: {
        host: "localhost",
        port: 11211,
        settings: {
            timeout: 1000
        }
    },
    "__context?env=staging": {
        memcache: {
            host: "memcache.staging.mysite.com"
        }
    },
    "__context?env=production": {
        memcache: {
            host: "memcache.mysite.com"
        }
    }
}
```

As well, a section can have further speciallizations within it.

```js
{
    port: 80,
    memcache: {
        host: "localhost",
        port: 11211,
        settings: {
            timeout: 1000
        }
    },
    "__context?env=production": {
        "__context?colo=east": {
            memcache: {
                host: "memcache.east.mysite.com"
            }
        },
        "__context?colo=west": {
            memcache: {
                host: "memcache.west.mysite.com"
            }
        },
    }
}
```

The section specializations can occur arbitrarily deep.

```js
{
    port: 80,
    memcache: {
        host: "localhost",
        port: 11211,
        settings: {
            timeout: 1000,
            "__context?env=production": {
                timeout: 500
            }
        }
    }
}
```

The context keys have these properties:

* start with `__context?`
* keys and values formatted the same as URL query parameters. for example
  `__context?env=production&colo=east`
* special characters should be encoded just as for URL query parameters
  (`%xx`)

FYI, the `__context?...` keys don't need to be quoted in YAML files.



API Reference <a name="api"></a>
-------------

### `Config(source, options)` constructor throws <a name="constructor"></a>
This creates a new bigfig object, on which you can call `read()` multiple
times with different contexts.

* `source` {Object} the source of the configuration, as describe in [Source
  Object Format](#source) above
* `options` {Object} an optional object containing settings used to adjust how
  the source is interpretted

There currently are no defined options.

This constructor will intentionally throw an error on the following conditions:

* The source is not an object. (Arrays and scalars are not accepted.)
* The source has a subsection which redefines a context key. Example:

```js
{
    color: 'red',
    "__context?env=production": {
        color: 'green',
        "__context?env=development": {
            color: 'blue',
        }
    }
}
```


### `Config.read(context, options)` method <a name="read"></a>
Creates a config object, customized to the specified context.

* `context` {Object} a simple object with dimension names and values
* `options` {Object} an optional object containing settings used to adjust how
  the config object is created

There currently are no defined options.


### `Config.match(context, options)` method <a name="match"></a>
This lower-level method isn't normally called. It returns all sections which
match the context.

* `context` {Object} a simple object with dimension names and values
* `options` {Object} an optional object containing settings used to adjust how
  the sections are matched
* returns {Array} an array of config objects to merge

There currently are no defined options.


### `Config.merge(sections, options)` method <a name="merge"></a>
This lower-level method isn't normally called. It merges the sections into a
configuration object.

* `sections` {Array} an array of config objects to merge
* `options` {Object} an optional object containing settings used to adjust how
  the configs are merged
* returns {Object} a config object

There currently are no defined options.


### `matcher(sectionContext, runContext, options)` <a name="matcher"></a>
The default match algorithm. See [Customizing the Match
Algorithm](#custom-match) below for details on how to replace this with your
own algorithm.

* `sectionContext` {Object} the context generated from the `__context?` keys
  in the source
* `runContext` {Object} the context passed to `read()` or `match()`
* `options` {Object} an optional object containing settings used to adjust how
  the contexts are matched
* returns {Boolean} true if `runContext` matches `sectionContext`

There currently are no defined options.


### `cloner(oldObject)` <a name="cloner"></a>
This is a low-level utility for cloning an object. You usually don't need to
call or overrride this function.

* `oldObject` {Object} the object to clone
* returns {Object} a copy of the object


### `merger(base, changes, options)` <a name="merger"></a>
The default merge algorithm. See [Customizing the Merge
Algorithm](#custom-merge) below for details on how to replace this with your
own algorithm.

* `base` {Object} object whose keys and values will be modified by `changes`
* `changes` {Object} object which contains changes to apply to `base`
* `options` {Object} an optional object containing settings used to adjust how
  the objects are merged
* returns {Object} the merged object

This merger has the following behavior:

* objects are iterated, and values are recursively merged
* a scalar (string, number, or boolean) in `changes` clobbers the value in
  `base`
* an array in `changes` clobbers the value in `base`

There currently are no defined options.



Customizing the Merge Algorithm <a name="custom-merge"></a>
-------------------------------
Once this libraries has identified which sections to use, it needs to merge
the sections down into a single config. This final config is what is returned
from `read()`.

It does this by merging each section onto the root — later sections in the
source are merged over earlier sections. Each section is merged using the
merger function, which defaults to the [one described above](#merger).

If you want to override how merging happens you can replace the one exported
by this module. Your customer merger should have the same signature as the
default merger.

```js
var bigfig = require('bigfig');
var hoek = require('hoek');
var fig, config;
fig = new bifgig.Config(...);

bigfig.merger = function(base, changes, options) {
    // use hoek's implementation
    hoek.merge(base, changes, true, false);
    return base;
};

config = fig.read({...});
```

### Optimizing a Custom Merger
While the merger should return the config to use, it doesn't need to be a
newly created object. The `base` argument can be returned, modified or
unmodified. (This can be a bit tricky — it's suggested to create a unit test
which has a complex source, and calls `read()` multiple times on a single
`Config()` object.)



Customizing the Match Algorithm <a name="custom-match"></a>
-------------------------------
The context passed to `read()` is matched to each section in the source. This
is done by calling the matcher, which defaults to the [one described
above](#matcher).

The matcher is called with the context in the section, the context passed to
`read()`, and should return a boolean indicating whether that section should
be used.

If you want to override how matching happens you can replace the one exported
by this module. Your custom matcher should have the same signature as the
default merger.

```js
var bigfig = require('bigfig');
var fig, config;
fig = new bifgig.Config(...);

bigfig.matcher = function(sectionContext, runContext, options) {
    // this toy matcher only matches sections based on the `env` key
    return sectionContext.env === runContext.env;
};

config = fig.read({...});
```



Optimizing Usage <a name="optimizing"></a>
----------------
If you want to trim the CPU, memory, and GC overhead of this library, here are
some tricks:

* Create a `Config` object once (perhaps at app startup) and call `read()`
  multiple times. This library is specifically optimized for this usage
  pattern.

* The `read()` overhead depends on how many sections and how deeply nested the
  configs are. More deeply nested configs mean more time is spent in merging
  (which can also affect GC). Lots of sections means more time spent in
  matching, which is a simple algorithm on long-lived objects (little GC
  cost).

Deeply nested sections are optimized by the constructor and so don't affect
performance. The following two examples have the same performance during
`read()`:

```js
{
    memcache: {
        settings: {
            timeout: 1000,
            "__context?env=production": {
                timeout: 500
            }
        }
    }
}
```
```js
{
    memcache: {
        settings: {
            timeout: 1000
        }
    },
    "__context?env=production": {
        memcache: {
            settings: {
                timeout: 500
            }
        }
    }
}
```



Ideas for Improvements <a name="ideas"></a>
----------------------

* better way to replace the matcher and merger
* customize special key prefix (instead of `__context?`)
* dimension values can have a hierarchy (for example, `{env: 'prod/east'}`
  matches both `__context?env=prod` and `__context?env=prod/east`)
* control the order in which the sections are merged (instead of order found
  in source)
* more sophisticated matcher API so that complex matchers can be highly
  optimized
* options inlined in the source (quivalent to options passed to the constructor)



Special Thanks <a name="thanks"></a>
--------------
Bigfig is a direct decendent of [ycb](https://www.npmjs.com/package/ycb),
which pioneered many of the ideas and priorities expressed in this library.



License <a name="license"></a>
-------
MIT License, see LICENSE.txt for details.


