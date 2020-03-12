// @ts-check
const { stringifyRequest } = require('loader-utils');


/**
 * @type {import('webpack').loader.Loader}
 */
const loader = function() {};

/**
 * @type {import('webpack').loader.Loader['pitch']}
 * @this {import('webpack').loader.LoaderContext}
 */
const pitchLoader = function(remainingRequest, precedingRequest) {
  return (
  // eslint-disable-next-line @typescript-eslint/indent
`
import { css as cssTemplate, unsafeCSS } from 'lit-element';
import info from ${stringifyRequest(this, `!!${precedingRequest}!${remainingRequest}`)};

export const css = cssTemplate\`\${unsafeCSS(info.toString())}\`;

export const classes = info.locals;
`);
};

loader.pitch = pitchLoader;

module.exports = loader;
