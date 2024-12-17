function requestLogger(httpModule: any) {
  var original = httpModule.request;
  httpModule.request = function (options: any, callback: any) {
    console.log(
      (options.href || options.proto) + "://" + options.host + options.path,
      options.method,
    );
    return original(options, callback);
  };
}
export const logOutgoingHttpRequests = (enable: boolean) => {
  if (!enable) return;
  requestLogger(require("http"));
  requestLogger(require("https"));
};
