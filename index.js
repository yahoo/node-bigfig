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


var // GLOBALS ARE ALL CAPS
    QS = require('querystring'),
    ME = module.exports;


function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}


function matcher(sectionContext, runContext, options) {
    var keys = Object.keys(sectionContext),
        k, len = keys.length,
        key;
    for (k = 0; k < len; k++) {
        key = keys[k];
        // IDEA -- dimension value hierarchy
        if (sectionContext[key] !== runContext[key]) {
            return false;
        }
    }
    return true;
}


function cloner(oldO) {
    var newO,
        i, len;
    if (typeof oldO !== 'object') {
        return oldO;
    }
    if (!oldO) {
        return oldO;
    }
    if (Array.isArray(oldO)) {
        newO = [];
        len = oldO.length;
        for (i = 0; i < len; i++) {
            newO[i] = ME.cloner(oldO[i]);
        }
        return newO;
    }
    newO = {};
    for (i in oldO) {
        /* istanbul ignore else hasOwnProperty in loop */
        if (oldO.hasOwnProperty(i)) {
            newO[i] = ME.cloner(oldO[i]);
        }
    }
    return newO;
}


function merger(base, changes, options) {
    var key;
    for (key in changes) {
        /* istanbul ignore else hasOwnProperty in loop */
        if (changes.hasOwnProperty(key)) {
            if (base.hasOwnProperty(key)) {
                if (changes[key] && isObject(changes[key])) {
                    // exists in destination -- merge
                    base[key] = ME.merger(base[key], changes[key], options);
                } else {
                    // exists in destination -- clobber
                    base[key] = ME.cloner(changes[key]);
                }
            } else {
                // doesn't exists in destination -- create
                base[key] = ME.cloner(changes[key]);
            }
        }
    }
    return base;
}


// This is the heart of the complexity of this library.
// This recursive function takes a source and returns a list of sections, each
// section containing a context and the configuration to use for that context.
function sectionsFromSource(source, options, context, debugPath) {
    var sections = [],
        subContext,
        root = {};  // configuration which isn't further contextualized
    context = context || {};
    debugPath = debugPath || [];

    Object.keys(source).forEach(function(key) {
        var val = source[key],
            keyContext,
            subSections;

        if ('__context?' === key.substr(0, 10)) {
            subContext = {};
            Object.keys(context).forEach(function(k) {
                subContext[k] = context[k];
            });
            keyContext = QS.parse(key.substr(10));
            Object.keys(keyContext).forEach(function(k) {
                if (subContext.hasOwnProperty(k) && subContext[k] != keyContext[k]) {
                    throw new Error(
                        'subsection redefines "' + k + '" in existing context: ' +
                        debugPath.concat([key]).join(' -> ')
                    );
                }
                subContext[k] = keyContext[k];
            });
            subSections = sectionsFromSource(val, options, subContext, debugPath.concat([key]));

            // Optimize away a nested object which was just used to hold child contexts.
            val = subSections[0].config;    // the first is the "root"
            if (subSections.length > 1 && isObject(val) && Object.keys(val).length === 0) {
                subSections.shift();
            }
        }
        else {
            if (isObject(val)) {
                subSections = sectionsFromSource(val, options, context, debugPath.concat([key]));
                val = subSections.shift().config;   // first is the "root"
                root[key] = val;

                // This is where we maintain the config path of context
                // sections found deep in the source.
                subSections.forEach(function(section) {
                    var config = {};
                    config[key] = section.config;
                    section.config = config;
                });
            }
            else {
                root[key] = val;
            }
        }

        // This is how we return a flattened list of sections.
        if (subSections && subSections.length) {
            sections = sections.concat(subSections);
        }
    });

    // Always add the "root" section since we rely on it in a couple places above.
    sections.unshift({
        context: context,
        config: root
    });

    return sections;
}


function Config(source, options) {
    if (!isObject(source)) {
        throw new Error('bigfig only supports object configs');
    }
    this.options = options || {};
    this.sections = sectionsFromSource(source, this.options);
}
Config.prototype = {

    read: function read(context, options) {
        var sections = this.match(context, options);
        return this.merge(sections, options);
    },

    match: function match(context, options) {
        var s, len = this.sections.length,
            section,
            configs = [];
        for (s = 0; s < len; s++) {
            section = this.sections[s];
            if (ME.matcher(section.context, context, options)) {
                configs.push(section.config);
            }
        }
        // IDEA -- sort configs based on some criteria of tightness of match
        return configs;
    },

    merge: function merge(sections, options) {
        var config = {},
            s, len = sections.length;
        for (s = 0; s < len; s++) {
            config = ME.merger(config, sections[s], options);
        }
        return config;
    },

};


ME.Config = Config;
ME.matcher = matcher;
ME.cloner = cloner;
ME.merger = merger;

// mainly for testing
ME.TEST = {
    sectionsFromSource: sectionsFromSource,
};


