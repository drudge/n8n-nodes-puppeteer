# n8n-nodes-puppeteer

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

[n8n](https://www.n8n.io) node for requesting webpages using [Puppeteer](https://pptr.dev/), a Node library which provides a high-level API to control Chrome or Chromium over the [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/).

## How to install

### Community Nodes (Recommended)

For users on n8n v0.187+, your instance owner can install this node from [Community Nodes](https://docs.n8n.io/integrations/community-nodes/installation/).

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-puppeteer` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node. n8n displays the node in search results in the **Nodes** panel.

### Manual installation

To get started install the package in your n8n root directory:

`npm install n8n-nodes-puppeteer`

For Docker-based deployments, you'll need to make sure [puppeteer is installed](https://developer.chrome.com/docs/puppeteer/troubleshooting/#running-puppeteer-in-docker) first. Then, add the following line before the font installation command in your [n8n Dockerfile](https://github.com/n8n-io/n8n/blob/master/docker/images/n8n/Dockerfile):

`RUN cd /usr/local/lib/node_modules/n8n && npm install n8n-nodes-puppeteer`

Check out [this gist](https://gist.github.com/drudge/4be1238282a5db30b3786b5de394d13d) or [Marcus' example repo](https://github.com/maspio/n8n-puppeteer-docker) for a working example.

> **Note:** If you've having issues running puppeteer, please check their [Troubleshooting guide](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md) before opening an issue here.

## Node Reference

- **Operations**

  - Get the full HTML contents of the page
  - Capture the contents of a page as a PDF document
  - Capture screenshot of all or part of the page
  - Execute custom script to interact with the page

- **Options**

  - All Operations
    - **Batch Size**: Maximum number of pages to open simeultaneously. More pages will consume more memory and CPU.
    - **Browser WebSocket Endpoint**: The WebSocket URL of the browser to connect to. When configured, puppeteer will skip the browser launch and connect to the browser instance.
    - **Emulate Device**: Allows you to specify a [device](https://github.com/puppeteer/puppeteer/blob/main/src/common/DeviceDescriptors.ts) to emulate when requesting the page.
    - **Executable Path**: A path where Puppeteer expects to find the bundled browser. Has no effect when 'Browser WebSocket Endpoint' is set.
		- **Extra Headers**: Allows you add additional headers when requesting the page.
    - **Timeout**: Allows you to specify tge maximum navigation time in milliseconds. You can pass 0 to disable the timeout entirely.
    - **Wait Until**: Allows you to change how Puppeteer considers navigation completed.
      - `load`: The load event is fired.
      - `DOMContentLoaded`: The DOMContentLoaded event is fired.
      - `networkidle0`: No more than 0 connections for at least 500 ms.
      - `networkidle2`: No more than 2 connections for at least 500 ms.
    - **Page Caching**: Allows you to toggle whether pages should be cached when requesting.
    - **Headless mode**: Allows you to change whether to run browser runs in headless mode or not.
		- **Use Chrome Headless Shell**: Whether to run browser in headless shell mode. Defaults to false. Headless mode must be enabled. chrome-headless-shell must be in $PATH.
    - **Stealth mode**: When enabled, applies various techniques to make detection of headless Puppeteer harder. Powered by [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth).
    - **Launch Arguments**: Allows you to specify additional command line arguments passed to the browser instance.
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

## Screenshots

### Run Custom Script

![](images/script.png)

### Get Page Content

![](images/content.png)

### Get Screenshot

![](images/screenshot.png)

## License

MIT License

Copyright (c) 2022-2024 Nicholas Penree <nick@penree.com>

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
