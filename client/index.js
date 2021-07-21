// https://github.com/whatwg/fetch/issues/443

/**
 * @type import("json2html")
 */
const json2html = window.json2html;
/**
 * @type import("lodash")
 */
const _ = window._;
/**
 * @type import("axios")
 */
const axios = window.axios;

/**
 * @typedef {'Fetch' | 'Axios'} HttpClient
 */

const simpleRequestSuccess1 = {
  url: "http://localhost:4000/fetchCorsSupportLimitedToSimpleRequestViaWildcardOrigin",
  description: `
    Simple request is a type of request that doesn't trigger preflight OPTIONS request.
    https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#simple_requests
    But mozilla.org didn't make it clear that by spec definition https://fetch.spec.whatwg.org/#http-requests these are CORS requests as they have Origin header.
    The browser sets Origin header automatically for all requests made to a domain different from the one which the script is served from; can't be altered in our code.
    Such respose is defined as CORS filtered response https://fetch.spec.whatwg.org/#responses.
    The definition is not complete. We derive it from the following:
     - the response is not a filtered response yet;
     - by https://fetch.spec.whatwg.org/#main-fetch 4.1.11 we have no matching cases and hit the bottom case;
     - request’s response tainting is set to "cors" now;
     - by https://fetch.spec.whatwg.org/#main-fetch 4.1.13 the condition holds;
     - response is set to CORS filtered response now;
    A response on simple request should pass CORS filter by https://fetch.spec.whatwg.org/#http-fetch 4.3.6.4.
    In this case Access-Control-Allow-Origin response header value should either have "*" value or match request Origin header value.
    If it doesn't pass, return "network error".
    A network error is a response whose status is always 0, status message is always the empty byte sequence, header list is always empty, and body is always null.
  
    A response on any CORS request (preflight or actual) can have the following headers: https://fetch.spec.whatwg.org/#http-responses.
    In case a server does not wish to participate in the CORS protocol, its HTTP response to the CORS or CORS-preflight request must not include any of the above headers. The server is encouraged to use the 403 status in such HTTP responses.
    These requests have very limited usage (eg fetching static assets from different domain). We don't have such use-cases in our app.`,
  expected: `
    Should issue only GET request;
    Response should be available to the browser internally as an "internal response" https://fetch.spec.whatwg.org/#responses;
    Response should pass CORS filter (Access-Control-Allow-Origin response header value is set to "*");
    Should not throw any errors.
    Should return response object.
  `,
};

const simpleRequestSuccess2 = {
  ...simpleRequestSuccess1,
  url: "http://localhost:4000/fetchCorsSupportLimitedToSimpleRequestViaSpecificOrigin",
  expected: `
    Should issue only GET request;
    Response should be available to the browser internally as an "internal response" https://fetch.spec.whatwg.org/#responses;
    Response should pass CORS filter (Access-Control-Allow-Origin response header value is set to the origin where the request issuing script is hosted);
    Should not throw any errors.
    Should return response object.
  `,
};

const simpleRequestError = {
  ...simpleRequestSuccess1,
  url: "http://localhost:4000/fetchNoCorsSupport",
  expected: `
    Should issue only GET request;
    Response should be available to the browser internally as an "internal response" https://fetch.spec.whatwg.org/#responses;
    Response should fail CORS filter (Access-Control-Allow-Origin response header value is not set);
    Should throw "network error".
  `,
};

