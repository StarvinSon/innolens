export const getTime = (): Date => process.env.TIME !== undefined
  ? new Date(process.env.TIME)
  : new Date();
