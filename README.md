# Sentry Sample

This sample shows how to configure [Sentry](https://sentry.io) to intercept and capture errors from the Temporal SDK.

To run, first see [README.md](../README.md) for prerequisites. Set SENTRY_DSN environment variable to the Sentry DSN. Then, run the following from this directory to start the worker:

```sh
npm run start.watch
```
This will start the worker. Then, in another terminal, run the following to execute the workflow:

```sh
npm run workflow
```

The workflow should complete with the hello result. If you alter the workflow or the activity to raise an ApplicationError instead, it should appear in Sentry.

Shoutout to @TimDiekmann for bulding out for Hash.

### Notes

> Why do you have an activity to create the span workflow vs doing in the workflow interceptor?

Creating the span, within the workflow interceptor, was my first apporach. I realize if I wanted to do distributed tracing / have the activity fall under the workflow span, I need to pass around the trace and baggage header as part of the activity call.
