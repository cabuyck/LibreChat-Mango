import type { PromptInjector, InjectorContext, InjectorResult } from '../../types';
import { UAParser } from 'ua-parser-js';

/**
 * Parses a User-Agent string to extract device information.
 * Provides multiple levels of detail based on configuration.
 */
export const deviceTypeInjector: PromptInjector = {
  id: 'device_type',
  name: 'Device Type',
  description: 'Inject information about the user device',

  async execute(
    context: InjectorContext,
    config?: Record<string, unknown>,
  ): Promise<InjectorResult> {
    // Get format from config, default to 'device_os'
    const format = (config?.format as string) ?? 'device_os';

    // We need to access the request object to get User-Agent
    // This will be passed via a special property in the context
    const userAgent = (context as unknown as { userAgent?: string }).userAgent ?? '';

    if (!userAgent) {
      return { prefix: '' };
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    let prefix: string;

    switch (format) {
      case 'full':
        // Full user-agent string
        prefix = `User Agent: ${userAgent}`;
        break;

      case 'device_os':
        // Device and OS (e.g., "iPhone 13 running iOS 17.1")
        const device = getDeviceName(result);
        const os = getOSName(result);
        prefix = `Device: ${device}${os ? ` running ${os}` : ''}`;
        break;

      case 'device':
        // Device only (e.g., "iPhone 13")
        prefix = `Device: ${getDeviceName(result)}`;
        break;

      case 'simple':
        // Simple format (Desktop/Mobile/Unknown)
        const deviceType = getSimpleDeviceType(result);
        prefix = deviceType !== 'Unknown' ? `Device Type: ${deviceType}` : '';
        break;

      default:
        prefix = `Device: ${getDeviceName(result)}`;
    }

    return { prefix };
  },
};

/**
 * Extracts a human-readable device name from UA parser results.
 */
function getDeviceName(result: UAParser.IResult): string {
  const { device, browser, os } = result;

  // Try to get device model/vendor
  if (device.model) {
    const vendor = device.vendor ? `${device.vendor} ` : '';
    return `${vendor}${device.model}`;
  }

  // If no device model, try to infer from OS/browser
  if (os.name === 'iOS') {
    return 'iOS Device';
  }
  if (os.name === 'Android') {
    return 'Android Device';
  }
  if (os.name === 'Mac OS') {
    return 'Macintosh';
  }
  if (os.name === 'Windows') {
    return 'Windows PC';
  }

  // Fallback to browser type
  if (browser.name) {
    return `Web Browser (${browser.name})`;
  }

  return 'Unknown Device';
}

/**
 * Extracts a human-readable OS name from UA parser results.
 */
function getOSName(result: UAParser.IResult): string {
  const { os } = result;

  if (!os.name) {
    return '';
  }

  const version = os.version ? ` ${os.version}` : '';
  return `${os.name}${version}`;
}

/**
 * Determines the simple device type (Desktop/Mobile/Tablet/Unknown).
 */
function getSimpleDeviceType(result: UAParser.IResult): string {
  const { device } = result;

  if (device.type === 'mobile') {
    return 'Mobile';
  }
  if (device.type === 'tablet') {
    return 'Tablet';
  }
  if (device.type === 'smarttv') {
    return 'Smart TV';
  }
  if (device.type === 'wearable') {
    return 'Wearable';
  }
  if (!device.type) {
    // If no type specified, assume desktop
    return 'Desktop';
  }

  return 'Unknown';
}