const corsRequestWithPreflight = {
  url: "http://localhost:4000/fetchCorsFullSupport",
  description: `
    Non-simple requests have stricter mechanism. Before the browser sends an actual request (with like GET or POST or whatever HTTP method) it will send CORS-preflight request.
    By https://fetch.spec.whatwg.org/#cors-preflight-fetch CORS-preflight request has:
     - OPTIONS method;
     - Same URL as actual request;
     - Origin header equals to source script origin;
     - Accept header equals to */*;
     - Access-Control-Request-Method equals to actual request method;
     - Access-Control-Request-Headers header equals to a list of (non CORS-safelisted and custom) header keys from an actual request;
     - Actual request type will be "cors" and actual response tainting will be "cors";
    CORS-preflight request is something that we have no control over in our code, this is security mechanism therefore neither requset nor response details are available to us.
    CORS implementation is browser specific, differs across browser versions and tends to become stricter. Things might go differently in the next browser version and your app might break.
    Error messages popping in the console are different across the browsers, available only to the client. Our remote logging possibilities are limited to only generic "network error". 
    CORS-preflight request requests can be observed in browser's network tab under "Other" type (Chrome), but are hidden in Safari.
    CORS in not an issue but a security mechanism, related issues usually take place because of our misunderstanding.
    As CORS comes with a performance hit there is a proposal to replace it: https://github.com/WICG/origin-policy.
    https://fetch.spec.whatwg.org/#cors-preflight-fetch 4.8.7 defines CORS-preflight request-response checks.
    Some specifics are:
     - OPTIONS respose should have any of 2xx status code;
     - If request method is CORS-safelisted (HEAD, GET, POST), responses for both OPTIONS and HEAD, GET, POST can omit Access-Control-Allow-Methods header; this is not limited to only simple requests;
     - If request method is non CORS-safelisted, only response for OPTIONS request should have Access-Control-Allow-Methods header whose value should include OPTIONS request's Access-Control-Allow-Method value (set to actual request method);
     - If OPTIONS respose fails CORS checks, actual request will not be issued;
     - If actual response fails CORS checks, response will not be available both to the user and in our code;
     - Credentials in CORS mean cookies, not authorization header; cookies have their own mechanics within CORS;
   `,
  expected: `
    Should queue up PATCH request;
    Should issue OPTIONS request;
    OPTIONS response should pass CORS filter:
     - 2xx response status code;
     - Access-Control-Allow-Origin response header value is set to the origin where the request issuing script is hosted;
     - Access-Control-Allow-Methods response header value includes PATCH method;
     - Access-Control-Allow-Headers response header value includes x-custom (our custom header);
    Should issue PATCH request;
    PATCH response should pass CORS filter;
     - Access-Control-Allow-Origin response header value is set to the origin where the request issuing script is hosted;
    Should not throw any errors.
    Should return response object.
  `,
};

const corsRequestWithPreflightError = {
  ...corsRequestWithPreflight,
  url: "http://localhost:4000/fetchCorsFullSupportNonOkStatusCodeInPreflight",
  expected: `
    Should queue up PATCH request;
    Should issue OPTIONS request;
    OPTIONS response should fail CORS filter:
     - non 2xx response status code;
    Should throw "network error".
  `
}

const networkError = {
  url: "http://localhost:5000/fetchNonExistentDomainName",
  description: `
    A response whose type is "error" is known as a network error.
    A network error is a response whose status is always 0, status message is always the empty byte sequence, header list is always empty, and body is always null.
    https://fetch.spec.whatwg.org/#responses
    Common cases:
     - Blocked network port number;
     - DNS can't be resolved;
     - TCP/IP connection can't be established due to Layer 4 firewall blocking the connection;
     - SSL/TLS handshake can't be established due to invalid SSL certificate or client and server can't negotiate on the encryption protocol;
     - During request/response transmission client/server forcefully closed the connection;
     - During request/response transmission physical connection was interrupted;
    These are the low-level errors where our code sees only generic "network error".
  `,
  expected: `
    Should queue up PATCH request;
    Should queue up OPTIONS request;
    Should fail on DNS resolution step during OPTIONS request execution;
    Should throw "network error".
  `,
};

