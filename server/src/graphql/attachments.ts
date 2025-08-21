import { GraphQLUpload } from 'graphql-upload-ts';
import { AttachmentService } from '../services/AttachmentService';
import type { Readable } from 'stream';

const service = new AttachmentService();

export const attachmentTypeDefs = `#graphql
  scalar Upload
  type AttachmentMeta {
    filename: String!
    mimeType: String!
    size: Int!
    sha256: String!
  }
  type Mutation {
    uploadAttachment(file: Upload!): AttachmentMeta!
  }
`;

export const attachmentResolvers = {
  Upload: GraphQLUpload,
  Mutation: {
    async uploadAttachment(_: unknown, { file }: { file: Promise<any> }) {
      const upload = await file;
      const stream: Readable = upload.createReadStream();
      const meta = await service.save(stream, {
        filename: upload.filename,
        mimeType: upload.mimetype,
      });
      return {
        filename: meta.filename,
        mimeType: meta.mimeType,
        size: meta.size,
        sha256: meta.sha256,
      };
    },
  },
};
