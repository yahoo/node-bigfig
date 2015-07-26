bigfig
======
configuration objects that vary based on multiple considerations

Quick Reference:
[source](#source),
[constructor](#constructor),
[read()](#read)


Features <a name="features"></a>
--------

### customize configuration based on many concerns
* for some apps a single "development versus production" distinction might be
  too simple
* can use the same source/file to configure both the client (customized for
  each request) and the server (customized to the server environment), sharing
  details as appropriate and protecting details as appropriate
* unlimited number of dimensions, assuming nothing, to conform to your
  situation

### works on JSON-like objects
* scalars and objects and arrays
* arbitrarily deeply nested

### customizable
* can use your own object merge algorithm (for example, to tweak how arrays
  are merged)
* can use your own match algorithm (for example, to match a dynamic range of
  values)

### focused on solving one problem
* allows you to use other libraries for their strengths
* can use other libraries for custom disk formats (yaml, cson, json5, etc)
* can use your own disk access algorithms (sync or async, cached reads, etc)

### optimized
* constructor studies source so that `read()` runs as fast a possible
* match and merge algorithms have been optimized for speed and low GC overhead



Example <a name="example"></a>
-------
This example is a bit complex to demonstrate some of the value/features of this library.
Your config only needs to be as complicated as you need it to be :)

```js
var bigfig = require("./index.js");
var fig, config;
fig = new bigfig.Config({
        // default (development)
        apiURL: "http://localhost:3001/",

        // one approach to dealing with assets links embeded in the page
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
    runtime: "server",  // the generated config will be used by the app
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
    env: "production",
    secure: "true",     // might come from req.protocol === "https"
});
// {
//     apiURL: 'http://api.mysite.com/',
//     assetURL: 'https://cdn.provider.com/mysite/'
// }
```



Source Object Format <a name="source"></a>
--------------------
TODO
describe `__context`, etc
special keys don't need to be quoted in yaml



API Reference <a name="api"></a>
-------------

### `Config(source, options)` constructor <a name="constructor"></a>
This creates a new bigfig object, on which you can call `read()` multiple
times with different contexts.

* `source` {Object} the source of the configuration, as describe in [Source
  Object Format](#source) above
* `options` {Object} an optional object containing settings used to tweak how
  the source is interpretted

There currently are no defined options.


### `Config.read(context, options)` method <a name="read"></a>
Creates a config object, customized to the specified context.

* `context` {Object} a simple object with dimension names and values
* `options` {Object} an optional object containing settings used to tweak how
  the config object is created

There currently are no defined options.


### `Config.match(context, options)` method <a name="match"></a>
This lower-level method isn't normally called. It returns all sections which
match the context.

* `context` {Object} a simple object with dimension names and values
* `options` {Object} an optional object containing settings used to tweak how
  the sections are matched
* returns {Array} an array of config objects to merge

There currently are no defined options.


### `Config.merge(sections, options)` method <a name="merge"></a>
This lower-level method isn't normally called. It merges the sections into a
configuration object.

* `sections` {Array} an array of config objects to merge
* `options` {Object} an optional object containing settings used to tweak how
  the configs are merged
* returns {Object} a config object

There currently are no defined options.


### `matcher(sectionContext, runContext, options)` <a name="matcher"></a>
The default match algorithm. See "Customizing the Match Algorithm" below for
details on how to replace this with your own algorithm.

* `sectionContext` {Object} the context generated from the `__context?` keys
  in the source
* `runContext` {Object} the context passed to `read()` or `match()`
* returns {Boolean} true if `runContext` matches `sectionContext`


### `cloner(oldObject)` <a name="cloner"></a>
This is a low-level utility for cloning an object. You usually don't need to
call this or overrride this.

* `oldObject` {Object} the object to clone
* returns {Object} a copy of the object


### `merger(to, from, options)` <a name="merger"></a>
The default merge algorithm. See "Customizing the Merge Algorithm" below for
details on how to replace this with your own algorithm.

* `to` {Object} object into which the keys and values of `from` are
  recursively merged
* `from` {Object} object which contains changes to apply to `to`
* returns {Object} the modified `to` object



Customizing the Merge Algorithm <a name="custom-merge"></a>
-------------------------------
TODO



Customizing the Match Algorithm <a name="custom-match"></a>
-------------------------------
TODO



Optimizing Usage <a name="optimizing"></a>
----------------
TODO



Roadmap and Ideas <a name="ideas"></a>
-----------------
Some features that might be nice to have some day.

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
MIT License

Copyright (c) 2015, Yahoo! Inc. All rights reserved.

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