const cancelledByDev = {
  url: "http://localhost:4000/fetchCorsFullSupportWithLatency",
  description: `
    Common cases:
     - Only cancelled in our code:
       - fetch AbortController;
       - XMLHttpRequest.abort() or axios CancelToken;
    These are high-level API-specific errors, we have a context and can log appropriately.
  `,
  expected: `
    Should queue up PATCH request;
    Should issue OPTIONS request;
    Should abort PATCH request which internally aborts OPTIONS request;
    Should throw cancellation error.
  `,
};

const cancelledByUserNetworkError = {
  url: "http://localhost:4000/fetchCorsFullSupportWithLatency",
  description: `
    A response whose type is "error" and aborted flag is set is known as an aborted network error.
    A network error is a response whose status is always 0, status message is always the empty byte sequence, header list is always empty, and body is always null.
    https://fetch.spec.whatwg.org/#responses
    Common cases:
    - Only cancelled by the client:
      - On timeout;
      - Cancelled by user manually;
    - Cancelled by either client or dev:
      - Navigating to the external domain;
      - Refreshing the page;
    XMLHttpRequest.abort() or axios CancelToken - don't throw an error.
    For fetch API our code sees only generic "network error".
  `,
  expected: `
    Should queue up PATCH request;
    Should issue OPTIONS request;
    Should abort PATCH request which internally aborts OPTIONS request;
    Axios and XMLHttpRequest should not throw any errors.
    Fetch API should throw "network error".
  `,
};

const useCases = {
  fetchCorsSupportLimitedToSimpleRequestViaWildcardOrigin: {
    title: `
      Front-end wants to issue a simple GET request.
      Back-end CORS support is limited to simple requests via setting Access-Control-Allow-Origin response header to "*".
      Back-end doesn't have OPTIONS request handler.
    `,
    context: simpleRequestSuccess1,
    fetch() {
      return fetch(this.context.url);
    },
    axios() {
      return axios.get(this.context.url);
    },
  },
  fetchCorsSupportLimitedToSimpleRequestViaSpecificOrigin: {
    title: `
      Front-end wants to issue a simple GET request.
      Back-end CORS support is limited to simple requests via setting Access-Control-Allow-Origin response header to ${window.location.origin}.
      Back-end doesn't have OPTIONS request handler.
    `,
    context: simpleRequestSuccess2,
    fetch() {
      return fetch(this.context.url);
    },
    axios() {
      return axios.get(this.context.url);
    },
  },
  fetchNoCorsSupportSimpleRequest: {
    title: `
      Front-end wants to issue a simple GET request.
      Back-end doesn't support CORS, no CORS response headers are set.
      Back-end doesn't have OPTIONS request handler.
    `,
    context: simpleRequestError,
    fetch() {
      return fetch(this.context.url);
    },
    axios() {
      return axios.get(this.context.url);
    },
  },
  fetchNonExistentDomainName: {
    title: `
      Front-end wants to issue CORS request.
      Domain name specified in the request's URL doesn't exist.
    `,
    context: networkError,
    fetch() {
      return fetch(this.context.url, { method: "PATCH" });
    },
    axios() {
      return axios.patch(this.context.url);
    },
  },
  fetchCorsFullSupport: {
    title: `
      Front-end wants to issue CORS request.
      Back-end has full CORS support.
    `,
    context: corsRequestWithPreflight,
    fetch() {
      return fetch(this.context.url, { method: "PATCH", headers: new Headers({ "x-custom": "well" }) });
    },
    axios() {
      return axios({ url: this.context.url, method: "PATCH", headers: { "x-custom": "well" } });
    },
  },
  fetchCorsFullSupportNonOkStatusCodeInPreflight: {
    title: `
      Front-end wants to issue CORS request.
      Back-end has full CORS support but responds with non 2xx status code on preflight.
    `,
    context: corsRequestWithPreflightError,
    fetch() {
      return fetch(this.context.url, { method: "PATCH", headers: new Headers({ "x-custom": "well" }) });
    },
    axios() {
      return axios({ url: this.context.url, method: "PATCH", headers: { "x-custom": "well" } });
    },
  },
  fetchAndDevCancel: {
    title: `
      Front-end wants to issue CORS request.
      Back-end adds 3s latency to both OPTIONS and PATCH handlers.
      Front-end cancels the request during OPTIONS in flight (server latency).
    `,
    context: cancelledByDev,
    fetch() {
      // Initialize abort controller
      const controller = new AbortController();
      const signal = controller.signal;
      // Abort after 1s
      setTimeout(() => controller.abort(), 1000);

      // Pass signal to fetch, so it will halt the execution on controller abort
      return fetch(this.context.url, { method: "PATCH", signal });
    },
    axios() {
      // Initialize cancel token
      const CancelToken = axios.CancelToken;
      const source = CancelToken.source();
      // Cancel after 2s
      setTimeout(() => source.cancel("Operation canceled by the user."), 2000);

      return axios({ url: this.context.url, method: "PATCH", cancelToken: source.token });
    },
  },
  fetchAndUserCancel: {
    title: `
      Front-end wants to issue CORS request.
      Back-end adds 3s latency to both OPTIONS and PATCH handlers.
      Front-end refreshes the page after 1s.
    `,
    context: cancelledByUserNetworkError,
    fetch() {
      setTimeout(() => window.location.reload(), 1000);
      return fetch(this.context.url, { method: "PATCH" });
    },
    axios() {
      return axios({ url: this.context.url, method: "PATCH" });
    },
  },
  fetchAndUserManualCancel: {
    title: `
      Front-end wants to issue CORS request.
      Back-end adds 3s latency to both OPTIONS and PATCH handlers.
      Manually refresh the page or navigate within 6s.
      Try going offline within 6s to simulate connection interruption which is covered under non-existent domain name.
    `,
    context: cancelledByUserNetworkError,
    fetch() {
      return fetch(this.context.url, { method: "PATCH" });
    },
    axios() {
      return axios({ url: this.context.url, method: "PATCH" });
    },
  },
};

