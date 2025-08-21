const Joi = require('joi');
const { v4: uuid } = require('uuid');

const jobs = new Map();

const startSchema = Joi.object({
  spec: Joi.object({
    source: Joi.object().required(),
    mapping: Joi.array()
      .items(
        Joi.object({
          source: Joi.string().required(),
          target: Joi.string().required(),
          maskingMode: Joi.string().optional(),
        }),
      )
      .required(),
    policyTags: Joi.array().items(Joi.string()).default([]),
  }).required(),
});

module.exports = {
  Mutation: {
    startIngest: async (_, args) => {
      const { value, error } = startSchema.validate(args);
      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        throw err;
      }
      const id = uuid();
      const job = { id, status: 'PENDING', metrics: null, lineageURI: null, policyFindings: [] };
      jobs.set(id, job);
      return job;
    },
    ingestStatus: async (_, { id }) => {
      return jobs.get(id) || null;
    },
  },
};
