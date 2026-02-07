# n8n-nodes-puppeteer

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

[n8n](https://www.n8n.io) node for browser automation using [Puppeteer](https://pptr.dev/). Execute custom scripts, capture screenshots and PDFs, scrape content, and automate web interactions using Chrome/Chromium's DevTools Protocol. Full access to Puppeteer's API plus n8n's Code node capabilities makes this node powerful for any browser automation task.

## How to install

### Community Nodes (Recommended)

For n8n version 0.187 and later, you can install this node through the Community Nodes panel:

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-puppeteer` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Docker Installation (Recommended for Production)

We provide a ready-to-use Docker setup in the `docker/` directory that includes all necessary dependencies and configurations:

1. Clone this repository

2. Build your Docker image:
```bash
npm run docker:build
```

3. Run the container:
```bash
npm run docker:run
```

Or for testing without persistent data:
```bash
npm run docker:run:fresh
```

#### Available Docker Scripts

- `npm run docker:build` - Build the Docker image with Puppeteer node
- `npm run docker:run` - Run n8n with persistent data volume
- `npm run docker:run:fresh` - Run n8n without persistent data (clean start)
- `npm run docker:run:external-browser` - Run with external browser connection example
- `npm run docker:test` - Quick test to verify the image works
- `npm run docker:shell` - Open a shell inside the container for debugging
- `npm run docker:clean` - Remove the data volume
- `npm run docker:clean:all` - Remove data volume and images

#### Container Optimizations

When running in Docker or Kubernetes, the node automatically detects the container environment and applies necessary Chrome launch arguments (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`). This happens automatically - no configuration needed!

A blue info banner will appear in the node when a container is detected. This can be toggled off in Options > Add Container Arguments if needed.

### Manual Installation

For a standard installation without Docker:

```bash
# Navigate to your n8n root directory
cd /path/to/n8n

# Install the package
npm install n8n-nodes-puppeteer
```

Note: By default, when Puppeteer is installed, it downloads a compatible version of Chromium. While this works, it increases installation size and may not include necessary system dependencies. For production use, we recommend either using the Docker setup above or installing system Chrome/Chromium and setting the `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` environment variable.

## Browser Setup Options

### 1. Local Browser (Docker Setup - Recommended)

The included Docker setup provides the most reliable way to run Chrome/Chromium with all necessary dependencies. It uses Alpine Linux's Chromium package and includes all required fonts and libraries.

### 2. Remote Browser (Alternative for Cloud)

You can also connect to an external Chrome or Firefox instance using the "Browser WebSocket Endpoint" option. This approach:
- Eliminates the need for Chrome dependencies in your n8n environment
- Simplifies deployment and maintenance
- Provides better resource isolation
- Works great for cloud and containerized deployments
- Supports Firefox via WebDriver BiDi protocol