/**
 * @param {`${keyof useCases}Response${'Headers' | 'Body'}${HttpClient}`} targetElementId
 * @param {Object | undefined} object
 */
const renderNestedGrid = (targetElementId, object) => {
  if (!object) return;

  const template = Object.entries(object).map(([key, value]) => ({
    "<>": "div",
    class: "row grid-row-inner p-0 m-0",
    html: [
      {
        "<>": "div",
        class: "col",
        text: key,
      },
      {
        "<>": "div",
        class: "col",
        text: value,
      },
    ],
  }));

  document.getElementById(targetElementId).innerHTML = json2html.render({}, template);
};

/**
 * @param {Object} serializedResponse
 * @param {Response['status']} serializedResponse.status
 * @param {Response['type']} serializedResponse.type
 * @param {Response['url']} serializedResponse.url
 * @param {Object} serializedResponse.headers
 * @param {*} serializedResponse.body
 *
 * @param {keyof useCases} prefix
 * @param {HttpClient} postfix
 */
const renderSerializedResponse = (serializedResponse, prefix, postfix) => {
  Object.keys(serializedResponse).forEach((key) => {
    const elementId = `${prefix}Response${_.capitalize(key)}${postfix}`;
    if (typeof serializedResponse[key] === "object") renderNestedGrid(elementId, serializedResponse[key]);
    else document.getElementById(elementId).innerText = serializedResponse[key];
  });
};

/**
 * @param {keyof useCases} prefix
 * @param {HttpClient} postfix
 */
