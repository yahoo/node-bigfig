var LIBS = {
        qs: require('querystring'),
    },
    ME = module.exports;


function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}


function matcher(sectionContext, runContext, options) {
    var keys = Object.keys(sectionContext),
        k, key;
    for (k = 0; k < keys.length; k++) {
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
        i;
    if (typeof oldO !== 'object') {
        return oldO;
    }
    if (!oldO) {
        return oldO;
    }
    if (Array.isArray(oldO)) {
        newO = [];
        for (i = 0; i < oldO.length; i += 1) {
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


// turns source into a list of {context, config} sections
// preserved semantic order found in source
function sectionsFromSource(source, options) {
    var sections = [],
        root = {};

    Object.keys(source).forEach(function(key) {
        // IDEA -- custom special key prefix
        if ('__context?' === key.substr(0, 10)) {
            sections.push({
                context: LIBS.qs.parse(key.substr(10)),
                config: source[key]
            });
        }
        else {
            root[key] = source[key];
        }
    });
    sections.unshift({
        context: {},
        config: root
    });

    // TODO -- refactor deeply hierarchical configs
    return sections;
}


function Config(source, options) {
    if (!isObject(source) || Array.isArray(source)) {
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
            s,
            len = sections.length;
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


