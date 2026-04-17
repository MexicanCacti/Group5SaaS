const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const errorHTML = `
<!DOCTYPE html>
<html>
  <head><title>Error</title></head>
  <body>
    <h1>Error uploading/processing</h1>
    <a href="/">Try again</a>
  </body>
</html>
`

function formatNumber(number, places) {
    return number.toFixed(places);
}

function formatLabels(labels) {
    if(!labels || labels.length === 0) {
        return `<li>No labels found</li>`;
    }

    return labels.map(label => {
        const description = (label.description || 'Unknown');
        const score = (formatNumber(label.score, 5) || 'Unknown');
        const topicality = (formatNumber(label.topicality, 5) || 'Unknown');
        const mid = (label.mid || 'Unknown');
        const locale = (label.locale || 'Unknown');
        const confidence = (formatNumber(label.confidence, 2) || 'Unknown');
        const locations = (label.locations || []);
        const properties = (label.properties || []);
        const boundingPoly = (label.boundingPoly || {});

        return `<li>
            Description: ${description}<br>
            Score: ${score}<br>
            Topicality: ${topicality}<br>
            Mid: ${mid}<br>
            Locale: ${locale}<br>
            Confidence: ${confidence}<br>
            Locations: ${locations.join(', ')}<br>
            Properties: ${properties.join(', ')}<br>
            Bounding Poly: ${JSON.stringify(boundingPoly)}<br>
        </li>`;
    }).join('');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/form.html'));
});

app.post('/upload', multer().single('image'), async(req, res) => {
  if(!req.file) {
    return res.status(400).send(errorHTML);
  }
  
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).send(errorHTML);
  }

  const [result] = await client.labelDetection(req.file.buffer);
  const labels = result.labelAnnotations;
  const formattedLabels = formatLabels(labels);

  const image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const html = `
  <!DOCTYPE html>
  <html>
    <head><title>Image Processing Results</title></head>
    <body>
      <h1>Detected Labels</h1>
      <img src="${image}" alt="Uploaded Image" style="max-width:50%; max-height:50%;">
      <ul>${formattedLabels}</ul>
      <button onclick="window.location.href='/';">Upload New Image</button>
    </body>
  <html>
  `;

  return res.send(html);
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});