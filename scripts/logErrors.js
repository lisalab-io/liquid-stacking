import { setUncaughtExceptionCaptureCallback } from 'node:process';
setUncaughtExceptionCaptureCallback(err => {
  console.error(err);
  process.exit(1);
});
