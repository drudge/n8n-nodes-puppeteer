import {
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Options to be displayed
 */
export const nodeDescription: INodeTypeDescription = {
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
                    description: 'Captures all or part of the page as an image',
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
                {
                    displayName: 'Page Caching',
                    name: 'pageCaching',
                    type: 'boolean',
                    required: false,
                    default: true,
                    description: 'Whether to enable page level caching. Defaults to true.',
                },
                {
                    displayName: 'Headless mode',
                    name: 'headless',
                    type: 'boolean',
                    required: false,
                    default: true,
                    description: 'Whether to run browser in headless mode. Defaults to true.',
                },
                {
                    displayName: 'Stealth mode',
                    name: 'stealth',
                    type: 'boolean',
                    required: false,
                    default: false,
                    description: 'When enabled, applies various techniques to make detection of headless Puppeteer harder.',
                }
            ]
        },
    ],
};