import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { makeResolverFromLegacyOptions, NodeVM } from '@n8n/vm2';

import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import {
	Browser,
	Device,
	KnownDevices as devices,
	Page,
	PaperFormat,
	PDFOptions,
	PuppeteerLifeCycleEvent,
	ScreenshotOptions,
} from 'puppeteer';

import { nodeDescription } from './Puppeteer.node.options';

const {
	NODE_FUNCTION_ALLOW_BUILTIN: builtIn,
	NODE_FUNCTION_ALLOW_EXTERNAL: external,
	CODE_ENABLE_STDOUT,
} = process.env;

const CONTAINER_LAUNCH_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--disable-gpu'
];

export const vmResolver = makeResolverFromLegacyOptions({
	external: external
		? {
				modules: external.split(','),
				transitive: false,
			}
		: false,
	builtin: builtIn?.split(',') ?? [],
});

interface HeaderObject {
	[key: string]: string;
}

interface QueryParameter {
	name: string;
	value: string;
}

const DEFAULT_USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';

async function handleOptions(
	this: IExecuteFunctions,
	itemIndex: number,
	items: INodeExecutionData[],
	browser: Browser,
	page: Page,
): Promise<void> {
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	const pageCaching = options.pageCaching !== false;
	const headers: HeaderObject = (options.headers || {}) as HeaderObject;

	const requestHeaders = Object.entries(headers).reduce(
		(acc: Record<string, string>, [key, value]) => {
			acc[key] = value;
			return acc;
		},
		{},
	);
	const device = options.device as string;

	await page.setCacheEnabled(pageCaching);

	if (device) {
		const emulatedDevice = devices[device as keyof typeof devices] as Device;
		if (emulatedDevice) {
			await page.emulate(emulatedDevice);
		}
	} else {
		const userAgent =
			requestHeaders['User-Agent'] ||
			requestHeaders['user-agent'] ||
			DEFAULT_USER_AGENT;
		await page.setUserAgent(userAgent);
	}

	await page.setExtraHTTPHeaders(requestHeaders);
}

