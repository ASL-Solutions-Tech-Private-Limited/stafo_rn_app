import {sha512} from 'js-sha512';

/** PayU's hash: SHA-512 of the string it gives plus the merchant salt, in hex (as the native app did). */
export const payuHashLocal = (hashString: string, salt: string) => sha512(`${hashString}${salt}`.trim());
