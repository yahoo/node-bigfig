

var LIBS = {
        hoek:   require('hoek'),
        qs:     require('querystring'),
    },
    DIM_SEPARATOR = '&',
    VALUE_DEFAULT = '*',
    ME = module.exports;


function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}


function MatcherSimple(contexts, options) {
    // nothing to do
}
MatcherSimple.prototype = {
    tokenizeSectionContext: function(sectionContext, options) {
        // match() will operate on the context directly
        return sectionContext;
    },
    tokenizeRunContext: function(runContext, options) {
        // match() will operate on the context directly
        return runContext;
    },
    match: function(sectionToken, runToken, options) {
        var keys = Object.keys(sectionToken),
            k, key;
        for (k = 0; k < keys.length; k++) {
            key = keys[k];
            // FUTURE optional feature -- dimension value hierarchy
            if (sectionToken[key] !== runToken[key]) {
                return false;
            }
        }
        return true;
    }
};


function MatcherCrazy(contexts, options) {
    var self = this,
        dimNames = {};
    this.dimNames = []; // order should be consistent (but otherwise doesn't matter)
    contexts.forEach(function(context) {
        Object.keys(context).forEach(function(dimName) {
            dimNames[dimName] = true;
        });
    });
    this.dimNames = Object.keys(dimNames).sort();
}
MatcherCrazy.prototype = {
    tokenizeSectionContext: function(sectionContext, options) {
        var token = [];
        this.dimNames.forEach(function(dimName) {
            token.push(sectionContext[dimName] || VALUE_DEFAULT);
        });
        return token.join(DIM_SEPARATOR);
    },

    tokenizeRunContext: function(runContext, options) {
        var self = this,
            dimIdx,
            len = this.dimNames.length,
            dimName,
            vals,
            values = [],    // dimIdx: valIdx: value
            maxes = [],     // dimIdx: max index
            indexes = [],   // dimIdx: valIdx (the current combination)
            count = 1,      // number of match tokens we'll make
            currIdx,
            ctx,
            carryIdx;
            matches = {};   // sectionToken: true

        for (dimIdx = 0; dimIdx < len; dimIdx++) {
            dimName = this.dimNames[dimIdx];
            // FUTURE optional feature -- dimension value hierarchy
            vals = [];
            if (runContext[dimName]) {
                vals.push(runContext[dimName]);
            }
            vals.push(VALUE_DEFAULT);
            count *= vals.length;
            values[dimIdx] = vals;
            maxes[dimIdx] = vals.length;
            indexes[dimIdx] = vals.length - 1;
        }

        currIdx = 0;
        while (count--) {
            ctx = [];
            for (dimIdx = 0; dimIdx < this.dimNames.length; dimIdx++) {
                ctx.push(values[dimIdx][indexes[dimIdx]]);
            }
            token = ctx.join(DIM_SEPARATOR);
            matches[token] = true;

            indexes[currIdx]--;
            if (count && indexes[currIdx] === -1) {
                carryIdx = currIdx + 1;
                indexes[carryIdx]--;
                while (indexes[carryIdx] === -1) {
                    carryIdx++;
                    indexes[carryIdx]--;
                }
                currIdx = carryIdx - 1;
                while (currIdx >= 0) {
                    indexes[currIdx] = maxes[currIdx] - 1;
                    currIdx--;
                }
                currIdx = 0;
            }
        }

        return matches;
    },

    match: function(sectionToken, runToken, options) {
        return runToken[sectionToken];
    }
};


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
            newO[i] = objectClone(oldO[i]);
        }
        return newO;
    }
    newO = {};
    for (i in oldO) {
        if (oldO.hasOwnProperty(i)) {
            newO[i] = objectClone(oldO[i]);
        }
    }
    return newO;
}


function objectMerge(from, to, options) {
    var key;
    for (key in from) {
        if (from.hasOwnProperty(key)) {
            if (to.hasOwnProperty(key)) {
                if (from[key] && from[key].constructor === Object) {
                    // exists in destination -- merge
                    to[key] = objectMerge(from[key], to[key], options);
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


// returns a new object with `b` overlayed `a`
function merger(a, b, options) {
    // FUTURE -- this could be optimized more
    var out = objectClone(a);
    objectMerge(b, out, options);
    return out;
    // the above is MUCH faster than hoek
    //return LIBS.hoek.applyToDefaults(a, b, true);
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
    var contexts = [],
        matcher;
    if (!isObject(raw) || Array.isArray(raw)) {
        throw new Error('bigfig only supports object configs');
    }
    this.options = options || {};
    this.sections = sectionsFromRaw(raw, this.options);
    contexts = this.sections.map(function(section) {
        return section.context;
    });
    matcher = new MatcherSimple(contexts);
    //matcher = new MatcherCrazy(contexts);
    this.sections.forEach(function(section) {
        section.token = matcher.tokenizeSectionContext(section.context, options);
    });
    this.matcher = matcher;
}
Config.prototype = {

    contextualize: function contextualize(context, options) {
        var sections = this.match(context, options);
        return this.merge(sections, options);
    },

    match: function match(context, options) {
        var matcher = this.matcher,
            s, len = this.sections.length,
            section,
            configs = [],
            runToken;
        runToken = this.matcher.tokenizeRunContext(context, options);
        for (s = 0; s < len; s++) {
            section = this.sections[s];
            if (matcher.match(section.token, runToken, options)) {
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
            objectMerge(objectClone(sections[s]), config, options);
        }
        return config;
    },

};


ME.MatcherSimple = MatcherSimple;
ME.MatcherCrazy = MatcherCrazy;
ME.matcher = matcher;
ME.merger = merger;
ME.Config = Config;

// mainly for testing
ME.TEST = {
    LIBS: LIBS,
    sectionsFromRaw: sectionsFromRaw,
};


