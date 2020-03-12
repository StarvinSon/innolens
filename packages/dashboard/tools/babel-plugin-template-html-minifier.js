// @ts-check
/**
 * Inspired by https://github.com/cfware/babel-plugin-template-html-minifier
 */

const Ajv = require('ajv');
const { minify } = require('html-minifier');


const ajv = new Ajv();

const validateConfig = ajv.compile({
  type: 'object',
  additionalProperties: false,
  properties: {
    tags: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'string'
      }
    },
    htmlMinifier: {
      type: 'object'
    }
  }
});

/**
 * @typedef {{
 *   readonly tags: ReadonlyArray<string>;
 *   readonly htmlMinifier: object;
 * }} UserConfig */

/**
 * @typedef {{
 *   readonly tags: ReadonlyArray<TagConfig>;
 *   readonly htmlMinifier: object;
 * }} Config */

/**
 * @typedef {{
 *   readonly type: 'thisMember';
 *   readonly identifier: string;
 * } | {
 *   readonly type: 'identifier';
 *   readonly identifier: string;
 * }} TagConfig
 */

/**
 * @param {import('@babel/core')} babel
 * @returns {import('@babel/core').PluginObj}
 */
module.exports = (babel) => {
  /** @type {UserConfig} */
  const defaultUserConfig = {
    tags: [],
    htmlMinifier: {}
  };

  /** @type {WeakMap<object, Config>} */
  const configCache = new WeakMap();

  /**
   * @param {string} strConfig
   * @returns {TagConfig}
   */
  const parseTagConfig = (strConfig) => {
    if (strConfig.startsWith('this.')) {
      return {
        type: 'thisMember',
        identifier: strConfig.slice('this.'.length)
      };
    }
    return {
      type: 'identifier',
      identifier: strConfig
    };
  };

  /**
   * @param {object} state
   * @returns {Config}
   */
  const getConfig = (state) => {
    let config = configCache.get(state);
    if (config !== undefined) {
      return config;
    }

    if (state !== undefined && !validateConfig(state)) {
      throw new Error(`Config validation failed: ${ajv.errorsText(validateConfig.errors, {
        dataVar: ''
      })}`);
    }
    const partialConfig = /** @type {UserConfig} */ (state);
    config = {
      tags: (partialConfig.tags || defaultUserConfig.tags).map(parseTagConfig),
      htmlMinifier: partialConfig.htmlMinifier || defaultUserConfig.htmlMinifier
    };
    configCache.set(state, config);
    return config;
  };

  return {
    visitor: {
      TaggedTemplateExpression: (path, state) => {
        const config = getConfig(state.opts);

        const tag = path.get('tag');
        const matchedTagConfig = config.tags.find((tagConfig) => {
          switch (tagConfig.type) {
            case 'thisMember': {
              if (!tag.isMemberExpression({ computed: false })) {
                return false;
              }
              const tagObject = tag.get('object');
              if (!tagObject.isThisExpression()) {
                return false;
              }
              const tagProperty = /** @type {import('@babel/core').NodePath<import('@babel/types').Expression>} */ (tag.get('property'));
              if (!tagProperty.isIdentifier({ name: tagConfig.identifier })) {
                return false;
              }
              return true;
            }
            case 'identifier': {
              if (!tag.isIdentifier({ name: tagConfig.identifier })) {
                return false;
              }
              return true;
            }
            default: {
              throw new Error('Unexpected tag config type');
            }
          }
        });
        if (matchedTagConfig === undefined) {
          return;
        }

        const tempElems = path.get('quasi').get('quasis');

        /** @type {string} */
        let placeHolder;
        do {
          placeHolder = `{{placeholder-${Math.random().toString().slice(2)}}}`;
        // eslint-disable-next-line no-loop-func
        } while (tempElems.some((te) => te.node.value.raw.includes(placeHolder)));

        const rawHtml = tempElems.map((te) => te.node.value.raw).join(placeHolder);

        const minifiedHtml = minify(rawHtml, config.htmlMinifier);
        const parts = minifiedHtml.split(placeHolder);
        if (parts.length !== tempElems.length) {
          throw new Error('Some part is removed');
        }

        for (let i = 0; i < parts.length; i += 1) {
          const tempElem = tempElems[i];
          const part = parts[i];
          tempElem.replaceWith(babel.types.templateElement(
            {
              raw: part,
              // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
              cooked: new Function(`return \`${part}\`;`)()
            },
            i === parts.length - 1
          ));
        }
        // console.log('---');
        // console.log(matchedTagConfig);
        // console.log(rawHtml);
        // console.log(minifiedHtml);
        // console.log('---');
      }
    }
  };
};
