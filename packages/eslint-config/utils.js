// @ts-check

/**
 * @param {string} ruleName
 * @param {object} config
 * @returns {any}
 */
const findRule = (ruleName, config) => {
  let rule;

  if (config.rules !== undefined && (rule = config.rules[ruleName]) !== undefined) {
    return rule;
  }

  if (config.extends !== undefined) {
    for (const extend of Array.isArray(config.extends) ? config.extends.slice().reverse() : [config.extends]) {
      let baseConfig;
      try {
        baseConfig = require(extend);
      } catch (err) {
        if (typeof err === 'object' && err !== null && err.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Failed to require ${extend}`);
        }
        throw err;
      }
      if ((rule = findRule(ruleName, baseConfig)) !== undefined) {
        return rule;
      }
    }
  }

  return undefined;
};

/**
 * @param {object} baseConfig
 */
const createExtendRule = (baseConfig) => {
  /**
   * @param {string} ruleName
   * @param {(baseRule: any) => string | readonly [string, ...ReadonlyArray<any>]} func
   * @returns {string | readonly [string, ...ReadonlyArray<any>]}
   */
  const extendRule = (ruleName, func) => {
    const baseRule = findRule(ruleName, baseConfig);
    if (baseRule === undefined) {
      throw new Error(`Failed to find rule ${ruleName}`);
    }
    return func(baseRule);
  };
  return extendRule;
};


module.exports = {
  findRule,
  createExtendRule
};
