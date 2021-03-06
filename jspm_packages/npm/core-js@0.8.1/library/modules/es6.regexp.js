/* */ 
var $ = require("./$"),
    cof = require("./$.cof"),
    RegExp = $.g.RegExp,
    Base = RegExp,
    proto = RegExp.prototype;
if ($.FW && $.DESC) {
  if (!function() {
    try {
      return RegExp(/a/g, 'i') == '/a/i';
    } catch (e) {}
  }()) {
    RegExp = function RegExp(pattern, flags) {
      return new Base(cof(pattern) == 'RegExp' && flags !== undefined ? pattern.source : pattern, flags);
    };
    $.each.call($.getNames(Base), function(key) {
      key in RegExp || $.setDesc(RegExp, key, {
        configurable: true,
        get: function() {
          return Base[key];
        },
        set: function(it) {
          Base[key] = it;
        }
      });
    });
    proto.constructor = RegExp;
    RegExp.prototype = proto;
    $.hide($.g, 'RegExp', RegExp);
  }
  if (/./g.flags != 'g')
    $.setDesc(proto, 'flags', {
      configurable: true,
      get: require("./$.replacer")(/^.*\/(\w*)$/, '$1')
    });
}
require("./$.species")(RegExp);
