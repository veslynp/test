'use strict';

const express = require('express')
const {
  v4: uuidv4,
} = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require("multer");
const glob = require("glob");
const AdmZip = require("adm-zip");
const gm = require("gm");



const app = express()
const hostname = 'https://assessement.onrender.com/';
app.mkdir = function(dir) {
  !fs.existsSync(dir) && fs.mkdirSync(dir);
}

app.iniDirectories = async function() {
  app.mkdir(path.join(__dirname, 'public'));
  app.mkdir(path.join(__dirname, 'public', 'images'));
  app.mkdir(path.join(__dirname, 'public', 'upload'));
}
app.iniDirectories();

const handleError = (err, res, fn) => {
  console.log('handle error', err);
  if(fn) {
    fn();
  }
  res
    .status(500)
    .contentType('application/json')
    .end(JSON.stringify({ err: err }));
};

app.use(express.static('public'))

const upload = multer({
  dest: "public/upload/"
});

const uploadImage = (req, res) => {
  const tempPath = req.file.path;
  const curFileExt = path.extname(req.file.originalname).toLowerCase();
  const newFileName = uuidv4() + curFileExt;
  const targetPath = path.join(__dirname, 'public','images', newFileName);
  const newUrl = hostname + 'images/' + newFileName;

  if ( /\.(jpe?g|png|gif|bmp|webp)$/i.test(curFileExt) ) {
    try {
      fs.promises.rename(tempPath, targetPath);
    } catch (err) {
      return {err: err}
    }
    return { image: newUrl, path: targetPath };
  } else {
    try {
      fs.promises.unlink(tempPath);
    } catch (err) {
      return {err: err}
    }
    return {err: 'File isn\' an image'}
  }

}

app.post(
  "/api/image",
  upload.single("file"),
  (req, res) => {
    const result = uploadImage(req, res);
    if(result.image) {
      res
        .status(200)
        .contentType('application/json')
        .end(JSON.stringify({ image: result.image }));

    } else {
      handleError(result.err, res);
    }
  }
);

app.post(
  "/api/zip",
  upload.single("file"),
  (req, res) => {
    const tempPath = req.file.path;
    const curFileExt = path.extname(req.file.originalname).toLowerCase();

    const tmpPath = path.join(__dirname, 'tmp');

    const cleanup = function() {
      fs.rmSync(tmpPath, { recursive: true, force: true });
      const uploadFolder = path.join(__dirname, 'public', 'upload');
      fs.readdirSync(uploadFolder).forEach(f => fs.rmSync(`${uploadFolder}/${f}`));
    }

    if ( /\.(zip)$/i.test(curFileExt) ) {
      try {
        app.mkdir(tmpPath);
        var zip = new AdmZip(tempPath);
        zip.extractAllTo(tmpPath, true);
        try {
          const getDirectories = function (src, callback) {
            glob(src + '/**/*', callback);
          };
          getDirectories(tmpPath, function (err, result) {
            if (err) return handleError(err.toString(), res, cleanup);
            else {
              let hasImage = [];
              for(let imagePath of result) {
                const curImageExt = path.extname(imagePath).toLowerCase();
                const newFileName = uuidv4() + curImageExt;
                const targetPath = path.join(__dirname, 'public','images', newFileName);
                const newUrl = hostname + 'images/' + newFileName;
                if ( /\.(jpe?g|png|gif|bmp|webp)$/i.test(curImageExt) ) {
                  hasImage.push(newUrl);
                  fs.rename(imagePath, targetPath, err => {
                    if (err) return handleError(err.toString(), res);
                  });
                }
              }

              if(hasImage.length == 0) {
                return handleError("no image found in zip file", res, cleanup);
              } else {
                cleanup();
                res
                  .status(200)
                  .contentType('application/json')
                  .end(JSON.stringify({ images: hasImage }));
              }
            }
          });
        }
        catch (err) {
          return handleError(err.toString(), res, cleanup);
        }


      }
      catch (err){
        // handle error
        return handleError(err.toString(), res);
      }
    } else {
      fs.unlink(tempPath, err => {
        if (err) return handleError(err.toString(), res);

        res
          .status(403)
          .contentType('application/json')
          .end(JSON.stringify({ err: 'File isn\' a zip' }));
      });
    }
  }
);

app.post(
  "/api/resize",
  upload.single("file"),
  (req, res) => {
    const result = uploadImage(req, res);
    if(result.image) {
      let newResult = {
        images: [result.image]
      }
      gm(result.path).size((err, size) => {
        if(err)
          handleError(err.toString(), res);
        if(size.width > 128 || size.height > 128) {
          let fileName = path.basename(result.path).toLowerCase();
          let newFileName = '32_' + fileName;
          let newUrl = hostname + 'images/' + newFileName;
          let newPath = path.join(__dirname, 'public','images', newFileName);
          gm(result.path).resize(32).write(newPath, function (err) {
            if(err)
              handleError(err.toString(), res);
            newResult.images.push(newUrl);
            fileName = path.basename(result.path).toLowerCase();
            newFileName = '64_' + fileName;
            newUrl = hostname + 'images/' + newFileName;
            newPath = path.join(__dirname, 'public','images', newFileName);
            gm(result.path).resize(64).write(newPath, function (err) {
              if(err)
                handleError(err.toString(), res);
              newResult.images.push(newUrl);
              res
                .status(200)
                .contentType('application/json')
                .end(JSON.stringify(newResult));

            });
          });


        } else {
          res
            .status(200)
            .contentType('application/json')
            .end(JSON.stringify({ images: [result.image] }));

        }
      })

    } else {
      handleError(result.err, res);
    }
  }
);


module.exports = app;
