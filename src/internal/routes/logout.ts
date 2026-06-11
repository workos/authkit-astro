import options from 'virtual:@workos/authkit-astro/options';
import { createSignOutHandler } from '../../routes.js';

export const GET = createSignOutHandler({ afterSignOutUrl: options.afterSignOutUrl });
