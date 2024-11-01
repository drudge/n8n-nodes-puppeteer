import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from "n8n-workflow";
import { NodeVM, makeResolverFromLegacyOptions } from '@n8n/vm2';

import puppeteer from "puppeteer-extra";
import pluginStealth from "puppeteer-extra-plugin-stealth";
import {
	KnownDevices as devices,
	Device,
	PuppeteerLifeCycleEvent,
	ScreenshotOptions,
} from "puppeteer";

import { nodeDescription } from "./Puppeteer.node.options";

const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
	process.env;

export const vmResolver = makeResolverFromLegacyOptions({
	external: external
		? {
				modules: external.split(','),
				transitive: false,
			}
		: false,
	builtin: builtIn?.split(',') ?? [],
});


const DEFAULT_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36";
export class Puppeteer implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	methods = {
		loadOptions: {
			async getDevices(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const deviceNames = Object.keys(devices);
				const returnData: INodePropertyOptions[] = [];

				for (const name of deviceNames) {
					const device = devices[name as keyof typeof devices] as Device;
					returnData.push({
						name,
						value: name,
						description: `${device.viewport.width} x ${device.viewport.height} @ ${device.viewport.deviceScaleFactor}x`,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: INodeExecutionData[] = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const options = this.getNodeParameter("options", 0, {}) as IDataObject;
		const launchArguments = (options.launchArguments as IDataObject) || {};
		const operation = this.getNodeParameter("operation", 0) as string;
		let headless: "shell" | boolean = options.headless !== false;
		const headlessShell = options.shell === true;
		const executablePath = options.executablePath as string;
		const browserWSEndpoint = options.browserWSEndpoint as string;
		const stealth = options.stealth === true;
		const pageCaching = options.pageCaching !== false;
		const launchArgs: IDataObject[] = launchArguments.args as IDataObject[];
		const args: string[] = [];

		// More on launch arguments: https://www.chromium.org/developers/how-tos/run-chromium-with-flags/
		if (launchArgs && launchArgs.length > 0) {
			args.push(...launchArgs.map((arg: IDataObject) => arg.arg as string));
		}

		// More on proxying: https://www.chromium.org/developers/design-documents/network-settings
		if (options.proxyServer) {
			args.push(`--proxy-server=${options.proxyServer}`);
		}

		if (stealth) {
			puppeteer.use(pluginStealth());
		}

		if (headless && headlessShell) {
			headless = "shell";
		}

		let browser;
		if (browserWSEndpoint) {
			browser = await puppeteer.connect({
				browserWSEndpoint,
			});
		} else {
			browser = await puppeteer.launch({
				headless,
				args,
				executablePath,
			});
		}

		let returnItem: any;

		for (let itemIndex: number = 0; itemIndex < items.length; itemIndex++) {
			const page = await browser.newPage();

			if (operation === "runCustomScript") {
				const vm = new NodeVM({
					console: 'redirect',
					sandbox: {
						$browser: browser,
						$page: page,
						$input: items[itemIndex],
						$json: items[itemIndex].json,
						$items: items,
					},
					require: options?.resolver ?? vmResolver,
					wasm: false,
				});
				const scriptCode = this.getNodeParameter(
					"scriptCode",
					itemIndex,
				) as string;

				let scriptResult;
				try {
					scriptResult = await vm.run(`module.exports = async function() { ${scriptCode}\n}()`);
					// console.log("Script Result:", scriptResult);
				} catch (error: Error | any) {
					if (this.continueOnFail() !== true) {
						throw error;
					} else {
						returnData.push({
							json: { error: error.message },
							pairedItem: {
								item: itemIndex,
							},
						});
						continue;
					}
				}

				if (!Array.isArray(scriptResult)) {
					if (this.continueOnFail() !== true) {
						throw new Error(
							"Custom script must return an array of items. Please ensure your script returns an array, e.g., return [{ key: value }].",
						);
					} else {
						returnData.push({
							json: {
								error:
									"Custom script must return an array of items. Please ensure your script returns an array, e.g., return [{ key: value }].",
							},
							pairedItem: {
								item: itemIndex,
							},
						});
					}
					continue;
				}

				const autoJson = scriptResult.map((json: any) => ({
					json,
					pairedItem: {
						item: itemIndex,
					},
				}));

				returnData.push(...autoJson);
			} else {
				const urlString = this.getNodeParameter("url", itemIndex) as string;
				const { parameter: someHeaders = [] } = (options.headers || {}) as any;
				const { parameter: queryParameters = [] } = this.getNodeParameter(
					"queryParameters",
					itemIndex,
				) as any;
				const requestHeaders = someHeaders.reduce((acc: any, cur: any) => {
					acc[cur.name] = cur.value;
					return acc;
				}, {});
				const device = options.device as string;

				const url = new URL(urlString);

				await page.setCacheEnabled(pageCaching);

				if (device) {
					const emulatedDevice = devices[
						device as keyof typeof devices
					] as Device;
					if (emulatedDevice) {
						await page.emulate(emulatedDevice);
					}
				} else {
					const userAgent =
						requestHeaders["User-Agent"] ||
						requestHeaders["user-agent"] ||
						DEFAULT_USER_AGENT;
					await page.setUserAgent(userAgent);
				}

				await page.setExtraHTTPHeaders(requestHeaders);

				for (const queryParameter of queryParameters) {
					url.searchParams.append(queryParameter.name, queryParameter.value);
				}

				console.log(
					`Processing ${itemIndex + 1} of ${items.length}: [${operation}]${device ? ` [${device}] ` : " "}${url}`,
				);

				const waitUntil = options.waitUntil as PuppeteerLifeCycleEvent;
				const timeout = options.timeout as number;
				const response = await page.goto(url.toString(), {
					waitUntil,
					timeout,
				});
				const headers = await response?.headers();
				const statusCode = response?.status();

				if (statusCode !== 200) {
					if (this.continueOnFail() !== true) {
						returnItem = {
							json: {
								headers,
								statusCode,
							},
						};
						if (operation === "getPageContent") {
							returnItem.json.body = await page.content();
						}
					} else {
						throw new Error(`Request failed with status code ${statusCode}`);
					}
				} else {
					if (operation === "getPageContent") {
						const body = await page.content();
						returnItem = {
							json: {
								body,
								headers,
								statusCode,
							},
						};
					} else if (operation === "getScreenshot") {
						const dataPropertyName = this.getNodeParameter(
							"dataPropertyName",
							itemIndex,
						) as string;
						const fileName = options.fileName as string;
						const type = this.getNodeParameter(
							"imageType",
							itemIndex,
						) as ScreenshotOptions["type"];
						const fullPage = this.getNodeParameter(
							"fullPage",
							itemIndex,
						) as boolean;
						const screenshotOptions: ScreenshotOptions = {
							type,
							fullPage,
						};

						if (type !== "png") {
							const quality = this.getNodeParameter(
								"quality",
								itemIndex,
							) as number;
							screenshotOptions.quality = quality;
						}

						if (fileName) {
							screenshotOptions.path = fileName;
						}

						const screenshot = (await page.screenshot(
							screenshotOptions,
						)) as Uint8Array;
						if (screenshot) {
							const binaryData = await this.helpers.prepareBinaryData(
								Buffer.from(screenshot),
								screenshotOptions.path,
								`image/${type}`,
							);
							returnItem = {
								binary: { [dataPropertyName]: binaryData },
								json: {
									headers,
									statusCode,
								},
							};
						}
					} else if (operation === "getPDF") {
						const dataPropertyName = this.getNodeParameter(
							"dataPropertyName",
							itemIndex,
						) as string;
						const pageRanges = this.getNodeParameter(
							"pageRanges",
							itemIndex,
						) as string;
						const displayHeaderFooter = this.getNodeParameter(
							"displayHeaderFooter",
							itemIndex,
						) as boolean;
						const omitBackground = this.getNodeParameter(
							"omitBackground",
							itemIndex,
						) as boolean;
						const printBackground = this.getNodeParameter(
							"printBackground",
							itemIndex,
						) as boolean;
						const landscape = this.getNodeParameter(
							"landscape",
							itemIndex,
						) as boolean;
						const preferCSSPageSize = this.getNodeParameter(
							"preferCSSPageSize",
							itemIndex,
						) as boolean;
						const scale = this.getNodeParameter("scale", itemIndex) as number;
						const margin = this.getNodeParameter(
							"margin",
							0,
							{},
						) as IDataObject;

						let headerTemplate;
						let footerTemplate;
						let height;
						let width;
						let format;

						if (displayHeaderFooter === true) {
							headerTemplate = this.getNodeParameter(
								"headerTemplate",
								itemIndex,
							) as string;
							footerTemplate = this.getNodeParameter(
								"footerTemplate",
								itemIndex,
							) as string;
						}

						if (preferCSSPageSize !== true) {
							height = this.getNodeParameter("height", itemIndex) as string;
							width = this.getNodeParameter("width", itemIndex) as string;

							if (!height || !width) {
								format = this.getNodeParameter("format", itemIndex) as string;
							}
						}

						const pdfOptions: any = {
							format,
							displayHeaderFooter,
							omitBackground,
							printBackground,
							landscape,
							headerTemplate,
							footerTemplate,
							preferCSSPageSize,
							scale,
							height,
							width,
							pageRanges,
							margin,
						};
						const fileName = options.fileName as string;
						if (fileName) {
							pdfOptions.path = fileName;
						}
						const pdf = (await page.pdf(pdfOptions)) as Uint8Array;
						if (pdf) {
							const binaryData = await this.helpers.prepareBinaryData(
								Buffer.from(pdf),
								pdfOptions.path,
								"application/pdf",
							);
							returnItem = {
								binary: { [dataPropertyName]: binaryData },
								json: {
									headers,
									statusCode,
								},
								pairedItem: {
									item: itemIndex,
								},
							};
						}
					}
				}
			}
			await page.close();

			if (returnItem) {
				returnData.push(returnItem);
			}
		}

		await browser.close();

		return this.prepareOutputData(returnData);
	}
}
