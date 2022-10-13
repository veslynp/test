'use strict';

const port = '3001';
const app = require("./app");

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
