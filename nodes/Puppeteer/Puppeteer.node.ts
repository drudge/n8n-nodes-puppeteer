import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import puppeteer from 'puppeteer';

import {
	nodeDescription,
} from './Puppeteer.node.options';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
export class Puppeteer implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	methods = {
		loadOptions: {
			async getDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const deviceNames = Object.keys(puppeteer.devices);
				const returnData: INodePropertyOptions[] = [];

				for (const name of deviceNames) {
					const device = puppeteer.devices[name];
					returnData.push({
						name,
						value: name,
						description: `${device.viewport.width} x ${device.viewport.height} @ ${device.viewport.deviceScaleFactor}x`,
					});
				}

				return returnData;
			}
		}
	};
	
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: INodeExecutionData[] = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		const operation = this.getNodeParameter('operation', 0) as string;
		const headless = options.headless !== false;
		const browser = await puppeteer.launch({ headless });

		for (let itemIndex: number = 0; itemIndex < items.length; itemIndex++) {
			const urlString = this.getNodeParameter('url', itemIndex) as string;
			const { parameter: someHeaders = [] } = (options.headers || {}) as any;
			const { parameter: queryParameters = [] } = this.getNodeParameter('queryParameters', itemIndex) as any;
			const requestHeaders = someHeaders.reduce((acc: any, cur: any) => {
				acc[cur.name] = cur.value;
				return acc;
			}, {});
			const device = options.device as string;

			const url = new URL(urlString);
			const page = await browser.newPage();

			if (device) {
				const emulatedDevice = puppeteer.devices[device];
				if (emulatedDevice) {
					await page.emulate(emulatedDevice);
				}
			} else {
				const userAgent = requestHeaders['User-Agent'] || requestHeaders['user-agent'] || DEFAULT_USER_AGENT;
				page.setUserAgent(userAgent)
			}

			await page.setExtraHTTPHeaders(requestHeaders);

			for (const queryParameter of queryParameters) {
				url.searchParams.append(queryParameter.name, queryParameter.value);
			}

			console.log(`Processing ${itemIndex+1} of ${items.length}: [${operation}]${device ? ` [${device}] ` : ' ' }${url}`);
			
			const waitUntil = options.waitUntil as puppeteer.PuppeteerLifeCycleEvent;
			const timeout = options.timeout as number;

			const response = await page.goto(url.toString(), { waitUntil, timeout });
			const headers = await response.headers();
			const statusCode = response.status();
			let returnItem: any;


			if (statusCode !== 200) {
				if (this.continueOnFail() !== true) {
					returnItem = {
						json: {
							headers,
							statusCode,
						}
					}
					if (operation === 'getPageContent') {
						returnItem.json.body = await page.content();
					}
				} else {
					throw new Error(`Request failed with status code ${statusCode}`);
				}
			} else {
				if (operation === 'getPageContent') {
					const body = await page.content();
					returnItem = {
						json: {
							body,
							headers,
							statusCode,
						}
					};
				} else if (operation === 'getScreenshot') {
					const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
					const fileName = options.fileName as string;
					const type = this.getNodeParameter('imageType', itemIndex) as puppeteer.ScreenshotOptions['type'];
					const fullPage = this.getNodeParameter('fullPage', itemIndex) as boolean;
					const screenshotOptions: puppeteer.ScreenshotOptions = {
						type,
						fullPage,
					};

					if (type !== 'png') {
						const quality = this.getNodeParameter('quality', itemIndex) as number;
						screenshotOptions.quality = quality;
					}

					if (fileName) {
						screenshotOptions.path = fileName;
					}

					const screenshot = await page.screenshot(screenshotOptions) as Buffer;
					if (screenshot) {
						const binaryData = await this.helpers.prepareBinaryData(screenshot, screenshotOptions.path, `image/${type}`);
						returnItem = {
							binary: { [dataPropertyName]:binaryData },
							json: {
								headers,
								statusCode,
							}
						};
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
