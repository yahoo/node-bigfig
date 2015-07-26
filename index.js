var LIBS = {
        qs: require('querystring'),
    },
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


function objectClone(oldO) {
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
            newO[i] = ME.objectClone(oldO[i]);
        }
        return newO;
    }
    newO = {};
    for (i in oldO) {
        /* istanbul ignore else hasOwnProperty in loop */
        if (oldO.hasOwnProperty(i)) {
            newO[i] = ME.objectClone(oldO[i]);
        }
    }
    return newO;
}


function objectMerge(to, from, options) {
    var key;
    for (key in from) {
        /* istanbul ignore else hasOwnProperty in loop */
        if (from.hasOwnProperty(key)) {
            if (to.hasOwnProperty(key)) {
                if (from[key] && isObject(from[key])) {
                    // exists in destination -- merge
                    to[key] = ME.objectMerge(to[key], from[key], options);
                } else {
                    // exists in destination -- clobber
                    to[key] = from[key];
                }
            } else {
                // doesn't exists in destination -- create
                to[key] = from[key];
            }
        }
    }
    return to;
}


// This is the heart of the complexity of this library.
// This recursive function takes a source and returns a list of sections, each
// section containing a context and the configuration to use for that context.
function sectionsFromSource(source, options, context) {
    var sections = [],
        subContext,
        root = {};  // configuration which isn't further contextualized

    Object.keys(source).forEach(function(key) {
        var val = source[key],
            subSections;

        if ('__context?' === key.substr(0, 10)) {
            subContext = {};
            objectMerge(subContext, context);
            objectMerge(subContext, LIBS.qs.parse(key.substr(10)));
            subSections = sectionsFromSource(val, options, subContext);

            // Optimize away a nested object which was just used to hold child contexts.
            val = subSections[0].config;    // the first is the "root"
            if (subSections.length > 1 && isObject(val) && Object.keys(val).length === 0) {
                subSections.shift();
            }
        }
        else {
            if (isObject(val)) {
                subSections = sectionsFromSource(val, options, context);
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
    this.sections = sectionsFromSource(source, this.options, {});
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
            ME.objectMerge(config, ME.objectClone(sections[s]), options);
        }
        return config;
    },

};


ME.Config = Config;
ME.matcher = matcher;
ME.objectClone = objectClone;
ME.objectMerge = objectMerge;

// mainly for testing
ME.TEST = {
    LIBS: LIBS,
    sectionsFromSource: sectionsFromSource,
};


