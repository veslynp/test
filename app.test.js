const request = require("supertest");
const path = require('path');
const fs = require('fs');

const app = require("./app");

// unit test starts
describe("Unit test utility functions", () => {
  test("mkdir should create the directory", () => {
    const dir = path.join(__dirname, 'tmp');
    app.mkdir(dir);
    const hasTmpFolder = fs.existsSync(dir);

    expect(hasTmpFolder).toEqual(true);
  });

  test("initDirectories should initialize all directories", () => {
    app.iniDirectories();
    let dir = path.join(__dirname, 'public');
    let  hasFolder = fs.existsSync(dir);
    expect(hasFolder).toEqual(true);

    dir = path.join(__dirname, 'public', 'images');
    hasFolder = fs.existsSync(dir);
    expect(hasFolder).toEqual(true);

    dir = path.join(__dirname, 'public', 'upload');
    hasFolder = fs.existsSync(dir);
    expect(hasFolder).toEqual(true);
  });

});

// unit test end

// integration test starts
describe("Test Image API - Story 1", () => {
  test("It should response 200 and a json response of the image url", async () => {
    const response = await request(app)
      .post("/api/image")
      .attach('file', 'test/file/image.webp');

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.text)).toHaveProperty('image');
  });
});

describe("Fail Image API - Story 1", () => {
  test("It should response 500 and a json response error", async () => {
    const response = await request(app)
      .post("/api/image")
      .attach('file', 'test/file/file.zip');

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.text)).toHaveProperty('err');
  });
});

describe("Test Zip API - Story 2", () => {
  test("It should response 200 and a json response of the image url", async () => {
    const response = await request(app)
      .post("/api/zip")
      .attach('file', 'test/file/file.zip');

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.text)).toHaveProperty('images');
  });
});

describe("Fail Zip API - Story 2", () => {
  test("It should response 403 and a json response error", async () => {
    const response = await request(app)
      .post("/api/zip")
      .attach('file', 'test/file/image.webp');

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.text)).toHaveProperty('err');
  });
});

describe("Test Resize API - Story 2.2", () => {
  test("Big image test should response 200 and return json object with 3 images", async () => {
    const response = await request(app)
      .post("/api/resize")
      .attach('file', 'test/file/big.jpeg');

    const results = JSON.parse(response.text);
    expect(response.statusCode).toBe(200);
    expect(results).toHaveProperty('images');
    expect(results.images.length).toEqual(3);
  });

  test("small image test should response 200 and return json object with 1 image", async () => {
    const response = await request(app)
      .post("/api/resize")
      .attach('file', 'test/file/small.jpeg');

    const results = JSON.parse(response.text);
    expect(response.statusCode).toBe(200);
    expect(results).toHaveProperty('images');
    expect(results.images.length).toEqual(1);
  });

});

describe("Fail Resize API - Story 2.2", () => {
  test("It should response 500 and a json response error", async () => {
    const response = await request(app)
      .post("/api/resize")
      .attach('file', 'test/file/file.zip');

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.text)).toHaveProperty('err');
  });
});


// integration test end

