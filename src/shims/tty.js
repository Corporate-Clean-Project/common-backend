/**
 * Minimal shim for the `tty` module.
 *
 * Cloudflare Workers doesn't support node:tty.
 * The `debug` package uses tty.isatty() to decide whether to colorize output.
 * We always return false (not a TTY) since Workers has no terminal.
 */
'use strict';

exports.isatty = function isatty() {
  return false;
};

exports.ReadStream = function ReadStream() {
  throw new Error('tty.ReadStream is not available in Cloudflare Workers');
};

exports.WriteStream = function WriteStream() {
  throw new Error('tty.WriteStream is not available in Cloudflare Workers');
};