const getResponseTemplate = (prefix, postfix) => ({
  "<>": "div",
  class: "col-4",
  id: `${prefix}Response`,
  html: [
    {
      "<>": "div",
      class: "row grid-row",
      html: [
        {
          "<>": "div",
          class: "col-3",
          text: "status",
        },
        {
          "<>": "div",
          id: `${prefix}ResponseStatus${postfix}`,
          class: "col",
        },
      ],
    },
    {
      "<>": "div",
      class: "row grid-row",
      html: [
        {
          "<>": "div",
          class: "col-3",
          text: "type",
        },
        {
          "<>": "div",
          id: `${prefix}ResponseType${postfix}`,
          class: "col",
        },
      ],
    },
    {
      "<>": "div",
      class: "row grid-row",
      html: [
        {
          "<>": "div",
          class: "col-3",
          text: "url",
        },
        {
          "<>": "div",
          id: `${prefix}ResponseUrl${postfix}`,
          class: "col",
        },
      ],
    },
    {
      "<>": "div",
      class: "row grid-row",
      html: [
        {
          "<>": "div",
          class: "col-3",
          text: "headers",
        },
        {
          "<>": "div",
          id: `${prefix}ResponseHeaders${postfix}`,
          class: "col p-0",
        },
      ],
    },
    {
      "<>": "div",
      class: "row grid-row",
      html: [
        {
          "<>": "div",
          class: "col-3",
          text: "body",
        },
        {
          "<>": "div",
          id: `${prefix}ResponseBody${postfix}`,
          class: "col p-0",
        },
      ],
    },
  ],
});

