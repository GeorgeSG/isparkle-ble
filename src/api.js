const Koa = require("koa");
const body = require("koa-body");
const cors = require("koa2-cors");
const logger = require("koa-logger");
const Router = require("@koa/router");
const iSparkleBle = require("./lib/isparkle-ble");

const app = new Koa();
const router = new Router();
const bleSerial = new iSparkleBle();

const PORT = process.env.PORT || "1338";
const HOST = process.env.HOST || "0.0.0.0";

// Start ble
bleSerial.debug = true;

let radioStatus = "";
let bleConnected = false;

bleSerial.on("scanning", (status) => {
  console.log(`bt radio status: ${status}`);
  radioStatus = status;
});

bleSerial.on("connected", (val) => {
  console.log(`connected to: ${bleSerial.peripheral.advertisement.localName}`);
  bleConnected = val;
});

bleSerial.on("data", (data) => console.log(`data: ${String(data)}`));

// app router
router.get("/status", (ctx) => {
  ctx.body = { radioStatus, bleConnected };
});

function setError(ctx, message) {
  ctx.status = 401;
  ctx.body = { error: { message } };
}

const ensureBleConnected = (ctx, next) => {
  if (bleConnected) {
    return next();
  } else {
    setError(ctx, "BLE not connected");
  }
};

router.post("/off", ensureBleConnected, (ctx) => {
  bleSerial.sendCmd(["off"]);
  ctx.body = { status: "success" };
});

router.post("/on", ensureBleConnected, (ctx) => {
  bleSerial.sendCmd(["on"]);
  ctx.body = { status: "success" };
});

router.post("/fade", ensureBleConnected, (ctx) => {
  const { color, fadeInTime, fadeOutTime } = ctx.request.body;

  try {
    bleSerial.setFade(color, fadeInTime, fadeOutTime);
    ctx.body = { status: "success" };
  } catch (e) {
    console.error(e);
    setError(ctx, "Error");
  }
});

router.post("/set", ensureBleConnected, (ctx) => {
  const { color, fn, brightness1, timing1, brightness2, timing2 } = ctx.request.body;

  try {
    bleSerial.setState(color, fn, brightness1, timing1, brightness2, timing2);
    ctx.body = { status: "success" };
  } catch (e) {
    console.error(e);
    setError(ctx, "Error");
  }
});

router.post("/cmd", ensureBleConnected, (ctx) => {
  if (!ctx.request.body.cmd) {
    setError(ctx, "cmd parameter required");
    return;
  }

  bleSerial.sendCmd(ctx.request.body.cmd.split(","));
  ctx.body = ctx.request.body;
});

// setup app
app.use(body());
app.use(cors({ origin: "*" }));
app.use(logger());

app.use(router.routes());
app.use(router.allowedMethods());

// Start server
app.listen(PORT, HOST);
