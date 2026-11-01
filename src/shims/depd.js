/**
 * No-op replacement for the `depd` package.
 *
 * The real `depd` uses `new Function()` to wrap deprecated functions,
 * which is forbidden in Cloudflare Workers (V8 isolates disallow
 * code generation from strings). Since we're running in production,
 * deprecation warnings are unnecessary anyway.
 */
'use strict';

module.exports = function depd(namespace) {
  var deprecate = function deprecate(message) {
    // no-op — suppress deprecation warnings in Workers
  };

  deprecate.function = function wrapfunction(fn, message) {
    // Return the original function unwrapped (no new Function() needed)
    return fn;
  };

  deprecate.property = function wrapproperty(obj, prop, message) {
    // no-op
  };

  return deprecate;
};