window.addEventListener("load", (event) => {
  Object.keys(useCases).forEach((key) => {
    const newNode = document.createElement("div");
    newNode.className = "accordion-item";

    const nodeTemplate = [
      {
        "<>": "h4",
        class: "accordion-header",
        html: [
          {
            "<>": "button",
            id: `${key}AccordionButton`,
            class: "accordion-button collapsed",
            type: "button",
            "data-bs-toggle": "collapse",
            "data-bs-target": `#${key}`,
          },
        ],
      },
      {
        "<>": "div",
        id: key,
        class: "accordion-collapse collapse",
        html: [
          {
            "<>": "div",
            id: `${key}Description`,
            class: "accordion-body",
          },
          {
            "<>": "div",
            class: "accordion-body pt-0",
            html: [
              {
                "<>": "b",
                text: "Expected behavior:",
              },
              {
                "<>": "div",
                id: `${key}Expected`,
              },
            ],
          },
          {
            "<>": "div",
            class: "container d-grid px-0",
            html: [
              {
                "<>": "button",
                id: `${key}ExecButton`,
                class: "btn btn-primary",
                type: "button",
                text: "Execute",
              },
            ],
          },
          {
            "<>": "div",
            class: "container m-4",
            html: [
              {
                "<>": "div",
                class: "row grid-row text-center",
                html: [
                  {
                    "<>": "div",
                    class: "col",
                    html: "<b>Fetch</b>",
                  },
                  {
                    "<>": "div",
                    class: "col",
                    html: "<b>Axios</b>",
                  },
                ],
              },
              {
                "<>": "div",
                class: "row grid-row text-center",
                html: [
                  {
                    "<>": "div",
                    class: "col-4",
                    text: "Response",
                  },
                  {
                    "<>": "div",
                    class: "col",
                    text: "Error",
                  },
                  {
                    "<>": "div",
                    class: "col-4",
                    text: "Response",
                  },
                  {
                    "<>": "div",
                    class: "col",
                    text: "Error",
                  },
                ],
              },
              {
                "<>": "div",
                class: "row text-center",
                html: [
                  getResponseTemplate(key, "Fetch"),
                  {
                    "<>": "div",
                    id: `${key}ErrorFetch`,
                    class: "col-2 error-temp",
                  },
                  getResponseTemplate(key, "Axios"),
                  {
                    "<>": "div",
                    id: `${key}ErrorAxios`,
                    class: "col-2 error-temp",
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const execute = async () => {
      let serializedResponse = {
        status: "",
        type: "",
        url: "",
        headers: {},
        body: {},
      };
      // Clear response grids
      renderSerializedResponse(serializedResponse, key, "Fetch");
      renderSerializedResponse(serializedResponse, key, "Axios");
      document.getElementById(`${key}ErrorFetch`).innerText = "";
      document.getElementById(`${key}ErrorAxios`).innerText = "";

      try {
        useCases[key]
          .fetch()
          .then((response) => {
            console.log("🚀 ~ file: index.js ~ .then ~ response", response);
            // Start preparing response object to render into response block
            serializedResponse.status = response.status;
            serializedResponse.type = response.type;
            serializedResponse.url = response.url;
            if (response.headers) serializedResponse.headers = Object.fromEntries(response.headers.entries());
            console.log("🚀 ~ file: index.js ~ .then ~ serializedResponse", serializedResponse);

            return response.json();
          })
          .then((responseBody) => {
            serializedResponse.body = responseBody;

            // Render full response object into response grid
            renderSerializedResponse(serializedResponse, key, "Fetch");
          })
          .catch((error) => {
            console.log("🚀 ~ file: index.js ~ execute ~ promise catch block ~ error", error);
            const getAllPropertyNames = (obj) => {
              const proto = Object.getPrototypeOf(obj);
              const inherited = proto ? getAllPropertyNames(proto) : [];
              return [...new Set([...Object.getOwnPropertyNames(obj), ...inherited])];
            };
            const errorKeys = getAllPropertyNames(error).filter((name) => typeof error[name] === "string");
            const serializedError = errorKeys.map((errorKey) => ({ [errorKey]: error[errorKey] }));
            console.table(serializedError);

            // Render partial response object into response block
            renderSerializedResponse(serializedResponse, key, "Fetch");
            document.getElementById(`${key}ErrorFetch`).innerText = JSON.stringify(serializedError);
          });
      } catch (error) {
        console.log("🚀 ~ file: index.js ~ execute ~ try-catch block ~ error", error);
      }

      try {
        useCases[key]
          .axios()
          .then((response) => {
            console.log("🚀 ~ file: index.js ~ .then ~ response", response);
            // Start preparing response object to render into response block
            serializedResponse.status = response.status;
            serializedResponse.type = response.type;
            serializedResponse.url = response.config.url;
            serializedResponse.headers = response.headers;
            serializedResponse.body = response.data;
            console.log("🚀 ~ file: index.js ~ .then ~ serializedResponse", serializedResponse);

            // Render full response object into response grid
            renderSerializedResponse(serializedResponse, key, "Axios");
          })
          .catch((error) => {
            console.log("🚀 ~ file: index.js ~ execute ~ promise catch block ~ error", error);
            const getAllPropertyNames = (obj) => {
              const proto = Object.getPrototypeOf(obj);
              const inherited = proto ? getAllPropertyNames(proto) : [];
              return [...new Set([...Object.getOwnPropertyNames(obj), ...inherited])];
            };
            const errorKeys = getAllPropertyNames(error).filter((name) => typeof error[name] === "string");
            const serializedError = errorKeys.map((errorKey) => ({ [errorKey]: error[errorKey] }));
            console.table(serializedError);

            // Render partial response object into response block
            renderSerializedResponse(serializedResponse, key, "Axios");
            document.getElementById(`${key}ErrorAxios`).innerText = JSON.stringify(serializedError);
          });
      } catch (error) {
        console.dir("🚀 ~ file: index.js ~ execute ~ try-catch block ~ error", error);
      }
    };

    newNode.innerHTML = json2html.render({}, nodeTemplate);
    document.getElementById("root").appendChild(newNode);

    const button = document.getElementById(`${key}ExecButton`);
    button.addEventListener("click", execute);

    // Setting text from the template removes all linebreaks, set text here
    document.getElementById(`${key}AccordionButton`).innerText = useCases[key].title.replace(/\s/, "");
    document.getElementById(`${key}Description`).innerText = useCases[key].context.description.replace(/\s/, "");
    document.getElementById(`${key}Expected`).innerText = useCases[key].context.expected?.replace(/\s/, "");
  });
});

// TODO clear error
// TODO render error key-values like headers
