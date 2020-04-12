import { stringifyRequest } from 'loader-utils';
import { loader as WebpackLoader } from 'webpack';


const loader: WebpackLoader.Loader = function() {};

const pitchLoader: WebpackLoader.Loader['pitch'] = function(this: WebpackLoader.LoaderContext, remainingRequest, precedingRequest) {
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
