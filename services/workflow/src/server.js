import { createApp } from './index.js';

const app = createApp();
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`workflow service on ${port}`));
