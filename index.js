

var LIBS = {
        hoek:   require('hoek'),
        qs:     require('querystring'),
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


// returns a new object with `b` overlayed `a`
function merger(a, b, options) {
    return LIBS.hoek.applyToDefaults(a, b, true);
}


// turns raw into a list [ [context,config], ... ]
function sectionsFromRaw(raw, options) {
    var sections = [],
        root = {};

    Object.keys(raw).forEach(function(key) {
        if ('__context?' === key.substr(0, 10)) {
            sections.push([
                LIBS.qs.parse(key.substr(10)),
                raw[key]
            ]);
        }
        else {
            root[key] = raw[key];
        }
    });
    sections.unshift([ {}, root ]);

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
        var configs = [];
        this.sections.forEach(function(section) {
            var configContext = section[0],
                config = section[1];
            if (ME.matcher(configContext, context, options)) {
                configs.push(config);
            }
        });
        // FUTURE -- sort configs based on some criteria of tightness of match
        return configs;
    },

    merge: function merge(sections, options) {
        return sections.reduce(function(config, section) {
            return ME.merger(config, section, options);
        }, {});
    },

};


ME.matcher = matcher;
ME.merger = merger;
ME.Config = Config;

// mainly for testing
ME.TEST = {
    LIBS: LIBS,
    sectionsFromRaw: sectionsFromRaw,
};


