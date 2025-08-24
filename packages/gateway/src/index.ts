import { createServer } from './schema';

const port = process.env.PORT || 4000;
createServer().then(app => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`gateway running on ${port}`);
  });
});
