const express = require("express");
const app = express();

const responseSuccessBody = { well: "done" };

// No CORS support at all
app.get("/fetchNoCorsSupport", function (req, res) {
  res.send(responseSuccessBody);
});

// CORS support only for simple requests, via response header Access-Control-Allow-Origin set to a wildcard
app.get("/fetchCorsSupportLimitedToSimpleRequestViaWildcardOrigin", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": "*",
  });
  res.status(200).send(responseSuccessBody);
});

// CORS support only for simple requests, via response header Access-Control-Allow-Origin set to the origin where the request issuing script is hosted
app.get("/fetchCorsSupportLimitedToSimpleRequestViaSpecificOrigin", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
  });
  res.status(200).send(responseSuccessBody);
});

// Full CORS support
app.options("/fetchCorsFullSupport", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
    "Access-Control-Allow-Methods": req.headers["access-control-request-method"],
    "Access-Control-Allow-Headers": req.headers["access-control-request-headers"],
  });
  res.status(204).send();
});
app.get("/fetchCorsFullSupport", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
  });
  res.status(200).send(responseSuccessBody);
});
app.patch("/fetchCorsFullSupport", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
  });
  res.status(200).send(responseSuccessBody);
});

// Full CORS support, but responds with non 2xx status code on preflight
app.options("/fetchCorsFullSupportNonOkStatusCodeInPreflight", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
    "Access-Control-Allow-Methods": req.headers["access-control-request-method"],
    "Access-Control-Allow-Headers": req.headers["access-control-request-headers"],
  });
  res.status(403).send();
});
app.patch("/fetchCorsFullSupportNonOkStatusCodeInPreflight", function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
  });
  res.status(200).send(responseSuccessBody);
});

// Full CORS support with latency
app.options("/fetchCorsFullSupportWithLatency", async function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
    "Access-Control-Allow-Methods": req.headers["access-control-request-method"],
    "Access-Control-Allow-Headers": req.headers["access-control-request-headers"],
  });
  await new Promise((resolve) => {
    setTimeout(() => resolve(res.status(204).send()), 3000);
  });
});
app.get("/fetchCorsFullSupportWithLatency", async function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
  });
  await new Promise((resolve) => {
    setTimeout(() => resolve(res.status(200).send(responseSuccessBody)), 3000);
  });
});
app.patch("/fetchCorsFullSupportWithLatency", async function (req, res) {
  res.set({
    "Access-Control-Allow-Origin": req.headers.origin,
  });
  await new Promise((resolve) => {
    setTimeout(() => resolve(res.status(200).send(responseSuccessBody)), 3000);
  });
});

app.listen(4000);