Options include:
- **Managed Services**: Use [browserless](https://browserless.io) or [browsercloud](https://browsercloud.io)
- **Self-Hosted Chrome**: Run your own [browser container](https://docs.browserless.io/docker/config):
  ```bash
  docker run -p 3000:3000 -e "TOKEN=6R0W53R135510" ghcr.io/browserless/chromium
  ```
- **Self-Hosted Firefox**: Run Firefox with WebDriver BiDi support

#### Configuring Remote Browser Connection

**Per-Node Configuration:**
In any Puppeteer node, go to Options > Add Option:
- Add "Browser WebSocket Endpoint" and enter your WebSocket URL (e.g., `ws://browserless:3000?token=6R0W53R135510`)
- Add "Protocol" and select:
  - **CDP (Chrome DevTools Protocol)** - for Chrome/Chromium (default)
  - **WebDriver BiDi** - for Firefox

**Global Configuration via Environment Variables (Recommended):**

Instead of configuring each node individually, you can set environment variables:

```bash
# For Chrome/Chromium
docker run -it -p 5678:5678 \
  -e PUPPETEER_BROWSER_WS_ENDPOINT=ws://browserless:3000 \
  -e PUPPETEER_PROTOCOL=cdp \
  n8n-puppeteer

# For Firefox
docker run -it -p 5678:5678 \
  -e PUPPETEER_BROWSER_WS_ENDPOINT=ws://firefox:4444 \
  -e PUPPETEER_PROTOCOL=webDriverBiDi \
  n8n-puppeteer
```

Or with Docker Compose:

```yaml
version: '3.8'
services:
  n8n:
    image: n8n-puppeteer
    environment:
      - PUPPETEER_BROWSER_WS_ENDPOINT=ws://browserless:3000
      - PUPPETEER_PROTOCOL=cdp
    ports:
      - "5678:5678"

  browserless:
    image: browserless/chrome
    ports:
      - "3000:3000"
```

When environment variables are set, a blue info banner will appear showing the configured endpoint. Individual nodes can still override these settings if needed.

## Troubleshooting

If you see errors about missing shared libraries (like `libgobject-2.0.so.0` or `libnss3.so`), either:

1. Install the missing Chrome dependencies
2. Switch to using a remote browser with the WebSocket endpoint option

For additional help, see [Puppeteer's troubleshooting guide](https://pptr.dev/troubleshooting).

## Node Reference

- **Operations**

  - Get the full HTML contents of the page
  - Capture the contents of a page as a PDF document
  - Capture screenshot of all or part of the page
  - Execute custom script to interact with the page

- **Options**

  - All Operations

    - **Batch Size**: Maximum number of pages to open simultaneously. More pages will consume more memory and CPU.
    - **Browser WebSocket Endpoint**: The WebSocket URL of the browser to connect to. When configured, puppeteer will skip the browser launch and connect to the browser instance. Can also be set globally via environment variables: `PUPPETEER_BROWSER_WS_ENDPOINT` or `PUPPETEER_WS_ENDPOINT`.
    - **Protocol**: The protocol to use when connecting to the browser. Options:
      - **CDP (Chrome DevTools Protocol)** - Default for Chrome/Chromium
      - **WebDriver BiDi** - For Firefox and cross-browser automation
      Can also be set globally via environment variable: `PUPPETEER_PROTOCOL`.
    - **Emulate Device**: Allows you to specify a [device](https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts) to emulate when requesting the page.
    - **Executable Path**: A path where Puppeteer expects to find the bundled browser. Has no effect when 'Browser WebSocket Endpoint' is set.
    - **Extra Headers**: Allows you add additional headers when requesting the page.
    - **Timeout**: Allows you to specify the maximum navigation time in milliseconds. You can pass 0 to disable the timeout entirely.
    - **Protocol Timeout**: Maximum time in milliseconds to wait for a protocol response. Pass 0 to disable timeout.
    - **Wait Until**: Allows you to change how Puppeteer considers navigation completed.
      - `load`: The load event is fired.
      - `domcontentloaded`: The DOMContentLoaded event is fired.
      - `networkidle0`: No more than 0 connections for at least 500 ms.
      - `networkidle2`: No more than 2 connections for at least 500 ms.
    - **Page Caching**: Allows you to toggle whether pages should be cached when requesting.
    - **Headless mode**: Allows you to change whether to run browser runs in headless mode or not.
    - **Use Chrome Headless Shell**: Whether to run browser in headless shell mode. Defaults to false. Headless mode must be enabled. chrome-headless-shell must be in $PATH.
    - **Stealth mode**: When enabled, applies various techniques to make detection of headless Puppeteer harder. Powered by [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth).
    - **Human typing mode**: Gives page the function `.typeHuman()` which "humanizes" the writing of input elements. Includes configurable options for typing speed, typos, and backspace delays.
    - **Launch Arguments**: Allows you to specify additional command line arguments passed to the browser instance.
    - **Capture Downloads**: When enabled, any files downloaded during script execution (via clicks, direct downloads, etc.) will be automatically captured and returned as binary data in the node output. Perfect for downloading PDFs, images, or other files triggered by user interactions. Files are automatically cleaned up after capture.
    - **Add Container Arguments**: Automatically adds recommended arguments for container environments (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`). Container environments are auto-detected by default. Disable only if you experience launch issues.
    - **Proxy Server**: Allows Puppeteer to use a custom proxy configuration. You can specify a custom proxy configuration in three ways:
      By providing a semi-colon-separated mapping of list scheme to url/port pairs.
      For example, you can specify:

            http=foopy:80;ftp=foopy2

      to use HTTP proxy "foopy:80" for http URLs and HTTP proxy "foopy2:80" for ftp URLs.

      By providing a single uri with optional port to use for all URLs.
      For example:

            foopy:8080

      will use the proxy at foopy:8080 for all traffic.

      By using the special "direct://" value.

            direct://" will cause all connections to not use a proxy.

  - Get PDF
    - **File Name**: Allows you to specify the filename of the output file.
    - **Page Ranges** field: Allows you to specify paper ranges to print, e.g. 1-5, 8, 11-13.
    - **Scale**: Allows you to scale the rendering of the web page. Amount must be between 0.1 and 2
    - **Prefer CSS Page Size**: Give any CSS @page size declared in the page priority over what is declared in the width or height or format option.
    - **Format**: Allows you to specify the paper format types when printing a PDF. eg: Letter, A4.
    - **Height**: Allows you to set the height of paper. You can pass in a number or a string with a unit.
    - **Width**: Allows you to set the width of paper. You can pass in a number or a string with a unit.
    - **Landscape**: Allows you to control whether to show the header and footer
    - **Margin**: Allows you to specify top, left, right, and bottom margin.
    - **Display Header/Footer**: Allows you to specify whether to show the header and footer.
    - **Header Template**: Allows you to specify the HTML template for the print header. Should be valid HTML with the following classes used to inject values into them:
      - `date`: Formatted print date
      - `title`: Document title
      - `url`: Document location
      - `pageNumber` Current page number
      - `totalPages` Total pages in the document
    - **Footer Template**: Allows you to specify the HTML template for the print footer. Should be valid HTML with the following classes used to inject values into them:
      - `date`: Formatted print date
      - `title`: Document title
      - `url`: Document location
      - `pageNumber` Current page number
      - `totalPages` Total pages in the document
    - **Transparent Background**: Allows you to hide the default white background and allows generate PDFs with transparency.
    - **Background Graphic**: Allows you to include background graphics.
  - Get Screenshot
    - **File Name**: Allows you to specify the filename of the output file.
    - **Type** field: Allows you to specify the image format of the output file:
      - JPEG
      - PNG
      - WebP
    - **Quality**: Allows you to specify the quality of the image.
      - Accepts a value between 0-100.
      - Not applicable to PNG images.
    - **Full Page**: Allows you to capture a screen of the full scrollable content.

## Custom Scripts

The Custom Script operation gives you complete control over Puppeteer to automate complex browser interactions, scrape data, generate PDFs/screenshots, and more. Scripts run in a sandboxed environment with access to the full Puppeteer API and n8n's Code node features.

Before script execution, you can configure browser behavior using the operation's options like:

- Emulate specific devices
- Set custom headers
- Enable stealth mode to avoid detection
- Configure proxy settings
- Set page load timeouts
- And more

Access Puppeteer-specific objects using:

- `$page` - Current page instance
- `$browser` - Browser instance
- `$puppeteer` - Puppeteer library
- `$input.query` - Input query from AI agents (when used as a tool)

Plus all special variables and methods from the Code node are available. For a complete reference, see the [n8n documentation](https://docs.n8n.io/code-examples/methods-variables-reference/). Just like n8n's Code node, anything you `console.log` will be shown in the browser's console during test mode or in stdout when configured.

### AI Agent Integration

When used as a tool by n8n AI agents, this node supports two powerful workflows:

**1. AI-Generated Scripts**: AI agents can dynamically generate the entire Puppeteer script using `$fromAI()` on the Script Code parameter. The AI analyzes the task and writes the appropriate Puppeteer code to accomplish it.

```javascript
// AI agent generates script dynamically based on the task
scriptCode: $fromAI('code', 'Generate a Puppeteer script to extract product prices from the homepage')
```

**2. Reusable Scripts with AI Input**: Write a reusable script that accepts dynamic input from AI agents via the Query parameter. Access the input using `$input.query` in your script.

```javascript
// Reusable script that processes AI-provided input
const url = $input.query || 'https://example.com';
await $page.goto(url);

const data = await $page.evaluate(() => {
  return document.querySelector('h1').textContent;
});

return [{ url, title: data }];
```

```javascript
// AI agent provides input dynamically
query: $fromAI('url', 'The website URL to scrape')
```

This makes the node extremely flexible for AI-powered automation - agents can either write custom scripts for specific tasks or pass data to pre-built, reusable scripts.

### Basic

```javascript
// Navigate to an IP lookup service
await $page.goto("https://httpbin.org/ip");

// Extract the IP address from the page content
const ipData = await $page.evaluate(() => {
  const response = document.body.innerText;
  const parsed = JSON.parse(response);
  return parsed.origin; // Extract the 'origin' field, which typically contains the IP address
});

console.log("Hello, world!");

console.log("IP Address", ipData);

// Return the result in the required format (array)
return [{ ip: ipData, ...$json }];
```

### Storing and re-using cookies

#### Node 1

```javascript
await $page.goto("https://www.example.com/login");

// Perform login
await $page.type("#login-username", "user");
await $page.type("#login-password", "pass");
await $page.click("#login-button");

// Store cookies for later use
const cookies = await $page.cookies();

return [{ cookies }];
```

#### Node 2

```javascript
const { cookies } = $input.first().json;

// Restore cookies
await $page.setCookie(...cookies);

// Navigate to authenticated page
await $page.goto("https://example.com/protected-page");

// Perform authenticated operations
const data = await $page.evaluate(() => {
  return document.querySelector(".protected-content").textContent;
});

return [{ data }];
```

### Working with Binary Data

```javascript
await $page.goto("https://www.google.com");
const imageData = await $page.screenshot({ type: "png", encoding: "base64" });
return [
  {
    binary: {
      screenshot: {
        data: imageData,
        mimeType: "image/png",
        fileName: "screenshot.png",
      },
    },
  },
];
```

### Downloading Files

The Capture Downloads option makes it easy to download files triggered by user interactions or scripts:

```javascript
// Navigate to a page with downloadable files
await $page.goto('https://example.com/downloads');

// Click a download button - the file will be automatically captured
await $page.click('#download-pdf-button');

// Wait a moment for the download to complete
await $page.waitForTimeout(2000);

// Return the result - downloaded files will be attached as binary data
return [{ json: { success: true } }];
```

When the "Capture Downloads" option is enabled:
- All files downloaded during script execution are automatically captured
- Files are returned as binary data in the node output
- Multiple files are supported - each file gets its own binary property
- Files are automatically cleaned up after capture
- Works with direct downloads, click-triggered downloads, and programmatic downloads

This is particularly useful for:
- Downloading PDFs from web applications
- Capturing generated reports
- Saving images or documents triggered by user actions
- Testing download functionality in automated workflows

## Environment Variables

The following environment variables can be used to configure Puppeteer globally:

- **`PUPPETEER_BROWSER_WS_ENDPOINT`** or **`PUPPETEER_WS_ENDPOINT`**: WebSocket URL of the browser to connect to. This eliminates the need to configure each node individually.
- **`PUPPETEER_PROTOCOL`**: Protocol to use (`cdp` or `webDriverBiDi`). Useful for Firefox setups.
- **`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`**: Set to `true` to skip downloading Chromium during installation.
- **`PUPPETEER_EXECUTABLE_PATH`**: Path to the browser executable.

Example:
```bash
docker run -it -p 5678:5678 \
  -e PUPPETEER_BROWSER_WS_ENDPOINT=ws://browserless:3000 \
  -e PUPPETEER_PROTOCOL=cdp \
  n8n-puppeteer
```

Node-level settings always override environment variables when specified.

## Firefox Support

This node supports Firefox through WebDriver BiDi protocol. To use Firefox:

1. Set up a Firefox instance with WebDriver BiDi enabled
2. Configure the connection either:
   - **Per-node**: Options > Browser WebSocket Endpoint + Protocol (WebDriver BiDi)
   - **Globally**: Environment variables `PUPPETEER_BROWSER_WS_ENDPOINT` + `PUPPETEER_PROTOCOL=webDriverBiDi`
3. Execute your workflows with Firefox!

## Screenshots

### Run Custom Script

![](images/script.png)

### Get Page Content

![](images/content.png)

### Get Screenshot

![](images/screenshot.png)

## License

MIT License

Copyright (c) 2022-2026 Nicholas Penree <nick@penree.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
