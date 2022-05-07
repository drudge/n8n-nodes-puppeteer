import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import * as puppeteer from 'puppeteer';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
export class Puppeteer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Puppeteer',
		name: 'puppeteer',
		group: ['puppeteer'],
		version: 1,
		description: 'Request a webpage using Puppeteer',
		defaults: {
			name: 'Puppeteer',
			color: '#125580',
		},
		icon: 'file:puppeteer.svg',
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get Page Content',
						value: 'getPageContent',
						description: 'Gets the full HTML contents of the page',
					},
					{
						name: 'Get Screenshot',
						value: 'getScreenshot',
						description: 'Capture all or part of the page as an image',
					},
				],
				default: 'getPageContent',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				description: 'Name of the binary property in which  to store the image data.',
				displayOptions: {
					show: {
						operation: [
							'getScreenshot',
						],
					},
				},
			},
			{
				displayName: 'Type',
				name: 'imageType',
				type: 'options',
				options: [
					{
						name: 'JPEG',
						value: 'jpeg',
					},
					{
						name: 'PNG',
						value: 'png',
					},
					{
						name: 'WebP',
						value: 'webp',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'getScreenshot',
						],
					},
				},
				default: 'png',
				description: 'The image type to use. PNG, JPEG, and WebP are supported.',
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 100,
				displayOptions: {
					show: {
						operation: [
							'getScreenshot',
						],
						imageType: [
							'jpeg',
							'webp',
						],
					},
				},
				description: 'The quality of the image, between 0-100. Not applicable to png images.',
			},
			{
				displayName: 'Full Page',
				name: 'fullPage',
				type: 'boolean',
				required: true,
				default: false,
				displayOptions: {
					show: {
						operation: [
							'getScreenshot',
						],
					},
				},
				description: 'When true, takes a screenshot of the full scrollable page.',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The query parameter to send.',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the parameter.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the parameter.',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Emulate Device',
						name: 'device',
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getDevices',
						},
						required: true,
					},
					{
						displayName: 'Extra Headers',
						name: 'headers',
						placeholder: 'Add Header',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						description: 'The headers to send.',
						default: {},
						options: [
							{
								name: 'parameter',
								displayName: 'Header',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the header.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set for the header.',
									},
								],
							},
						],
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'File name to set in binary data.',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 30,
						description: 'Maximum navigation time in milliseconds. Pass 0 to disable timeout.',
					},
					{
						displayName: 'Wait Until',
						name: 'waitUntil',
						type: 'options',
						options: [
							{
								name: 'load',
								value: 'load',
								description: 'The load event is fired',
							},
							{
								name: 'DOMContentLoaded',
								value: 'DOMContentLoaded',
								description: 'The DOMContentLoaded event is fired',
							},
							{
								name: 'networkidle0',
								value: 'networkidle0',
								description: 'No more than 0 connections for at least 500 ms',
							},
							{
								name: 'networkidle2',
								value: 'networkidle2',
								description: 'No more than 2 connections for at least 500 ms',
							},
						],
						default: 'load',
						description: 'When to consider navigation succeeded.',
					},
				]
			},
		],
	};


	methods = {
		loadOptions: {
			async getDevices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const deviceNames = Object.keys(puppeteer.devices);
				const returnData: INodePropertyOptions[] = [
					// {
					// 	name: '- Default -',
					// 	value: '',
					// },
				];

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
		let items: INodeExecutionData[] = this.getInputData();
		let returnData: INodeExecutionData[] = [];

		const browser = await puppeteer.launch({ headless: true });
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let itemIndex: number = 0; itemIndex < items.length; itemIndex++) {
			const options = this.getNodeParameter('options', itemIndex,{}) as IDataObject;
			const urlString = this.getNodeParameter('url', itemIndex) as string;
			const { parameter: someHeaders = [] } = (options.headers || {}) as any;
			const { parameter: queryParameters = [] } = this.getNodeParameter('queryParameters', itemIndex) as any;
			const requestHeaders = someHeaders.reduce((acc: any, cur: any) => acc[cur.name] = cur.value, {});
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
			let returnItem;

			if (statusCode !== 200) {
				throw new Error(`Request failed with status code ${statusCode}`);
			}

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

			await page.close();
			
			if (returnItem) {
				returnData.push(returnItem);
			}
		}

		await browser.close();

		return this.prepareOutputData(returnData);
	}
}
