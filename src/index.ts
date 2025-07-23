export * from './nest-zod-swagger';
export * from './nest-zod-validation';

// TODO: allow options to specify dot or [] object notation in query
// bug: is not registering schemas properly (appears in type and validation, but not components[schema][x] is missing object in json) - perhaps related to being named AugmentedZodDto