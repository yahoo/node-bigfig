var LIBS = {
        qs: require('querystring'),
    },
    ME = module.exports;


function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}


function matcher(configContext, runContext, options) {
    var keys = Object.keys(configContext),
        k, key;
    for (k = 0; k < keys.length; k++) {
        key = keys[k];
        // FUTURE -- dimension value hierarchy
        if (configContext[key] !== runContext[key]) {
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


function objectMerge(from, to, options) {
    var key;
    for (key in from) {
        /* istanbul ignore else hasOwnProperty in loop */
        if (from.hasOwnProperty(key)) {
            if (to.hasOwnProperty(key)) {
                if (from[key] && isObject(from[key])) {
                    // exists in destination -- merge
                    to[key] = ME.objectMerge(from[key], to[key], options);
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


// turns raw into a list [ [context,config], ... ]
function sectionsFromRaw(raw, options) {
    var sections = [],
        root = {};

    Object.keys(raw).forEach(function(key) {
        if ('__context?' === key.substr(0, 10)) {
            sections.push({
                context: LIBS.qs.parse(key.substr(10)),
                config: raw[key]
            });
        }
        else {
            root[key] = raw[key];
        }
    });
    sections.unshift({
        context: {},
        config: root
    });

    // FUTURE -- refactor deeply hierarchical configs
    return sections;
}


function Config(raw, options) {
    if (!isObject(raw) || Array.isArray(raw)) {
        throw new Error('bigfig only supports object configs');
    }
    this.options = options || {};
    this.sections = sectionsFromRaw(raw, this.options);
}
Config.prototype = {

    contextualize: function contextualize(context, options) {
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
        // FUTURE optional feature -- sort configs based on some criteria of tightness of match
        return configs;
    },

    merge: function merge(sections, options) {
        var config = {},
            s,
            len = sections.length;
        for (s = 0; s < len; s++) {
            ME.objectMerge(ME.objectClone(sections[s]), config, options);
        }
        return config;
    },

};


ME.matcher = matcher;
ME.objectClone = objectClone;
ME.objectMerge = objectMerge;
ME.Config = Config;

// mainly for testing
ME.TEST = {
    LIBS: LIBS,
    sectionsFromRaw: sectionsFromRaw,
};