async function runCustomScript(
	this: IExecuteFunctions,
	itemIndex: number,
	items: INodeExecutionData[],
	browser: Browser,
	page: Page,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const scriptCode = this.getNodeParameter('scriptCode', itemIndex) as string;
	const context = {
		$getNodeParameter: this.getNodeParameter,
		$getWorkflowStaticData: this.getWorkflowStaticData,
		helpers: {
			...this.helpers,
			httpRequestWithAuthentication: this.helpers.httpRequestWithAuthentication.bind(this),
			requestWithAuthenticationPaginated: this.helpers.requestWithAuthenticationPaginated.bind(this),
		},
		...this.getWorkflowDataProxy(itemIndex),
		$browser: browser,
		$page: page,
		$puppeteer: puppeteer,
	};
	const vm = new NodeVM({
		console: 'redirect',
		sandbox: context,
		require: vmResolver,
		wasm: false,
	});

	vm.on(
		'console.log',
		this.getMode() === 'manual'
			? this.sendMessageToUI
			: CODE_ENABLE_STDOUT === 'true'
				? (...args: unknown[]) =>
					console.log(`[Workflow "${this.getWorkflow().id}"][Node "${this.getNode().name}"]`, ...args)
				: () => {},
	);

	let scriptResult;
	try {
		scriptResult = await vm.run(
			`module.exports = async function() { ${scriptCode}\n}()`,
		);
		// console.log("Script Result:", scriptResult);
	} catch (error: unknown) {
		if (this.continueOnFail() !== true) {
			throw error as Error;
		} else {
			returnData.push({
				json: { error: (error as Error).message },
				pairedItem: {
					item: itemIndex,
				},
			});
			return returnData;
		}
	}

	if (!Array.isArray(scriptResult)) {
		if (this.continueOnFail() !== true) {
			throw new Error(
				'Custom script must return an array of items. Please ensure your script returns an array, e.g., return [{ key: value }].',
			);
		} else {
			returnData.push({
				json: {
					error:
						'Custom script must return an array of items. Please ensure your script returns an array, e.g., return [{ key: value }].',
				},
				pairedItem: {
					item: itemIndex,
				},
			});
		}
		return returnData;
	}

	returnData.push(...scriptResult);

	return this.helpers.normalizeItems(returnData);
}

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
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		const launchArguments = (options.launchArguments as IDataObject) || {};
		const operation = this.getNodeParameter('operation', 0) as string;
		let headless: 'shell' | boolean = options.headless !== false;
		const headlessShell = options.shell === true;
		const executablePath = options.executablePath as string;
		const browserWSEndpoint = options.browserWSEndpoint as string;
		const stealth = options.stealth === true;
		const launchArgs: IDataObject[] = launchArguments.args as IDataObject[];
		const args: string[] = [];
		const device = options.device as string;
		let batchSize = options.batchSize as number;

		if (!Number.isInteger(batchSize) || batchSize < 1) {
			batchSize = 1;
		}

		// More on launch arguments: https://www.chromium.org/developers/how-tos/run-chromium-with-flags/
		if (launchArgs && launchArgs.length > 0) {
			args.push(...launchArgs.map((arg: IDataObject) => arg.arg as string));
		}

		const addContainerArgs = options.addContainerArgs === true;
    if (addContainerArgs) {
			// Only add container args that weren't already specified by the user
			const missingContainerArgs = CONTAINER_LAUNCH_ARGS.filter(arg => !args.some(
				existingArg => existingArg === arg || existingArg.startsWith(`${arg}=`)
			));

			if (missingContainerArgs.length > 0) {
				console.log('Puppeteer node: Adding container optimizations:', missingContainerArgs);
				args.push(...missingContainerArgs);
			} else {
				console.log('Puppeteer node: Container optimizations already present in launch arguments');
			}
		}

		// More on proxying: https://www.chromium.org/developers/design-documents/network-settings
		if (options.proxyServer) {
			args.push(`--proxy-server=${options.proxyServer}`);
		}

		if (stealth) {
			puppeteer.use(pluginStealth());
		}

		if (headless && headlessShell) {
			headless = 'shell';
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
		const processItem = async (
			item: INodeExecutionData,
			itemIndex: number,
		): Promise<INodeExecutionData[]> => {
			let returnItem: INodeExecutionData[] = [];
			const page = await browser.newPage();

			await handleOptions.call(this, itemIndex, items, browser, page);

			if (operation === 'runCustomScript') {
				console.log(
					`Processing ${itemIndex + 1} of ${items.length}: [${operation}]${device ? ` [${device}] ` : ' '} Custom Script`,
				);
				returnItem = await runCustomScript.call(
					this,
					itemIndex,
					items,
					browser,
					page,
				);
			} else {
				const urlString = this.getNodeParameter('url', itemIndex) as string;
				const queryParametersOptions = this.getNodeParameter(
					'queryParameters',
					itemIndex,
					{},
				) as IDataObject;

				const queryParameters =
					(queryParametersOptions.parameters as QueryParameter[]) || [];

				const url = new URL(urlString);
				for (const queryParameter of queryParameters) {
					url.searchParams.append(queryParameter.name, queryParameter.value);
				}

				console.log(
					`Processing ${itemIndex + 1} of ${items.length}: [${operation}]${device ? ` [${device}] ` : ' '}${url}`,
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
						returnItem = [
							{
								json: {
									headers,
									statusCode,
								},
								pairedItem: {
									item: itemIndex,
								},
							},
						];
						if (operation === 'getPageContent') {
							returnItem[0].json.body = await page.content();
						}
					} else {
						throw new Error(`Request failed with status code ${statusCode}`);
					}
				} else {
					if (operation === 'getPageContent') {
						const body = await page.content();
						returnItem = [
							{
								json: {
									body,
									headers,
									statusCode,
								},
								pairedItem: {
									item: itemIndex,
								},
							},
						];
					} else if (operation === 'getScreenshot') {
						const dataPropertyName = this.getNodeParameter(
							'dataPropertyName',
							itemIndex,
						) as string;
						const fileName = options.fileName as string;
						const type = this.getNodeParameter(
							'imageType',
							itemIndex,
						) as ScreenshotOptions['type'];
						const fullPage = this.getNodeParameter(
							'fullPage',
							itemIndex,
						) as boolean;
						const screenshotOptions: ScreenshotOptions = {
							type,
							fullPage,
						};

						if (type !== 'png') {
							const quality = this.getNodeParameter(
								'quality',
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
							returnItem = [
								{
									binary: { [dataPropertyName]: binaryData },
									json: {
										headers,
										statusCode,
									},
									pairedItem: {
										item: itemIndex,
									},
								},
							];
						}
					} else if (operation === 'getPDF') {
						const dataPropertyName = this.getNodeParameter(
							'dataPropertyName',
							itemIndex,
						) as string;
						const pageRanges = this.getNodeParameter(
							'pageRanges',
							itemIndex,
						) as string;
						const displayHeaderFooter = this.getNodeParameter(
							'displayHeaderFooter',
							itemIndex,
						) as boolean;
						const omitBackground = this.getNodeParameter(
							'omitBackground',
							itemIndex,
						) as boolean;
						const printBackground = this.getNodeParameter(
							'printBackground',
							itemIndex,
						) as boolean;
						const landscape = this.getNodeParameter(
							'landscape',
							itemIndex,
						) as boolean;
						const preferCSSPageSize = this.getNodeParameter(
							'preferCSSPageSize',
							itemIndex,
						) as boolean;
						const scale = this.getNodeParameter('scale', itemIndex) as number;
						const margin = this.getNodeParameter(
							'margin',
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
								'headerTemplate',
								itemIndex,
							) as string;
							footerTemplate = this.getNodeParameter(
								'footerTemplate',
								itemIndex,
							) as string;
						}

						if (preferCSSPageSize !== true) {
							height = this.getNodeParameter('height', itemIndex) as string;
							width = this.getNodeParameter('width', itemIndex) as string;

							if (!height || !width) {
								format = this.getNodeParameter(
									'format',
									itemIndex,
								) as PaperFormat;
							}
						}

						const pdfOptions: PDFOptions = {
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
								'application/pdf',
							);
							returnItem = [
								{
									binary: { [dataPropertyName]: binaryData },
									json: {
										headers,
										statusCode,
									},
									pairedItem: {
										item: itemIndex,
									},
								},
							];
						}
					}
				}
			}
			await page.close();

			return returnItem;
		};

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const results = await Promise.all(
				batch.map((item, idx) => processItem(item, i + idx)),
			);
			if (results && results.length) {
				returnData.push(...results.flat());
			}
		}

		await browser.close();

		return this.prepareOutputData(returnData);
	}
}
